package vn.dichvuquanhban.calls

import android.app.Service
import android.content.*
import android.content.pm.ServiceInfo
import android.os.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/** A native heartbeat retains the existing authenticated endpoint, family checks and 45s server fence. */
class CallAudioService: Service() {
  private val executor=Executors.newSingleThreadScheduledExecutor()
  private var wake: PowerManager.WakeLock?=null
  private var id: String?=null
  private var lastOk=SystemClock.elapsedRealtime()
  private var started=false
  override fun onBind(i: Intent?) = null
  override fun onStartCommand(i: Intent?,flags: Int,startId: Int): Int {
    val s=CallRuntime.session ?: run {stopSelf();return START_NOT_STICKY}
    if(started && id!=s.id){stopSelf();return START_NOT_STICKY}
    id=s.id
    try {
      if(Build.VERSION.SDK_INT>=30)startForeground(CallRuntime.NOTICE,CallRuntime.ongoing(this,s),ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL)
      else startForeground(CallRuntime.NOTICE,CallRuntime.ongoing(this,s))
    } catch(_:Exception){CallRuntime.session=null;stopSelf();return START_NOT_STICKY}
    if(!started){
      started=true;CallRuntime.runningId=s.id
      wake=getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"dvqb:call").apply{setReferenceCounted(false);acquire(600000)}
      executor.scheduleWithFixedDelay({ heartbeat() },0,5,TimeUnit.SECONDS)
    }
    return START_NOT_STICKY
  }
  private fun heartbeat(){
    val s=CallRuntime.session
    if(s==null||s.id!=id){stopSelf();return}
    try {
      val result=request(s,"heartbeat",JSONObject())
      if(result.optString("state")!="accepted"){stopSelf();return}
      lastOk=SystemClock.elapsedRealtime()
      wake?.acquire(600000)
    }catch(_:Exception){if(SystemClock.elapsedRealtime()-lastOk>15000)stopSelf()}
  }
  override fun onTaskRemoved(rootIntent: Intent?){id?.let{end(this,it)};stopSelf()}
  override fun onDestroy(){
    executor.shutdownNow();if(wake?.isHeld==true)wake?.release();wake=null
    CallRuntime.runningId=null
    val old=id; if(old!=null && CallRuntime.session?.id==old)CallRuntime.clear(this,old)
    stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()
  }
  companion object {
    private fun request(s: CallRuntime.Session,path: String,body: JSONObject): JSONObject {
      val conn=URL("${s.base}/calls/${s.id}/$path").openConnection() as HttpURLConnection
      try {
        conn.instanceFollowRedirects=false;conn.requestMethod="POST";conn.connectTimeout=5000;conn.readTimeout=5000;conn.doOutput=true
        conn.setRequestProperty("Authorization","Bearer ${s.token}");conn.setRequestProperty("Content-Type","application/json")
        if(path=="actions")conn.setRequestProperty("Idempotency-Key",UUID.randomUUID().toString())
        conn.outputStream.use{it.write(body.toString().toByteArray())}
        if(conn.responseCode !in 200..299)throw IllegalStateException("CALL_REQUEST_FAILED")
        return JSONObject(conn.inputStream.bufferedReader().use{it.readText()})
      }finally{conn.disconnect()}
    }
    fun end(c: Context,id: String){
      val s=CallRuntime.session?.takeIf{it.id==id} ?: return
      // Fence native heartbeats immediately. Server cleanup still runs if this last request fails.
      CallRuntime.clear(c,id)
      Thread({try {val state=request(s,"heartbeat",JSONObject());if(state.optString("state")=="accepted")request(s,"actions",JSONObject().put("action","end").put("expected_version",state.getInt("version")))}catch(_:Exception){}},"dvqb-call-end").start()
    }
  }
}
