// Weekday and hour on campus, whatever time zone the visitor is in.
// Parking rules are written in campus time, so a visitor checking from
// another time zone still sees what is true on campus right now.
export function campusClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday').value
  // Some browsers print midnight as 24, so wrap it back to 0.
  const hour = Number(parts.find(p => p.type === 'hour').value) % 24
  return { weekday, hour }
}

// Parking rules change with the academic year. Each campus says until when
// its rules were checked ('2027-08-15'); after that day nothing may be shown
// as free until someone re-checks them and moves the date.
export function isPast(day, date) {
  return date.getTime() > new Date(`${day}T23:59:59Z`).getTime()
}
