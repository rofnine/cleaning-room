function assertMonth(year, monthIndex) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error('Choose a valid calendar month');
  }
}

export function minimumIsoAfter(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) throw new Error('Choose a valid date');
  const [year, month, day] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function buildMonthGrid(year, monthIndex, minimumIso) {
  assertMonth(year, monthIndex);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(minimumIso || ''))) {
    throw new Error('Choose a valid minimum date');
  }

  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: firstDay.getUTCDay() }, () => ({ empty: true }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      empty: false,
      day,
      iso,
      disabled: iso < minimumIso,
    });
  }

  while (cells.length % 7) cells.push({ empty: true });
  return cells;
}

export function shiftMonth(view, delta) {
  assertMonth(view?.year, view?.monthIndex);
  if (!Number.isInteger(delta)) throw new Error('Choose a valid month shift');
  const shifted = new Date(Date.UTC(view.year, view.monthIndex + delta, 1));
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
  };
}

export function formatMonthTitle(view) {
  assertMonth(view?.year, view?.monthIndex);
  return `${view.year}년 ${view.monthIndex + 1}월`;
}
