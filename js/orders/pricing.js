import { normalizePriceRows } from './catalog.js';

export const PROMO_COUPON_CODE = 'CLEAN10';

export const DEFAULT_PRICE_ROWS = Object.freeze([
  { id:'move_in_standard', category:'package', label:'입주 스탠다드 청소', unit_price:15000, minimum_amount:240000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:10 },
  { id:'move_in_premium', category:'package', label:'입주 프리미엄 청소', unit_price:19000, minimum_amount:300000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:20 },
  { id:'move_out_standard', category:'package', label:'이사 스탠다드 청소', unit_price:16000, minimum_amount:260000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:30 },
  { id:'move_out_premium', category:'package', label:'이사 프리미엄 청소', unit_price:20000, minimum_amount:320000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:40 },
  { id:'occupied_standard', category:'package', label:'거주 스탠다드 청소', unit_price:18000, minimum_amount:300000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:50 },
  { id:'occupied_premium', category:'package', label:'거주 프리미엄 청소', unit_price:22000, minimum_amount:360000, fixed_price:null, pricing_mode:'per_area_minimum', active:true, public_visible:true, sort_order:60 },
  { id:'topLoader', category:'appliance', label:'통돌이 세탁기 분해 청소', fixed_price:90000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:110 },
  { id:'drumWasher', category:'appliance', label:'드럼 세탁기 분해 청소', fixed_price:130000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:120 },
  { id:'microwave', category:'appliance', label:'전자레인지 내부·외부 청소', fixed_price:55000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:130 },
  { id:'fridgeStandard', category:'appliance', label:'일반 2도어 냉장고 청소', fixed_price:100000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:140 },
  { id:'fridgeBuiltIn', category:'appliance', label:'양문형·빌트인 냉장고 청소', fixed_price:160000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:150 },
  { id:'wallAircon', category:'appliance', label:'벽걸이 에어컨 분해 청소', fixed_price:75000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:160 },
  { id:'standAircon', category:'appliance', label:'스탠드 에어컨 분해 청소', fixed_price:145000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:170 },
  { id:'kirbyDust', category:'site_extra', label:'컬비 미세먼지 제거(벽면·바닥)', unit_price:8000, pricing_mode:'per_area', active:true, public_visible:true, sort_order:210 },
  { id:'petCare', category:'site_extra', label:'애완동물 특수 케어', fixed_price:50000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:220 },
  { id:'sofaMite', category:'site_extra', label:'소파 진드기 UV 살균·제거', fixed_price:50000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:230 },
  { id:'bedMite', category:'site_extra', label:'침대 진드기 UV 살균·제거', fixed_price:80000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:240 },
  { id:'miteCombo', category:'site_extra', label:'소파+침대 진드기 케어 묶음', fixed_price:100000, pricing_mode:'bundle', active:true, public_visible:true, sort_order:250 },
  { id:'wasteSmall', category:'site_extra', label:'폐기물 단순 처리', fixed_price:30000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:260 },
  { id:'wasteMedium', category:'site_extra', label:'폐기물 중량 처리', fixed_price:60000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:270 },
  { id:'wasteLarge', category:'site_extra', label:'폐기물 대량 처리', pricing_mode:'quote', active:true, public_visible:true, sort_order:280 },
  { id:'severeMold', category:'site_extra', label:'실링 곰팡이·기름때', fixed_price:40000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:310 },
  { id:'stickerRemoval', category:'site_extra', label:'스티커·부착지 제거', fixed_price:40000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:320 },
  { id:'builtInCloset', category:'site_extra', label:'붙박이장 추가 1세트', fixed_price:40000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:330 },
  { id:'balcony', category:'site_extra', label:'베란다 추가 1곳', fixed_price:40000, pricing_mode:'fixed', active:true, public_visible:true, sort_order:340 },
]);

export const PRICE_CATALOG = normalizePriceRows(DEFAULT_PRICE_ROWS);

function optionPrice(option, area) {
  if (option.mode === 'per_area') return Math.round(area * option.unitPrice);
  return option.price;
}

function normalizeCouponCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function calculateEstimate(input, catalog = PRICE_CATALOG) {
  const area = Number(input?.area);
  if (!Number.isFinite(area) || area <= 0 || area > 300) throw new Error('Enter a valid area');

  const service = catalog.services[input.serviceType];
  if (!service) throw new Error('Choose a valid service type');
  const plan = service.packages[input.packageId];
  if (!plan) throw new Error('Choose a valid package');

  const base = Math.max(Math.round(area * plan.unitPrice), plan.minimum);
  const optionIds = [...new Set(input.optionIds || [])];
  const options = [];
  const quoteItems = [];

  for (const id of optionIds) {
    const option = catalog.options[id];
    if (!option || option.mode === 'bundle') throw new Error(`Unknown option: ${id}`);
    if (option.mode === 'quote') {
      quoteItems.push({ id, label: option.label, category: option.category });
      continue;
    }
    options.push({ id, label: option.label, category: option.category, price: optionPrice(option, area) });
  }

  const discounts = [];
  if (optionIds.includes('sofaMite') && optionIds.includes('bedMite')) {
    const combo = catalog.options.miteCombo;
    if (combo?.mode === 'bundle') {
      const separateTotal = options
        .filter((option) => option.id === 'sofaMite' || option.id === 'bedMite')
        .reduce((sum, option) => sum + option.price, 0);
      const amount = combo.price - separateTotal;
      if (amount < 0) discounts.push({ id: 'miteCombo', label: '소파+침대 묶음 할인', amount });
    }
  }

  const subtotal = base
    + options.reduce((sum, option) => sum + option.price, 0)
    + discounts.reduce((sum, discount) => sum + discount.amount, 0);

  const couponCode = normalizeCouponCode(input.couponCode);
  if (couponCode === PROMO_COUPON_CODE) {
    discounts.push({ id: 'promoCoupon', label: '쿠폰 할인', amount: -Math.floor(subtotal * 0.1) });
  }

  const total = base
    + options.reduce((sum, option) => sum + option.price, 0)
    + discounts.reduce((sum, discount) => sum + discount.amount, 0);

  return {
    packageId: input.packageId,
    packageLabel: plan.label,
    serviceType: input.serviceType,
    serviceLabel: service.label,
    area,
    base,
    options,
    discounts,
    quoteItems,
    couponCode,
    total: Math.max(0, total),
  };
}

export function formatWon(amount) {
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}
