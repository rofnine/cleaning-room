import { PROMO_COUPON_CODE } from '../orders/pricing.js';

const STORAGE_KEY = 'cleaning:registered-coupon';
const PROMO_RATE = 10;

export function normalizeCouponCode(value) {
  return String(value || '').trim().toUpperCase();
}

function createRegisteredCoupon(email = '') {
  return {
    code: PROMO_COUPON_CODE,
    label: '10% 할인 쿠폰',
    rate: PROMO_RATE,
    email: String(email || '').trim().toLowerCase(),
    issuedAt: new Date().toISOString(),
    status: '사용 가능',
  };
}

export function registerCouponCode(code, email = '', storage = globalThis.localStorage) {
  const normalized = normalizeCouponCode(code);
  if (normalized !== PROMO_COUPON_CODE) {
    throw new Error('등록 가능한 쿠폰 코드가 아닙니다.');
  }
  const existing = getRegisteredCoupon(storage);
  if (existing) return { ...existing, alreadyRegistered: true };
  const coupon = createRegisteredCoupon(email);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(coupon));
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
  return coupon;
}

export function getRegisteredCoupon(storage = globalThis.localStorage) {
  try {
    const coupon = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    return normalizeCouponCode(coupon?.code) === PROMO_COUPON_CODE ? coupon : null;
  } catch {
    return null;
  }
}

export function consumeRegisteredCoupon(storage = globalThis.localStorage) {
  const coupon = getRegisteredCoupon(storage);
  if (!coupon) return false;
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage cleanup failure should not block a submitted booking.
  }
  return true;
}

export function listCoupons(storage = globalThis.localStorage) {
  const coupon = getRegisteredCoupon(storage);
  return coupon ? [coupon] : [];
}

export function hasUsableCoupon(storage = globalThis.localStorage) {
  return Boolean(getRegisteredCoupon(storage));
}
