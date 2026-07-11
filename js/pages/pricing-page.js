import { getSupabase } from '../lib/supabase.js';
import { loadPriceCatalog } from '../orders/catalog.js';
import { DEFAULT_PRICE_ROWS } from '../orders/pricing.js';

const GROUP_LABELS = Object.freeze({ package: '기본 청소', appliance: '가전 청소', site_extra: '추가 케어' });

function formatWon(value) { return `${Number(value || 0).toLocaleString('ko-KR')}원`; }

function formatPrice(row) {
  const mode = row.pricing_mode || row.mode;
  if (mode === 'quote') return '별도 상담';
  if (mode === 'per_area_minimum') return `평당 ${formatWon(row.unit_price)} · 최소 ${formatWon(row.minimum_amount)}`;
  if (mode === 'per_area') return `평당 ${formatWon(row.unit_price)}`;
  return formatWon(row.fixed_price);
}

function priceIcon(row) {
  if (row.category === 'package') return '기본';
  if (row.category === 'appliance') return '가전';
  return '케어';
}

function createPriceCard(row) {
  const item = document.createElement('article');
  item.className = 'price-card';
  const icon = document.createElement('i');
  icon.className = 'price-card-icon';
  icon.textContent = priceIcon(row);
  icon.setAttribute('aria-hidden', 'true');
  const copy = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = row.label;
  const price = document.createElement('span');
  price.textContent = formatPrice(row);
  copy.append(label, price);
  item.append(icon, copy);
  return item;
}

function renderRows(rows) {
  const content = document.querySelector('[data-price-content]');
  if (!content) return;
  for (const category of Object.keys(GROUP_LABELS)) {
    const group = content.querySelector(`[data-price-group="${category}"] .price-list`);
    const visibleRows = rows.filter((row) => row.category === category && row.public_visible !== false);
    group.replaceChildren(...visibleRows.map(createPriceCard));
  }
  content.hidden = false;
}

async function refreshCatalog() {
  const status = document.querySelector('[data-price-refresh-note]');
  renderRows(DEFAULT_PRICE_ROWS);
  try {
    const client = await getSupabase();
    const catalog = await loadPriceCatalog(client, { publicOnly: true });
    renderRows(catalog.rows);
    if (status) status.textContent = '';
  } catch {
    if (status) status.textContent = '기본 가격표를 표시하고 있습니다. 실제 금액은 상담 후 최종 확정됩니다.';
  }
}

refreshCatalog();
