// DOTS rule of thumb: most surface lots are permit-only Mon–Fri 7am–4pm and
// unrestricted evenings + weekends (posted signs and event days override).
export function isFreePeriod(d = new Date()) {
  const day = d.getDay()
  if (day === 0 || day === 6) return true
  const h = d.getHours()
  return h >= 16 || h < 7
}
