package expo.modules.lanceralerts

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Alerts caught while Lancer may not be running, kept on the phone until the app takes them.
 * Answers typed into the notification are kept separately, keyed by alert id.
 */
object AlertStore {
  private const val PREFS = "lancer_alerts"
  private const val KEY_ALERTS = "alerts"
  private const val KEY_ANSWERS = "answers"
  private const val KEY_FINGERPRINTS = "seen"
  private const val KEY_LOG = "log"
  private const val KEY_CLOSED = "closed"
  private const val KEY_CONNECTED_AT = "connectedAt"
  private const val KEY_LAST_SEEN_AT = "lastSeenAt"
  private const val MAX_ALERTS = 200
  private const val MAX_FINGERPRINTS = 60
  private const val MAX_LOG = 8

  /** Set while the JS module is alive so new alerts reach the app at once. */
  @Volatile var listener: (() -> Unit)? = null

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun trimmed(array: JSONArray, max: Int): JSONArray {
    val result = JSONArray()
    for (index in maxOf(0, array.length() - max) until array.length()) result.put(array.get(index))
    return result
  }

  fun markConnected(context: Context) {
    prefs(context).edit().putLong(KEY_CONNECTED_AT, System.currentTimeMillis()).apply()
  }

  /** Any notification at all reached the listener (no content kept). */
  fun markSeen(context: Context) {
    prefs(context).edit().putLong(KEY_LAST_SEEN_AT, System.currentTimeMillis()).apply()
  }

  /** False when this exact alert was already caught (apps re-post notifications when they update). */
  @Synchronized
  fun firstTime(context: Context, fingerprint: String): Boolean {
    val prefs = prefs(context)
    val seen = JSONArray(prefs.getString(KEY_FINGERPRINTS, "[]"))
    for (index in 0 until seen.length()) {
      if (seen.getString(index) == fingerprint) return false
    }
    seen.put(fingerprint)
    prefs.edit().putString(KEY_FINGERPRINTS, trimmed(seen, MAX_FINGERPRINTS).toString()).apply()
    return true
  }

  /** The last few notifications that showed an amount, kept or not, for the Bank alerts screen. */
  @Synchronized
  fun logCandidate(context: Context, sender: String, text: String, at: Long, kept: Boolean) {
    val prefs = prefs(context)
    val log = JSONArray(prefs.getString(KEY_LOG, "[]"))
    log.put(JSONObject().put("sender", sender).put("text", text.take(240)).put("at", at).put("kept", kept))
    prefs.edit().putString(KEY_LOG, trimmed(log, MAX_LOG).toString()).apply()
  }

  @Synchronized
  fun add(context: Context, alert: JSONObject) {
    val prefs = prefs(context)
    val alerts = JSONArray(prefs.getString(KEY_ALERTS, "[]"))
    alerts.put(alert)
    prefs.edit().putString(KEY_ALERTS, trimmed(alerts, MAX_ALERTS).toString()).apply()
    listener?.invoke()
  }

  @Synchronized
  fun addAnswer(context: Context, id: String, answer: String) {
    val prefs = prefs(context)
    val answers = JSONObject(prefs.getString(KEY_ANSWERS, "{}"))
    answers.put(id, answer)
    prefs.edit().putString(KEY_ANSWERS, answers.toString()).apply()
    close(context, id)
    listener?.invoke()
  }

  /** The question for this alert is done (answered, or settled in the app), so it never comes back. */
  @Synchronized
  fun close(context: Context, id: String) {
    val prefs = prefs(context)
    val closed = JSONArray(prefs.getString(KEY_CLOSED, "[]"))
    closed.put(id)
    prefs.edit().putString(KEY_CLOSED, trimmed(closed, MAX_FINGERPRINTS).toString()).apply()
  }

  @Synchronized
  fun isClosed(context: Context, id: String): Boolean {
    val closed = JSONArray(prefs(context).getString(KEY_CLOSED, "[]"))
    for (index in 0 until closed.length()) {
      if (closed.getString(index) == id) return true
    }
    return false
  }

  /** Everything waiting, as {"alerts": [...], "answers": {...}}; clears both. */
  @Synchronized
  fun takeAll(context: Context): String {
    val prefs = prefs(context)
    val result = JSONObject()
    result.put("alerts", JSONArray(prefs.getString(KEY_ALERTS, "[]")))
    result.put("answers", JSONObject(prefs.getString(KEY_ANSWERS, "{}")))
    prefs.edit().remove(KEY_ALERTS).remove(KEY_ANSWERS).apply()
    return result.toString()
  }

  /** {"connectedAt", "lastSeenAt", "log": [...]} for the Bank alerts screen. */
  @Synchronized
  fun diagnostics(context: Context): String {
    val prefs = prefs(context)
    return JSONObject()
      .put("connectedAt", prefs.getLong(KEY_CONNECTED_AT, 0))
      .put("lastSeenAt", prefs.getLong(KEY_LAST_SEEN_AT, 0))
      .put("log", JSONArray(prefs.getString(KEY_LOG, "[]")))
      .toString()
  }
}
