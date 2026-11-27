const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)] ?? digit);
}

export function formatPriceNumber(amount: number): string {
  const withCommas = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits(withCommas);
}

export function formatToman(amount: number, includeCurrency = true): string {
  const formatted = formatPriceNumber(amount);
  return includeCurrency ? `${formatted} تومان` : formatted;
}

export function formatCompactCount(count: number): string {
  if (count >= 1000) {
    const k = (count / 1000).toFixed(1).replace(/\.0$/, '');
    return `${toPersianDigits(k)} هزار`;
  }
  return toPersianDigits(count);
}

