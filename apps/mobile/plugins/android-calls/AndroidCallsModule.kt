package vn.dichvuquanhban.calls

import android.content.*
import android.net.Uri
import android.os.Bundle
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class AndroidCallsPackage: ReactPackage {
  override fun createNativeModules(c: ReactApplicationContext): List<NativeModule> = listOf(AndroidCallsModule(c))
  override fun createViewManagers(c: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
class AndroidCallsModule(private val context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
  override fun getName()="DVQBAndroidCalls"
  @ReactMethod fun configure(owner: String?, locale: String,promise: Promise){
    try {
      if(CallRuntime.owner(context)!=owner){CallRuntime.pendingAction=null;CallRuntime.clear(context)}
      CallRuntime.prefs(context).edit().putString("owner",owner).putString("locale",locale).apply()
      CallRuntime.register(context);promise.resolve(null)
    }catch(_:Exception){promise.reject("CALL_SETUP","Android call setup failed")}
  }
  @ReactMethod fun consumeAction(promise: Promise){
    // Never read action extras from the exported launcher Activity. Only our non-exported
    // Activity / Telecom callback can enqueue an action in this process.
    val action=CallRuntime.pendingAction;CallRuntime.pendingAction=null
    if(action==null){promise.resolve(null);return}
    promise.resolve(Arguments.createMap().apply{putString("id",action.getString("id"));putString("owner",action.getString("owner"));putString("action",action.getString("action"))})
  }
  @ReactMethod fun start(id: String,owner: String,base: String,token: String,promise: Promise){
    try {
      val uri=Uri.parse(base)
      val debug=(context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0
      if(!CallRuntime.validId(id)||owner!=CallRuntime.owner(context)||token.isBlank()||uri.userInfo!=null||uri.query!=null||uri.fragment!=null||!(uri.scheme=="https" || debug&&uri.scheme=="http"&&uri.host in listOf("10.0.2.2","127.0.0.1","localhost")))throw IllegalArgumentException()
      CallRuntime.register(context)
      CallRuntime.session=CallRuntime.Session(id,owner,base.trimEnd('/'),token)
      ContextCompat.startForegroundService(context,Intent(context,CallAudioService::class.java))
      if(CallRuntime.connectionId==id)CallRuntime.connection?.setActive()
      else {
        val extras=Bundle().apply{putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE,CallRuntime.account(context))}
        context.getSystemService(TelecomManager::class.java).placeCall(Uri.parse("sip:$id@dvqb.invalid"),extras)
      }
      promise.resolve(null)
    }catch(_:Exception){CallRuntime.clear(context,id);promise.reject("CALL_START","Cannot start Android call service")}
  }
  @ReactMethod fun updateToken(id: String,token: String,promise: Promise){
    val s=CallRuntime.session
    if(s?.id==id)CallRuntime.session=s.copy(token=token)
    promise.resolve(null)
  }
  @ReactMethod fun running(id: String,promise: Promise){promise.resolve(CallRuntime.runningId==id && CallRuntime.session?.id==id)}
  @ReactMethod fun stop(id: String,promise: Promise){CallRuntime.clear(context,id);promise.resolve(null)}
}
