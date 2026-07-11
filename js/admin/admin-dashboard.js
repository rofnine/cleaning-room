function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function isoDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function orderDateKey(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
}

export function buildMonthCalendar(year, monthIndex, orders = []) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const startDay = 1 - firstDay;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, startDay + index));
    const key = isoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return {
      isoDate: key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      orders: orders.filter((order) => orderDateKey(order.preferred_start) === key),
    };
  });
}

export function keyHandoverAlert(order) {
  if (order?.key_handover_source === 'support_center' && order.delegation_form_completed !== true) return '위임장 확인 필요';
  if (order?.key_handover_source === 'management_office' && order.management_key_released !== true) return '키 불출 확인 필요';
  return '확인 완료';
}

export function normalizePriceUpdate(row) {
  const update = {
    unit_price: numberOrNull(row.unit_price),
    minimum_amount: numberOrNull(row.minimum_amount),
    fixed_price: numberOrNull(row.fixed_price),
    pricing_mode: String(row.pricing_mode || 'fixed'),
    public_visible: Boolean(row.public_visible),
    active: Boolean(row.active),
  };
  if (row.category === 'appliance' && (update.fixed_price ?? 0) < 30000) {
    throw new Error('가전 청소 옵션은 최소 30,000원부터 설정할 수 있습니다.');
  }
  if (update.pricing_mode === 'quote') {
    update.unit_price = null;
    update.minimum_amount = null;
    update.fixed_price = null;
  }
  return update;
}
