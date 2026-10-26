package expo.modules.lanceralerts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput

/** Takes the answer typed into the notification. An empty answer leaves the prompt in place. */
class ReplyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(PromptNotifier.EXTRA_ALERT_ID) ?: return
    val answer = RemoteInput.getResultsFromIntent(intent)
      ?.getCharSequence(PromptNotifier.KEY_ANSWER)
      ?.toString()
      ?.trim()
      .orEmpty()
    if (answer.isEmpty()) return

    AlertStore.addAnswer(context, id, answer)
    PromptNotifier.showSaved(context, id, answer)
  }
}
