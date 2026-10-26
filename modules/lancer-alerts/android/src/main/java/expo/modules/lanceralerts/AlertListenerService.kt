package expo.modules.lanceralerts

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.UUID

/**
 * Sees every notification once the person grants Notification access, and keeps only the ones that
 * look like money moving: an amount plus a credit/debit word, from a bank app or a bank SMS.
 * Chat apps are skipped outright, and nothing else is stored.
 */
class AlertListenerService : NotificationListenerService() {
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

    val notification = sbn.notification ?: return
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    if (notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))
      ?.toString()
      .orEmpty()
    val combined = "$title $text"
    if (!MoneyText.looksLikeMoney(combined)) return

    // SMS apps put the sender ("GTBank") in the title; bank apps are named by their app label ("OPay").
    val isSmsApp = SMS_PACKAGES.containsMatchIn(pkg) || notification.category == Notification.CATEGORY_MESSAGE
    val sender = if (isSmsApp) title else appLabel(pkg)

    val fingerprint = "$pkg|$title|$text".hashCode().toString()
    if (!AlertStore.markSeen(this, fingerprint)) return

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
