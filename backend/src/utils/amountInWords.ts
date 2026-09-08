const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigits(n: number): string {
  if (n > 99) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  return twoDigits(n);
}

/** Converts a rupee amount to the Indian numbering system words (Crore/Lakh/Thousand). */
export function amountInWordsINR(amount: number): string {
  let num = Math.round(amount);
  if (num === 0) return 'Zero Rupees Only';

  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;

  let words = '';
  if (crore) words += threeDigits(crore) + ' Crore ';
  if (lakh) words += threeDigits(lakh) + ' Lakh ';
  if (thousand) words += threeDigits(thousand) + ' Thousand ';
  if (rest) words += threeDigits(rest);

  return words.trim() + ' Rupees Only';
}
