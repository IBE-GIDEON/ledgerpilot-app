package expo.modules.lanceralerts

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput

/**
 * The "What was this for?" notification. It pops up, has a reply box, and stays put until answered:
 * there is no dismiss action, and Android keeps it pinned where the system allows.
 */
object PromptNotifier {
  const val CHANNEL_ID = "lancer-bank-alerts"
  const val NOTIFICATION_ID = 7001
  const val KEY_ANSWER = "answer"
  const val EXTRA_ALERT_ID = "alertId"

  fun show(context: Context, id: String, sender: String, text: String) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannel(context)

    val direction = MoneyText.direction(text)
    val amount = MoneyText.amount(text) ?: "Money"
    val title = when (direction) {
      true -> "$amount came in · $sender"
      false -> "$amount went out · $sender"
      null -> "$amount moved · $sender"
    }
    val question = if (direction == true) "Who sent this, and what for?" else "What was this for?"

    val replyIntent = Intent(context, ReplyReceiver::class.java)
      .setAction("expo.modules.lanceralerts.REPLY")
      .putExtra(EXTRA_ALERT_ID, id)
    val replyFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    val replyPending = PendingIntent.getBroadcast(context, id.hashCode(), replyIntent, replyFlags)
    val remoteInput = RemoteInput.Builder(KEY_ANSWER).setLabel(question).build()
    val reply = NotificationCompat.Action.Builder(0, "Answer", replyPending)
      .addRemoteInput(remoteInput)
      .setAllowGeneratedReplies(false)
      .build()

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(question)
      .setStyle(NotificationCompat.BigTextStyle().bigText(question))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .setContentIntent(openAppIntent(context, id))
      .addAction(reply)
      .build()

    try {
      manager.notify(id, NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Notification permission was withdrawn; the app still asks when it next opens.
    }
  }

  /** Swaps the prompt for a short "Saved" note that clears itself. */
  fun showSaved(context: Context, id: String, answer: String) {
    val manager = NotificationManagerCompat.from(context)
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Saved")
      .setContentText(answer)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOnlyAlertOnce(true)
      .setAutoCancel(true)
      .setTimeoutAfter(4000)
      .build()
    try {
      manager.notify(id, NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
    }
  }

  fun cancel(context: Context, id: String) {
    NotificationManagerCompat.from(context).cancel(id, NOTIFICATION_ID)
  }

  private fun openAppIntent(context: Context, id: String): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    return PendingIntent.getActivity(
      context,
      id.hashCode() + 1,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Bank alerts", NotificationManager.IMPORTANCE_HIGH)
    channel.description = "Asks what money in or out was for"
    manager.createNotificationChannel(channel)
  }
}
