package expo.modules.lanceralerts

/** A quick first pass on the phone; the app's own parser makes the final call. */
object MoneyText {
  private val AMOUNT =
    Regex("(?:₦|NGN|N(?=\\s?\\d)|\\$|USD|GH₵|GHS|KES|KSh|£|GBP|€|EUR)\\s?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val LABELLED = Regex("\\b(?:amt|amount)\\s*[:\\-]?\\s*\\D{0,4}(\\d[\\d,]*(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val CREDIT =
    Regex("\\b(credit(?:ed)?|cr|received|receive|inflow|deposit(?:ed)?|incoming|reversal|refund(?:ed)?|sent you|paid you)\\b", RegexOption.IGNORE_CASE)
  private val DEBIT =
    Regex("\\b(debit(?:ed)?|dr|sent|transfer(?:red)? to|transfer of|transfer successful|withdraw(?:al|n)?|purchase|paid|payment|spent|charged|deducted|pos|atm|airtime)\\b", RegexOption.IGNORE_CASE)
  private val NOISE =
    Regex("\\b(otp|one[- ]time|verification code|loan offer|borrow|get up to|win|stand a chance|promo|apply now)\\b", RegexOption.IGNORE_CASE)

  fun looksLikeMoney(text: String): Boolean {
    if (amount(text) == null) return false
    if (!CREDIT.containsMatchIn(text) && !DEBIT.containsMatchIn(text)) return false
    return !NOISE.containsMatchIn(text) || Regex("\\b(credit|debit)", RegexOption.IGNORE_CASE).containsMatchIn(text)
  }

  /** The amount as written ("₦5,000.00"), for the prompt's title. */
  fun amount(text: String): String? = AMOUNT.find(text)?.value ?: LABELLED.find(text)?.groupValues?.get(1)

  fun isIncome(text: String): Boolean {
    val explicitCredit = Regex("\\b(credit(?:ed)?|cr)\\b", RegexOption.IGNORE_CASE).find(text)?.range?.first
    val explicitDebit = Regex("\\b(debit(?:ed)?|dr)\\b", RegexOption.IGNORE_CASE).find(text)?.range?.first
    if (explicitCredit != null || explicitDebit != null) {
      return explicitDebit == null || (explicitCredit != null && explicitCredit < explicitDebit)
    }
    val credit = CREDIT.find(text)?.range?.first
    val debit = DEBIT.find(text)?.range?.first
    return credit != null && (debit == null || credit <= debit)
  }
}
