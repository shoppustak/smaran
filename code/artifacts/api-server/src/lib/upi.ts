const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 256) {
    return false;
  }
  return UPI_REGEX.test(trimmed);
}

export function buildUpiDeepLink(
  vpa: string,
  payeeName: string,
  amount: number,
  transactionNote: string
): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    tn: transactionNote,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}
