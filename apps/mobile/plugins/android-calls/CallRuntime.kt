package vn.dichvuquanhban.calls

import android.app.*
import android.content.*
import android.net.Uri
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.*
import android.telecom.*
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import org.json.JSONObject
import java.util.UUID

/** No bearer token or caller name is persisted or placed in a notification/Intent. */
object CallRuntime {
  const val CHANNEL = "dvqb-calls-v1"
  const val NOTICE = 4201
  var pendingAction: JSONObject? = null
  var connection: Connection? = null
  var connectionId: String? = null
  @Volatile var session: Session? = null
  @Volatile var runningId: String? = null
  data class Session(val id: String, val owner: String, val base: String, val token: String)
  fun prefs(c: Context) = c.getSharedPreferences("dvqb-call-ui", Context.MODE_PRIVATE)
  fun owner(c: Context) = prefs(c).getString("owner", null)
  fun word(c: Context, vi: String, en: String, ja: String): String = when(prefs(c).getString("locale", "vi")) {"en" -> en; "ja" -> ja; else -> vi}
  fun validId(id: String): Boolean = try { UUID.fromString(id).toString() == id.lowercase() } catch (_: Exception) { false }
  fun account(c: Context) = PhoneAccountHandle(ComponentName(c, CallConnectionService::class.java), "dvqb-audio")
  fun register(c: Context) {
    c.getSystemService(TelecomManager::class.java).registerPhoneAccount(PhoneAccount.builder(account(c), "Dịch vụ quanh bạn").setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED).setSupportedUriSchemes(listOf(PhoneAccount.SCHEME_SIP)).build())
    val channel = NotificationChannel(CHANNEL, word(c,"Cuộc gọi","Calls","通話"), NotificationManager.IMPORTANCE_HIGH)
    channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build())
    channel.enableVibration(true)
    channel.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    c.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }
  fun incoming(c: Context, data: JSONObject) {
    val id=data.optString("call_id"); val recipient=data.optString("recipient_id"); val until=data.optLong("ring_until")
    if(data.optString("call_action")=="dismiss" && validId(id) && recipient==owner(c)) { prefs(c).edit().putString("dismissed",id).putLong("dismissedAt",System.currentTimeMillis()).apply();if(session?.id!=id)clear(c,id);return }
    if(data.optInt("android_call_v")!=1 || !validId(id) || recipient!=owner(c) || until<=System.currentTimeMillis() || until>System.currentTimeMillis()+35000) return
    if(session!=null || connectionId==id || prefs(c).getString("dismissed",null)==id && System.currentTimeMillis()-prefs(c).getLong("dismissedAt",0)<60000) return
    register(c)
    val extras=Bundle().apply {putString("id",id);putString("owner",recipient);putLong("until",until)}
    try { c.getSystemService(TelecomManager::class.java).addNewIncomingCall(account(c), extras) }
    catch (_: Exception) { showIncoming(c,id,recipient,until) }
  }
  fun intent(c: Context, id: String, owner: String, action: String, until: Long=0): Intent = Intent(c,CallActivity::class.java).apply {
    this.action="dvqb.call.$action.$id"; putExtra("id",id);putExtra("owner",owner);putExtra("action",action);putExtra("until",until)
    flags=Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
  }
  fun pending(c: Context,id: String,owner: String,action: String,until: Long=0): PendingIntent = PendingIntent.getActivity(c,(id+action).hashCode(),intent(c,id,owner,action,until),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  fun showIncoming(c: Context,id: String,owner: String,until: Long) {
    if(owner!=owner(c)||until<=System.currentTimeMillis()) return
    val person=Person.Builder().setName(word(c,"Người liên hệ","Contact","連絡先")).setImportant(true).build()
    val n=NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.sym_call_incoming)
      .setContentTitle(word(c,"Cuộc gọi đến","Incoming call","着信"))
      .setCategory(NotificationCompat.CATEGORY_CALL).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setOngoing(true).setTimeoutAfter(until-System.currentTimeMillis()).setPriority(NotificationCompat.PRIORITY_MAX)
      .setContentIntent(pending(c,id,owner,"open",until)).setFullScreenIntent(pending(c,id,owner,"open",until),true)
      .setStyle(NotificationCompat.CallStyle.forIncomingCall(person,pending(c,id,owner,"decline",until),pending(c,id,owner,"accept",until)))
      .build()
    n.flags=n.flags or Notification.FLAG_INSISTENT
    c.getSystemService(NotificationManager::class.java).notify(NOTICE,n)
    Handler(Looper.getMainLooper()).postDelayed({ if(connectionId==id && session?.id!=id) clear(c,id) },(until-System.currentTimeMillis()).coerceAtLeast(1))
  }
  fun ongoing(c: Context,s: Session): Notification = NotificationCompat.Builder(c,CHANNEL)
    .setSmallIcon(android.R.drawable.sym_call_outgoing).setContentTitle(word(c,"Đang gọi","Call in progress","通話中"))
    .setCategory(NotificationCompat.CATEGORY_CALL).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
    .setContentIntent(pending(c,s.id,s.owner,"open"))
    .setStyle(NotificationCompat.CallStyle.forOngoingCall(Person.Builder().setName(word(c,"Người liên hệ","Contact","連絡先")).build(),PendingIntent.getBroadcast(c,0,Intent(c,CallEndReceiver::class.java).putExtra("id",s.id),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))).build()
  fun clear(c: Context,id: String?=null) {
    if(id==null || connectionId==id) {connection?.setDisconnected(DisconnectCause(DisconnectCause.LOCAL));connection?.destroy();connection=null;connectionId=null}
    if(id==null || session?.id==id) {session=null; c.stopService(Intent(c,CallAudioService::class.java))}
    if(session==null && connectionId==null)c.getSystemService(NotificationManager::class.java).cancel(NOTICE)
  }
  fun launch(c: Context,id: String,owner: String,action: String) {
    if(owner!=owner(c))return
    val launch=c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return
    launch.flags=Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    pendingAction=JSONObject().put("id",id).put("owner",owner).put("action",action)
    c.startActivity(launch)
  }
}

