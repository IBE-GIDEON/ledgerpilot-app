package expo.modules.lanceralerts

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.UUID

/**
 * Sees every notification once the person grants Notification access, and keeps only the ones that
 * look like money moving: an amount plus an in/out word, or an amount from a bank app or bank SMS.
 * Chat apps are skipped outright, and nothing else is stored.
 */
class AlertListenerService : NotificationListenerService() {
  override fun onListenerConnected() {
    AlertStore.markConnected(this)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      handle(sbn)
    } catch (_: Throwable) {
      // A malformed notification from another app must never crash the listener.
    }
  }

  private fun handle(sbn: StatusBarNotification) {
    val pkg = sbn.packageName ?: return
    if (pkg == packageName || IGNORED_PACKAGES.containsMatchIn(pkg)) return
    AlertStore.markSeen(this)

    val notification = sbn.notification ?: return
    if (notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = bodyText(extras)
    val combined = "$title $text"
    if (!MoneyText.hasAmount(combined)) return

    // SMS apps put the sender ("GTBank") in the title; bank apps are named by their app label ("OPay").
    val isSmsApp = SMS_PACKAGES.containsMatchIn(pkg) || notification.category == Notification.CATEGORY_MESSAGE
    val sender = if (isSmsApp) title else appLabel(pkg)
    val kept = MoneyText.looksLikeMoney("$sender $title", combined)

    // A short local log of money-looking notifications, so the Bank alerts screen can show what was seen.
    AlertStore.logCandidate(this, sender, combined, sbn.postTime, kept)
    if (!kept) return

    val fingerprint = "$pkg|$title|$text".hashCode().toString()
    if (!AlertStore.firstTime(this, fingerprint)) return

    val id = UUID.randomUUID().toString()
    val alert = JSONObject()
      .put("id", id)
      .put("sender", sender)
      .put("title", if (isSmsApp) "" else title)
      .put("text", text)
      .put("postedAt", sbn.postTime)
    AlertStore.add(this, alert)
    PromptNotifier.show(this, id, sender, combined)
  }

  /** Big text, else the plain line, plus inbox lines and the newest chat-style message some apps use. */
  private fun bodyText(extras: Bundle): String {
    val parts = mutableListOf<String>()
    (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))
      ?.toString()
      ?.let { parts.add(it) }
    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.lastOrNull()?.toString()?.let {
      if (parts.none { part -> part.contains(it) }) parts.add(it)
    }
    @Suppress("DEPRECATION")
    val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
    (messages?.lastOrNull() as? Bundle)?.getCharSequence("text")?.toString()?.let {
      if (parts.none { part -> part.contains(it) }) parts.add(it)
    }
    return parts.joinToString(" ").trim()
  }

  private fun appLabel(pkg: String): String =
    try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) {
      pkg
    }

  companion object {
    private val IGNORED_PACKAGES =
      Regex("whatsapp|telegram|facebook|instagram|snapchat|signal|discord|slack|twitter|tiktok|viber|imoim|linkedin|gm$|android\\.email")
    private val SMS_PACKAGES = Regex("messaging|\\.mms|\\.sms")
  }
}
