const HOUR = 60 * 60 * 1000;

export const START_HOURS = Object.freeze(Array.from({ length: 13 }, (_, index) => index + 6));

function validDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid schedule time');
  return date;
}

export function createHoldRange(start) {
  const startDate = validDate(start);
  return {
    start: startDate.toISOString(),
    end: new Date(startDate.getTime() + 2 * HOUR).toISOString(),
  };
}

export function overlaps(first, second) {
  return validDate(first.start) < validDate(second.end)
    && validDate(second.start) < validDate(first.end);
}

export function assertConfirmedRange(start, end) {
  const startDate = validDate(start);
  const endDate = validDate(end);
  if (endDate.getTime() - startDate.getTime() < 2 * HOUR) {
    throw new Error('Confirmed work must be at least two hours');
  }
  return { start, end };
}

export function toKoreaStart(dateValue, hour) {
  const normalizedHour = Number(hour);
  if (!START_HOURS.includes(normalizedHour)) throw new Error('Choose an available start hour');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ''))) throw new Error('Choose a valid date');
  return `${dateValue}T${String(normalizedHour).padStart(2, '0')}:00:00+09:00`;
}
