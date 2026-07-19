// Parses ONLY the two PNB formats. Everything else returns null.
const RE_DEBIT = /A\/c (X\d+) debited INR ([\d,]+\.\d{2}) Dt \d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} to (.+?) thru UPI:\d+\.Bal INR ([\d,]+\.\d{2})/i;
const RE_CREDIT = /A\/c (X\d+) credited for INR ([\d,]+\.\d{2}) on \d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} by (.+?) thru UPI\.AvlBal INR ([\d,]+\.\d{2})\(UPI:\d+\)/i;
const num = (s) => parseFloat(String(s).replace(/,/g, ''));

export function parseSms(body) {
  let m;
  if ((m = body.match(RE_CREDIT)))
    return { account: m[1], direction: 'credit', amount: num(m[2]), party: m[3].trim(), balance: num(m[4]) };
  if ((m = body.match(RE_DEBIT)))
    return { account: m[1], direction: 'debit', amount: num(m[2]), party: m[3].trim(), balance: num(m[4]) };
  return null;
}
