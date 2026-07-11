const SERVICE_LABELS = Object.freeze({
  move_in: '입주청소',
  move_out: '이사청소',
  occupied: '거주청소',
});

const PACKAGE_ID_PATTERN = /^(move_in|move_out|occupied)_(standard|premium)$/;

function numberOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function normalizePriceRows(rows) {
  const services = {};
  const options = {};
  const activeRows = [...(rows || [])]
    .filter((row) => row?.active !== false)
    .sort((left, right) => numberOrZero(left.sort_order) - numberOrZero(right.sort_order));

  for (const row of activeRows) {
    const packageMatch = PACKAGE_ID_PATTERN.exec(String(row.id || ''));
    if (row.category === 'package' && packageMatch) {
      const [, serviceType, packageId] = packageMatch;
      services[serviceType] ||= { label: SERVICE_LABELS[serviceType], packages: {} };
      services[serviceType].packages[packageId] = {
        id: row.id,
        label: row.label,
        unitPrice: numberOrZero(row.unit_price),
        minimum: numberOrZero(row.minimum_amount),
        mode: row.pricing_mode || 'per_area_minimum',
      };
      continue;
    }

    options[row.id] = {
      id: row.id,
      category: row.category,
      label: row.label,
      mode: row.pricing_mode || (row.unit_price != null ? 'per_area' : 'fixed'),
      unitPrice: numberOrZero(row.unit_price),
      price: numberOrZero(row.fixed_price),
      publicVisible: row.public_visible !== false,
      sortOrder: numberOrZero(row.sort_order),
    };
  }

  return { services, options, rows: activeRows };
}

export async function loadPriceCatalog(client, { publicOnly = true } = {}) {
  if (!client?.from) throw new Error('가격 정보를 불러올 수 없습니다.');
  let query = client
    .from('price_catalog')
    .select('id,category,label,unit_price,minimum_amount,fixed_price,pricing_mode,public_visible,sort_order,active,effective_from,updated_at')
    .eq('active', true);
  if (publicOnly) query = query.eq('public_visible', true);
  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return normalizePriceRows(data || []);
}
