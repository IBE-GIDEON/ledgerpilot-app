package expo.modules.lanceralerts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput

/**
 * Takes the answer typed into the notification. An empty answer, or swiping the question away,
 * just puts the question back.
 */
class ReplyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(PromptNotifier.EXTRA_ALERT_ID) ?: return
    if (AlertStore.isClosed(context, id)) return

    val answer = RemoteInput.getResultsFromIntent(intent)
      ?.getCharSequence(PromptNotifier.KEY_ANSWER)
      ?.toString()
      ?.trim()
      .orEmpty()
    if (intent.action == PromptNotifier.ACTION_REPLY && answer.isNotEmpty()) {
      AlertStore.addAnswer(context, id, answer)
      PromptNotifier.showSaved(context, id, answer)
      return
    }

    PromptNotifier.show(
      context,
      id,
      intent.getStringExtra(PromptNotifier.EXTRA_SENDER).orEmpty(),
      intent.getStringExtra(PromptNotifier.EXTRA_TEXT).orEmpty(),
      intent.getLongExtra(PromptNotifier.EXTRA_POSTED_AT, System.currentTimeMillis())
    )
  }
}