class CallConnectionService: ConnectionService() {
  private fun create(id: String, owner: String, until: Long, incoming: Boolean): Connection {
    if(!CallRuntime.validId(id)||owner!=CallRuntime.owner(this)||(incoming&&until<=System.currentTimeMillis()))return Connection.createFailedConnection(DisconnectCause(DisconnectCause.CANCELED))
    val c=object: Connection() {
      override fun onShowIncomingCallUi(){CallRuntime.showIncoming(this@CallConnectionService,id,owner,until)}
      override fun onAnswer(){CallRuntime.launch(this@CallConnectionService,id,owner,"accept")}
      override fun onReject(){CallRuntime.launch(this@CallConnectionService,id,owner,"decline")}
      override fun onDisconnect(){if(CallRuntime.session?.id==id)CallAudioService.end(this@CallConnectionService,id) else CallRuntime.launch(this@CallConnectionService,id,owner,"end")}
      override fun onAbort(){onDisconnect()}
    }
    c.connectionProperties=Connection.PROPERTY_SELF_MANAGED
    c.setAudioModeIsVoip(true)
    c.setCallerDisplayName("Dịch vụ quanh bạn",TelecomManager.PRESENTATION_ALLOWED)
    if(incoming)c.setRinging() else c.setActive()
    CallRuntime.connection=c;CallRuntime.connectionId=id
    return c
  }
  override fun onCreateIncomingConnection(a: PhoneAccountHandle?,r: ConnectionRequest): Connection = create(r.extras.getString("id")?:"",r.extras.getString("owner")?:"",r.extras.getLong("until"),true)
  override fun onCreateOutgoingConnection(a: PhoneAccountHandle?,r: ConnectionRequest): Connection {
    val s=CallRuntime.session ?: return Connection.createFailedConnection(DisconnectCause(DisconnectCause.CANCELED))
    return create(s.id,s.owner,0,false)
  }
  override fun onCreateIncomingConnectionFailed(a: PhoneAccountHandle?,r: ConnectionRequest) { /* Telecom rejected an overlapping call; do not bypass it. */ }
}

class CallFirebaseService: expo.modules.notifications.service.ExpoFirebaseMessagingService() {
  override fun onMessageReceived(message: com.google.firebase.messaging.RemoteMessage) {
    val body=try {JSONObject(message.data["body"]?:"{}")} catch (_: Exception) {JSONObject()}
    if(body.optInt("android_call_v")==1) {try{CallRuntime.incoming(this,body)}catch(_:Exception){/* No secrets in logs. */};return}
    super.onMessageReceived(message)
  }
}

class CallEndReceiver: BroadcastReceiver() {
  override fun onReceive(c: Context,i: Intent) {i.getStringExtra("id")?.let {CallAudioService.end(c,it)}}
}
