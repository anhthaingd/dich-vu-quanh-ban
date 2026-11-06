package vn.dichvuquanhban.calls

import android.app.*
import android.content.*
import android.os.*
import androidx.core.content.ContextCompat
import org.json.JSONObject

/** Manual emulator evidence: mock HTTP server on host 4317, no credentials or provider calls. */
class CallInstrumentation: Instrumentation() {
  override fun onCreate(arguments: Bundle?){super.onCreate(arguments);start()}
  override fun onStart(){
    val c=targetContext;val preferences=CallRuntime.prefs(c);val saved=preferences.all.toMap()
    val id="00000000-0000-4000-8000-000000000024";val owner="00000000-0000-4000-8000-000000000025"
    var resultCode=Activity.RESULT_OK;var result=""
    try {
      check(CallRuntime.session==null){"An existing call must not be interrupted"}
      runOnMainSync {preferences.edit().putString("owner",owner).putString("locale","vi").apply();CallRuntime.register(c)}
      val manager=c.getSystemService(NotificationManager::class.java)
      fun notice()=manager.activeNotifications.any{it.id==CallRuntime.NOTICE}
      fun payload(who:String=owner,until:Long=System.currentTimeMillis()+30000)=JSONObject().put("android_call_v",1).put("call_id",id).put("recipient_id",who).put("ring_until",until)
      runOnMainSync{CallRuntime.incoming(c,payload("other"));CallRuntime.incoming(c,payload(until=System.currentTimeMillis()-1))}
      Thread.sleep(300);check(!notice()){"Wrong-owner/expired call was shown"}
      runOnMainSync{CallRuntime.incoming(c,payload())}
      Thread.sleep(2000);check(notice()){"Valid incoming call not shown"}
      runOnMainSync {c.startActivity(CallRuntime.intent(c,id,owner,"open",System.currentTimeMillis()+25000))}
      Thread.sleep(1000)
      sendStatus(0,Bundle().apply{putString("stream","CAPTURE_INCOMING\n")});Thread.sleep(2000)
      runOnMainSync{CallRuntime.incoming(c,JSONObject().put("android_call_v",1).put("call_action","dismiss").put("call_id",id).put("recipient_id",owner))}
      Thread.sleep(500);check(!notice()){"Dismiss did not remove incoming call"}
      runOnMainSync{CallRuntime.incoming(c,payload())};Thread.sleep(300);check(!notice()){"Late incoming resurrected a dismissed call"}
      // A visible Activity and granted RECORD_AUDIO satisfy the OS microphone start restriction.
      runOnMainSync {
        preferences.edit().remove("dismissed").apply();c.startActivity(CallRuntime.intent(c,id,owner,"open",System.currentTimeMillis()+60000))
      }
      Thread.sleep(1500)
      runOnMainSync {
        CallRuntime.session=CallRuntime.Session(id,owner,"http://10.0.2.2:4317/v1","DEMO_NATIVE_TEST_ONLY")
        ContextCompat.startForegroundService(c,Intent(c,CallAudioService::class.java))
      }
      Thread.sleep(1500);check(CallRuntime.runningId==id){"Foreground service failed to remain active (fixture owner valid: ${CallRuntime.owner(c)==owner})"}
      sendStatus(0,Bundle().apply{putString("stream","GO_HOME\n")})
      Thread.sleep(11000);check(CallRuntime.runningId==id){"Call did not survive Home"}
      check(notice()){"Ongoing notification missing"}
      runOnMainSync{CallAudioService.end(c,id)};Thread.sleep(1000)
      check(CallRuntime.session==null&&CallRuntime.runningId==null){"End did not stop service"}
      runOnMainSync {c.startActivity(CallRuntime.intent(c,id,owner,"open",System.currentTimeMillis()+60000))}
      Thread.sleep(1500)
      runOnMainSync {CallRuntime.session=CallRuntime.Session(id,owner,"http://10.0.2.2:4317/v1","EXPIRED_DEMO_TOKEN");ContextCompat.startForegroundService(c,Intent(c,CallAudioService::class.java))}
      Thread.sleep(22000);check(CallRuntime.session==null && CallRuntime.runningId==null){"Unauthorized native heartbeat kept the call alive"}
      result="PASS: owner/expiry, incoming UI, dismiss/reorder, native heartbeat after Home, stop and expired-session fence. Mock HTTP only; no FCM/media proof.\n"
    }catch(e:Throwable){resultCode=Activity.RESULT_CANCELED;result="FAIL: ${e.message}\n"}
    finally {
      runOnMainSync{CallRuntime.clear(c);preferences.edit().clear().apply();val edit=preferences.edit();for((k,v)in saved)when(v){is String->edit.putString(k,v);is Long->edit.putLong(k,v);is Boolean->edit.putBoolean(k,v);is Int->edit.putInt(k,v)};edit.apply()}
    }
    finish(resultCode,Bundle().apply{putString("stream",result)})
  }
}
