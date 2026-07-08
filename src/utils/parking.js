// DOTS rule of thumb: most surface lots are permit-only Mon–Fri 7am–4pm and
// unrestricted evenings + weekends (posted signs and event days override).
// Evaluated in campus time (US Eastern) so remote visitors see campus status.
export function isFreePeriod(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const weekday = parts.find(p => p.type === 'weekday').value
  const h = Number(parts.find(p => p.type === 'hour').value) % 24
  if (weekday === 'Sat' || weekday === 'Sun') return true
  return h >= 16 || h < 7
}
