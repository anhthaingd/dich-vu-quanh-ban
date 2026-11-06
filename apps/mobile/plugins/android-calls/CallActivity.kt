package vn.dichvuquanhban.calls

import android.app.Activity
import android.os.*
import android.widget.*
import android.graphics.Color

/** Lock-screen UI contains no private caller/job information and never grants media access. */
class CallActivity: Activity() {
  private val handler=Handler(Looper.getMainLooper())
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val id=intent.getStringExtra("id")?:"";val owner=intent.getStringExtra("owner")?:"";val action=intent.getStringExtra("action")?:"open";val until=intent.getLongExtra("until",0)
    if(!CallRuntime.validId(id)||owner!=CallRuntime.owner(this)||(until>0&&until<=System.currentTimeMillis())) {finish();return}
    if(action!="open"||until==0L){CallRuntime.launch(this,id,owner,action);finish();return}
    setShowWhenLocked(true);setTurnScreenOn(true)
    val panel=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;gravity=android.view.Gravity.CENTER;setPadding(48,48,48,48);setBackgroundColor(Color.rgb(18,48,40))}
    panel.addView(TextView(this).apply{text=CallRuntime.word(this@CallActivity,"Cuộc gọi đến","Incoming call","着信");textSize=28f;setTextColor(Color.WHITE)})
    panel.addView(TextView(this).apply{text="Dịch vụ quanh bạn";textSize=18f;setTextColor(Color.WHITE);setPadding(0,24,0,64)})
    for((verb,label) in listOf("accept" to CallRuntime.word(this,"Trả lời","Answer","応答"),"decline" to CallRuntime.word(this,"Từ chối","Decline","拒否")))panel.addView(Button(this).apply{text=label;setOnClickListener{CallRuntime.launch(this@CallActivity,id,owner,verb);finish()}})
    setContentView(panel)
    val check=object: Runnable {override fun run(){
      if(System.currentTimeMillis()>=until || owner!=CallRuntime.owner(this@CallActivity) || CallRuntime.prefs(this@CallActivity).getString("dismissed",null)==id)finish()
      else handler.postDelayed(this,500)
    }}
    handler.postDelayed(check,500)
  }
  override fun onDestroy(){handler.removeCallbacksAndMessages(null);super.onDestroy()}
}
