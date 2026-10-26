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
  private const val KEY_SEEN = "seen"
  private const val MAX_ALERTS = 200
  private const val MAX_SEEN = 60

  /** Set while the JS module is alive so new alerts reach the app at once. */
  @Volatile var listener: (() -> Unit)? = null

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** False when this exact alert was already caught (apps re-post notifications when they update). */
  @Synchronized
  fun markSeen(context: Context, fingerprint: String): Boolean {
    val prefs = prefs(context)
    val seen = JSONArray(prefs.getString(KEY_SEEN, "[]"))
    for (index in 0 until seen.length()) {
      if (seen.getString(index) == fingerprint) return false
    }
    seen.put(fingerprint)
    val trimmed = JSONArray()
    for (index in maxOf(0, seen.length() - MAX_SEEN) until seen.length()) trimmed.put(seen.get(index))
    prefs.edit().putString(KEY_SEEN, trimmed.toString()).apply()
    return true
  }

  @Synchronized
  fun add(context: Context, alert: JSONObject) {
    val prefs = prefs(context)
    val alerts = JSONArray(prefs.getString(KEY_ALERTS, "[]"))
    alerts.put(alert)
    val trimmed = JSONArray()
    for (index in maxOf(0, alerts.length() - MAX_ALERTS) until alerts.length()) trimmed.put(alerts.get(index))
    prefs.edit().putString(KEY_ALERTS, trimmed.toString()).apply()
    listener?.invoke()
  }

  @Synchronized
  fun addAnswer(context: Context, id: String, answer: String) {
    val prefs = prefs(context)
    val answers = JSONObject(prefs.getString(KEY_ANSWERS, "{}"))
    answers.put(id, answer)
    prefs.edit().putString(KEY_ANSWERS, answers.toString()).apply()
    listener?.invoke()
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
}
