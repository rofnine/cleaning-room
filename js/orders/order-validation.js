import { validateEmail } from '../auth/auth-validation.js';
import { calculateEstimate, PRICE_CATALOG } from './pricing.js?v=20260623-live-prices1';
import { START_HOURS, toKoreaStart } from './schedule.js';

const ORDER_KINDS = new Set(['consultation', 'booking']);
const CHECKOUT_MODES = new Set(['guest', 'member']);
export const MIN_SUPPLY_AREA = 16;

function requiredText(value, label, maxLength = 200) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) throw new Error(`${label} is required`);
  return text;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^01\d{8,9}$/.test(digits)) throw new Error('Enter a valid phone number');
  return digits;
}

export function validateOrderDraft(input, catalog = PRICE_CATALOG) {
  const kind = String(input?.kind || '');
  const checkoutMode = String(input?.checkoutMode || '');
  if (!ORDER_KINDS.has(kind)) throw new Error('Choose an order kind');
  if (!CHECKOUT_MODES.has(checkoutMode)) throw new Error('Choose guest or member checkout');
  const area = Number(input?.area);
  if (!Number.isFinite(area) || area < MIN_SUPPLY_AREA) throw new Error('Supply area must be at least 16 pyeong');

  const normalized = {
    ...input,
    area,
    kind,
    checkoutMode,
    district: requiredText(input.district, 'District', 80),
    address: requiredText(input.address, 'Address', 200),
    estimate: calculateEstimate(input, catalog),
  };

  const keySource = ['customer', 'support_center', 'management_office', 'none'].includes(input.keyHandoverSource)
    ? input.keyHandoverSource
    : 'none';
  normalized.keyHandoverSource = keySource;
  normalized.delegationFormCompleted = keySource === 'support_center' && typeof input.delegationFormCompleted === 'boolean'
    ? input.delegationFormCompleted
    : null;
  normalized.managementKeyReleased = keySource === 'management_office' && typeof input.managementKeyReleased === 'boolean'
    ? input.managementKeyReleased
    : null;

  if (checkoutMode === 'guest') {
    normalized.name = requiredText(input.name, 'Name', 80);
    normalized.phone = normalizePhone(input.phone);
    normalized.email = validateEmail(input.email);
  } else if (!String(input.memberId || '').trim()) {
    throw new Error('Login is required for member checkout');
  }

  if (input.consent !== true) throw new Error('Privacy consent is required');

  if (kind === 'booking') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ''))) throw new Error('Choose a booking date');
    const hour = Number(input.hour);
    if (!START_HOURS.includes(hour)) throw new Error('Choose an allowed booking hour');
    normalized.hour = hour;
    normalized.startAt = toKoreaStart(input.date, hour);
  }

  return normalized;
}
