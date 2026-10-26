package expo.modules.lanceralerts

/** A loose first pass on the phone; the app's own parser makes the final call. */
object MoneyText {
  private val AMOUNT =
    Regex("(?:₦|NGN|N(?=\\s?\\d)|\\$|USD|GH₵|GHS|KES|KSh|£|GBP|€|EUR)\\s?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val LABELLED = Regex("\\b(?:amt|amount)\\s*[:\\-]?\\s*\\D{0,4}(\\d[\\d,]*(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val CREDIT =
    Regex("\\b(credit(?:ed)?|cr|received|receive|inflow|deposit(?:ed)?|incoming|reversal|refund(?:ed)?|sent you|paid you|transferred to you|money in|cash ?in|top[- ]?up|funded|added to your)\\b", RegexOption.IGNORE_CASE)
  private val DEBIT =
    Regex("\\b(debit(?:ed)?|dr|sent|send|transfer(?:red)?|withdraw(?:al|n)?|outflow|purchase|bought|paid|payment|spent|charged|deducted|pos|atm|airtime|recharge|bill|money out|cash ?out)\\b", RegexOption.IGNORE_CASE)
  private val NOISE =
    Regex("\\b(otp|one[- ]time|verification code|loan offer|borrow|get up to|win|stand a chance|promo|apply now)\\b", RegexOption.IGNORE_CASE)
  private val BANKISH =
    Regex("bank|\\bmfb\\b|wallet|\\bpay\\b|opay|kuda|palm\\s?pay|moniepoint|gtworld|gtco|zenith|access|first\\s?bank|fbn|\\buba\\b|fidelity|fcmb|sterling|wema|alat|polaris|ecobank|stanbic|keystone|providus|carbon|fair\\s?money|chipper|m-?pesa", RegexOption.IGNORE_CASE)

  private val NAMES = listOf(
    "opay" to "OPay", "kuda" to "Kuda", "palm\\s?pay|transsnet" to "PalmPay", "moniepoint|teamapt" to "Moniepoint",
    "gtworld|gtbank|gtco" to "GTBank", "zenith" to "Zenith Bank", "access" to "Access Bank", "firstbank|fbn" to "First Bank",
    "\\buba\\b|vericash" to "UBA", "fidelity" to "Fidelity Bank", "fcmb" to "FCMB", "sterling" to "Sterling Bank",
    "wema|alat" to "Wema Bank", "polaris" to "Polaris Bank", "ecobank" to "Ecobank", "stanbic" to "Stanbic IBTC",
    "carbon|lenddo" to "Carbon", "fairmoney" to "FairMoney", "chipper" to "Chipper Cash"
  ).map { (pattern, name) -> Regex(pattern, RegexOption.IGNORE_CASE) to name }

  /** "team.opay.pay" → "OPay", for when Android won't tell Lancer another app's name. */
  fun bankName(raw: String): String? = NAMES.firstOrNull { it.first.containsMatchIn(raw) }?.second

  fun hasAmount(text: String) = amount(text) != null

  fun isBankish(sender: String) = BANKISH.containsMatchIn(sender)

  /** Worth asking about: an amount, not a code or an advert, and either an in/out word or a bank sender. */
  fun looksLikeMoney(sender: String, text: String): Boolean {
    if (!hasAmount(text)) return false
    // Banks tack promos onto real alerts, so an advert word only rules one out when nothing says in or out.
    val saysDirection = CREDIT.containsMatchIn(text) || DEBIT.containsMatchIn(text)
    if (NOISE.containsMatchIn(text) && !saysDirection) return false
    return saysDirection || isBankish(sender)
  }

  /** The amount as written ("₦5,000.00"), for the prompt's title. */
  fun amount(text: String): String? = AMOUNT.find(text)?.value ?: LABELLED.find(text)?.groupValues?.get(1)

  /** In, out, or null when the alert doesn't say. */
  fun direction(text: String): Boolean? {
    val explicitCredit = Regex("\\b(credit(?:ed)?|cr)\\b", RegexOption.IGNORE_CASE).find(text)?.range?.first
    val explicitDebit = Regex("\\b(debit(?:ed)?|dr)\\b", RegexOption.IGNORE_CASE).find(text)?.range?.first
    if (explicitCredit != null || explicitDebit != null) {
      return explicitDebit == null || (explicitCredit != null && explicitCredit < explicitDebit)
    }
    val credit = CREDIT.find(text)?.range?.first
    val debit = DEBIT.find(text)?.range?.first
    if (credit == null && debit == null) return null
    return credit != null && (debit == null || credit <= debit)
  }
}
