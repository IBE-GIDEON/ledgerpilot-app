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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The "What was this for?" notification. It pops up with who and when, has a reply box, and stays
 * until answered: it's pinned where Android allows, and it comes back if swiped away.
 */
object PromptNotifier {
  const val CHANNEL_ID = "lancer-bank-alerts"
  const val NOTIFICATION_ID = 7001
  const val KEY_ANSWER = "answer"
  const val EXTRA_ALERT_ID = "alertId"

  const val EXTRA_SENDER = "sender"
  const val EXTRA_TEXT = "text"
  const val EXTRA_POSTED_AT = "postedAt"
  const val ACTION_REPLY = "expo.modules.lanceralerts.REPLY"
  const val ACTION_DISMISSED = "expo.modules.lanceralerts.DISMISSED"
  private const val QUESTION = "What was this for?"

  fun show(context: Context, id: String, sender: String, text: String, postedAt: Long) {
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
    // Who it was from or to comes from the alert itself; the person only says what it was for.
    val party = direction?.let { MoneyText.counterparty(text, it) }
    val who = when {
      party == null -> null
      direction == true -> "From $party"
      else -> "To $party"
    }
    val time = SimpleDateFormat("EEE, MMM d · h:mm a", Locale.getDefault()).format(Date(postedAt))
    val details = listOfNotNull(who, time).joinToString(" · ")
    val body = "$details\n$QUESTION"

    // Swiping it away doesn't skip the question: it comes straight back until answered.
    val dismissIntent = Intent(context, ReplyReceiver::class.java)
      .setAction(ACTION_DISMISSED)
      .putExtra(EXTRA_ALERT_ID, id)
      .putExtra(EXTRA_SENDER, sender)
      .putExtra(EXTRA_TEXT, text)
      .putExtra(EXTRA_POSTED_AT, postedAt)
    val dismissPending = PendingIntent.getBroadcast(
      context,
      id.hashCode() + 2,
      dismissIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val replyIntent = Intent(context, ReplyReceiver::class.java)
      .setAction(ACTION_REPLY)
      .putExtra(EXTRA_ALERT_ID, id)
      .putExtra(EXTRA_SENDER, sender)
      .putExtra(EXTRA_TEXT, text)
      .putExtra(EXTRA_POSTED_AT, postedAt)
    val replyFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    val replyPending = PendingIntent.getBroadcast(context, id.hashCode(), replyIntent, replyFlags)
    val remoteInput = RemoteInput.Builder(KEY_ANSWER).setLabel(QUESTION).build()
    val reply = NotificationCompat.Action.Builder(0, "Answer", replyPending)
      .addRemoteInput(remoteInput)
      .setAllowGeneratedReplies(false)
      .build()

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(details)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setWhen(postedAt)
      .setShowWhen(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .setContentIntent(openAppIntent(context, id))
      .setDeleteIntent(dismissPending)
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
