import { getSession } from '../auth/auth-service.js';
import { getSupabase } from '../lib/supabase.js';
import { validateOrderDraft } from '../orders/order-validation.js';
import { loadPriceCatalog } from '../orders/catalog.js';
import { calculateEstimate, formatWon, PRICE_CATALOG } from '../orders/pricing.js';
import { START_HOURS } from '../orders/schedule.js';
import { buildMonthGrid, formatMonthTitle, minimumIsoAfter, shiftMonth } from '../orders/calendar.js';
import { consumeRegisteredCoupon, getRegisteredCoupon, normalizeCouponCode } from '../auth/coupons.js';

export function createHourChoices() {
  return START_HOURS.map((hour) => ({
    hour,
    label: hour < 12 ? `오전 ${hour}시` : `오후 ${hour === 12 ? 12 : hour - 12}시`,
  }));
}

export function estimateFromFormValues(values, catalog = PRICE_CATALOG) {
  return calculateEstimate({
    serviceType: values.serviceType,
    area: values.area,
    packageId: values.packageId,
    optionIds: values.optionIds || [],
    couponCode: values.couponCode,
  }, catalog);
}

export function shouldCollapseEstimate(viewportWidth) {
  return Number(viewportWidth) <= 900;
}

function koreaToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function booleanChoice(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function collectFormValues(form) {
  const data = new FormData(form);
  const visibleCoupon = data.get('couponCode');
  const appliedCoupon = data.get('appliedCouponCode');
  const couponCode = normalizeCouponCode(visibleCoupon || appliedCoupon);
  const usableCoupon = getRegisteredCoupon();
  return {
    kind: data.get('kind'),
    checkoutMode: data.get('checkoutMode'),
    serviceType: data.get('serviceType'),
    packageId: data.get('packageId'),
    area: data.get('area'),
    optionIds: data.getAll('optionIds'),
    couponCode: usableCoupon && normalizeCouponCode(usableCoupon.code) === couponCode ? couponCode : '',
    district: data.get('district'),
    address: data.get('address'),
    addressDetail: data.get('addressDetail'),
    date: data.get('date'),
    hour: data.get('hour'),
    name: data.get('name'),
    phone: data.get('phone'),
    email: data.get('email'),
    contactWindow: data.get('contactWindow'),
    contactChannel: data.get('contactChannel'),
    notes: data.get('notes'),
    consent: data.get('consent') === 'yes',
    keyHandoverSource: data.get('keyHandoverSource'),
    delegationFormCompleted: booleanChoice(data.get('delegationFormCompleted')),
    managementKeyReleased: booleanChoice(data.get('managementKeyReleased')),
  };
}

function localDateParts(iso) {
  const [year, month] = iso.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

function optionPriceText(option) {
  if (option.mode === 'quote') return '별도 상담';
  if (option.mode === 'per_area') return `평당 ${formatWon(option.unitPrice)}`;
  return `+${formatWon(option.price)}`;
}

async function syncMemberProfile(client, values) {
  if (!values.memberId) return;
  const displayName = String(values.name || '').trim();
  const phone = String(values.phone || '').replace(/\D/g, '');
  if (!displayName && !phone) return;
  try {
    await client
      .from('profiles')
      .update({
        display_name: displayName || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', values.memberId);
  } catch {
    // 주문 접수는 성공했는데 프로필 저장만 실패한 경우, 고객 신청 흐름은 막지 않습니다.
  }
}

async function submitCleaningOrder(client, draft) {
  try {
    const { data, error } = await client.functions.invoke('submit-order', { body: draft });
    if (error) throw error;
    return data;
  } catch (functionError) {
    const { data, error } = await client.rpc('submit_cleaning_order_public', { p_payload: draft });
    if (error) {
      const message = /submit_cleaning_order_public/i.test(error.message || '')
        ? '접수 저장 기능이 아직 Supabase에 적용되지 않았습니다. 관리자에게 설정을 요청해주세요.'
        : error.message;
      throw new Error(message || functionError?.message || '주문을 저장하지 못했습니다.');
    }
    return {
      orderId: data?.order_id,
      receiptNumber: data?.receipt_number,
      status: data?.status || 'new',
      source: 'database-rpc',
    };
  }
}

export async function initOrderForm(doc = document) {
  const form = doc.querySelector('[data-order-form]');
  if (!form) return;

  const today = koreaToday();
  const firstSelectableDate = minimumIsoAfter(today);
  let calendarView = localDateParts(today);
  let loggedIn = false;
  let currentStep = 'checkout';
  let catalog = null;
  const status = doc.querySelector('[data-order-status]');
  const timeGrid = doc.querySelector('[data-time-grid]');
  const timeSection = doc.querySelector('[data-time-section]');
  const hourInput = form.elements.hour;
  const dateInput = form.elements.date;
  const memberNotice = doc.querySelector('[data-member-notice]');
  const calendarGrid = doc.querySelector('[data-calendar-grid]');
  const calendarTitle = doc.querySelector('[data-calendar-title]');
  const calendarPrev = doc.querySelector('[data-calendar-prev]');
  const estimateCard = doc.querySelector('.estimate-card');
  const estimateToggle = doc.querySelector('[data-estimate-toggle]');
  const priceLoading = doc.querySelector('[data-price-loading]');
  const priceLoadingText = doc.querySelector('[data-price-loading-text]');
  const priceRetry = doc.querySelector('[data-price-retry]');
  const pricePhone = doc.querySelector('[data-price-phone]');
  const couponInput = doc.querySelector('[data-coupon-code]');
  const appliedCouponInput = doc.querySelector('[data-applied-coupon-code]');
  const couponFill = doc.querySelector('[data-coupon-fill]');
  const couponStatus = doc.querySelector('[data-coupon-status]');

  try {
    loggedIn = Boolean(await getSession());
  } catch {
    loggedIn = false;
  }
  if (loggedIn) {
    form.elements.checkoutMode.value = 'member';
    currentStep = 'service';
  }

  function availableSteps() {
    return loggedIn ? ['service', 'schedule', 'customer'] : ['checkout', 'service', 'schedule', 'customer'];
  }

  function renderProgress() {
    const steps = availableSteps();
    const currentIndex = steps.indexOf(currentStep);
    doc.querySelectorAll('[data-step-target]').forEach((button) => {
      const targetIndex = steps.indexOf(button.dataset.stepTarget);
      button.hidden = targetIndex < 0;
      button.removeAttribute('aria-current');
      button.dataset.complete = String(targetIndex >= 0 && targetIndex < currentIndex);
      if (button.dataset.stepTarget === currentStep) button.setAttribute('aria-current', 'step');
    });
  }

  function showStep(step, shouldScroll = true) {
    const steps = availableSteps();
    currentStep = steps.includes(step) ? step : steps[0];
    doc.querySelectorAll('[data-booking-step]').forEach((section) => {
      section.hidden = section.dataset.bookingStep !== currentStep;
    });
    renderProgress();
    if (shouldScroll) form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function setPriceState(state, message) {
    const ready = state === 'ready' || state === 'fallback';
    form.querySelectorAll('[data-price-required]').forEach((button) => { button.disabled = !ready; });
    priceLoading.dataset.state = state;
    priceLoadingText.textContent = message;
    priceRetry.hidden = state !== 'error';
    pricePhone.hidden = state !== 'error';
  }

  function renderHours() {
    timeGrid.replaceChildren();
    for (const choice of createHourChoices()) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'time-choice';
      button.textContent = choice.label;
      button.dataset.hour = String(choice.hour);
      button.setAttribute('aria-pressed', String(hourInput.value === String(choice.hour)));
      button.addEventListener('click', () => {
        hourInput.value = String(choice.hour);
        renderHours();
        renderEstimate();
      });
      timeGrid.append(button);
    }
  }

  function renderPackagePrices() {
    const service = catalog?.services[form.elements.serviceType.value];
    if (!service) return;
    for (const [packageId, plan] of Object.entries(service.packages)) {
      const card = form.querySelector(`[name="packageId"][value="${packageId}"]`)?.closest('.package-card');
      if (!card) continue;
      card.querySelector('[data-package-unit]').textContent = `평당 ${formatWon(plan.unitPrice)}`;
      card.querySelector('[data-package-minimum]').textContent = `최소 ${formatWon(plan.minimum)}`;
    }
  }

  function renderOptionGroups() {
    const groups = {
      appliance: doc.querySelector('[data-option-group="appliance"]'),
      site_extra: doc.querySelector('[data-option-group="site_extra"]'),
    };
    Object.values(groups).forEach((group) => group?.replaceChildren());
    const options = Object.values(catalog?.options || {})
      .filter((option) => option.mode !== 'bundle')
      .sort((left, right) => left.sortOrder - right.sortOrder);
    for (const option of options) {
      const group = groups[option.category === 'appliance' ? 'appliance' : 'site_extra'];
      if (!group) continue;
      const label = doc.createElement('label');
      label.className = 'option-card';
      const input = doc.createElement('input');
      input.type = 'checkbox';
      input.name = 'optionIds';
      input.value = option.id;
      const card = doc.createElement('span');
      const check = doc.createElement('i');
      check.className = 'option-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      const copy = doc.createElement('span');
      copy.className = 'option-copy';
      const name = doc.createElement('b');
      name.textContent = option.label;
      const description = doc.createElement('small');
      description.textContent = option.mode === 'quote' ? '현장 확인 후 최종 안내' : '예약 견적에 즉시 반영';
      const price = doc.createElement('strong');
      price.textContent = optionPriceText(option);
      copy.append(name, description);
      card.append(check, copy, price);
      label.append(input, card);
      group.append(label);
    }
  }

  function renderCalendar() {
    calendarTitle.textContent = formatMonthTitle(calendarView);
    const todayView = localDateParts(today);
    calendarPrev.disabled = calendarView.year === todayView.year && calendarView.monthIndex === todayView.monthIndex;
    calendarGrid.replaceChildren();
    for (const day of buildMonthGrid(calendarView.year, calendarView.monthIndex, firstSelectableDate)) {
      if (day.empty) {
        const empty = doc.createElement('span');
        empty.className = 'calendar-empty';
        empty.setAttribute('aria-hidden', 'true');
        calendarGrid.append(empty);
        continue;
      }
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = String(day.day);
      button.disabled = day.disabled;
      button.dataset.date = day.iso;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${day.iso} 선택`);
      button.setAttribute('aria-pressed', String(dateInput.value === day.iso));
      button.addEventListener('click', () => {
        dateInput.value = day.iso;
        hourInput.value = '';
        timeSection.hidden = false;
        doc.querySelector('[data-time-title]').textContent = `${day.day}일 시작시간 선택`;
        renderCalendar();
        renderHours();
        renderEstimate();
      });
      calendarGrid.append(button);
    }
  }

  function appendEstimateLine(container, labelText, priceText, className = '') {
    const line = doc.createElement('div');
    if (className) line.className = className;
    const label = doc.createElement('span');
    label.textContent = labelText;
    const price = doc.createElement('b');
    price.textContent = priceText;
    line.append(label, price);
    container.append(line);
  }

  function sumOptionsByCategory(estimate, category) {
    return estimate.options
      .filter((option) => option.category === category)
      .reduce((sum, option) => sum + option.price, 0);
  }

  function renderGroupedEstimate(estimate) {
    const applianceTotal = sumOptionsByCategory(estimate, 'appliance');
    const siteTotal = sumOptionsByCategory(estimate, 'site_extra');
    const discountTotal = estimate.discounts.reduce((sum, discount) => sum + Math.abs(discount.amount), 0);
    const quoteLabels = estimate.quoteItems.map((item) => item.label).join(', ') || '없음';

    doc.querySelector('[data-estimate-base]').textContent = formatWon(estimate.base);
    doc.querySelector('[data-estimate-appliance-total]').textContent = formatWon(applianceTotal);
    doc.querySelector('[data-estimate-site-total]').textContent = formatWon(siteTotal);
    doc.querySelector('[data-estimate-discounts]').textContent = discountTotal > 0 ? `-${formatWon(discountTotal)}` : '0원';
    doc.querySelector('[data-estimate-quote]').textContent = quoteLabels;
    doc.querySelector('[data-estimate-options]').textContent = formatWon(applianceTotal + siteTotal);
    doc.querySelector('[data-estimate-total]').textContent = formatWon(estimate.total);
  }

  function renderZeroEstimate() {
    doc.querySelector('[data-estimate-base]').textContent = '0원';
    doc.querySelector('[data-estimate-appliance-total]').textContent = '0원';
    doc.querySelector('[data-estimate-site-total]').textContent = '0원';
    doc.querySelector('[data-estimate-coupon-discount]').textContent = '0원';
    doc.querySelector('[data-estimate-discounts]').textContent = '0원';
    doc.querySelector('[data-estimate-quote]').textContent = '없음';
    doc.querySelector('[data-estimate-options]').textContent = '0원';
    doc.querySelector('[data-estimate-total]').textContent = '0원';
    doc.querySelector('[data-estimate-lines]').replaceChildren();
    doc.querySelector('[data-estimate-schedule]').textContent = '상담 후 선택';
    doc.querySelector('[data-estimate-error]').textContent = '';
  }

  function renderEstimate() {
    const errorOutput = doc.querySelector('[data-estimate-error]');
    if (!catalog) {
      renderZeroEstimate();
      return;
    }
    const area = Number(form.elements.area.value);
    const packageId = form.elements.packageId.value;
    if (!Number.isFinite(area) || area < 1 || !packageId) {
      renderZeroEstimate();
      return;
    }
    if (area < 16) {
      renderZeroEstimate();
      errorOutput.textContent = '공급면적은 최소 16평 이상 입력해주세요.';
      return;
    }
    try {
      const values = collectFormValues(form);
      const estimate = estimateFromFormValues(values, catalog);
      renderGroupedEstimate(estimate);
      const lines = doc.querySelector('[data-estimate-lines]');
      lines.replaceChildren();
      estimate.options.forEach((option) => appendEstimateLine(lines, option.label, `+${formatWon(option.price)}`));
      estimate.quoteItems.forEach((item) => appendEstimateLine(lines, item.label, '별도 상담', 'estimate-quote'));
      const schedule = values.date
        ? `${values.date.replaceAll('-', '.')} ${createHourChoices().find((choice) => String(choice.hour) === String(values.hour))?.label || '시간 선택 전'}`
        : '날짜 선택 전';
      doc.querySelector('[data-estimate-schedule]').textContent = schedule;
      errorOutput.textContent = '';
    } catch {
      renderZeroEstimate();
      errorOutput.textContent = '평수 입력 후 예상 견적을 확인할 수 있습니다.';
    }
  }

  function renderKeyFollowups() {
    const source = form.elements.keyHandoverSource.value;
    doc.querySelectorAll('[data-key-followup]').forEach((section) => {
      section.hidden = section.dataset.keyFollowup !== source;
    });
  }

  function validateCurrentStep() {
    const output = doc.querySelector(`[data-step-error="${currentStep}"]`);
    if (!output) return true;
    output.textContent = '';
    if (currentStep === 'checkout' && !form.elements.checkoutMode.value) {
      output.textContent = '비회원 또는 회원 주문을 선택해주세요.';
      return false;
    }
    if (currentStep === 'service') {
      if (!catalog) {
        output.textContent = '가격 정보를 먼저 불러와주세요.';
        return false;
      }
      const area = Number(form.elements.area.value);
      const packageId = form.elements.packageId.value;
      if (!Number.isFinite(area) || area < 16 || area > 300 || !packageId) {
        output.textContent = '공급면적 16평 이상을 입력하고 청소 패키지를 선택해주세요.';
        return false;
      }
    }
    if (currentStep === 'schedule' && (!dateInput.value || !hourInput.value)) {
      output.textContent = '희망 날짜와 시작시간을 모두 선택해주세요.';
      return false;
    }
    return true;
  }

  async function loadCatalog() {
    setPriceState('loading', '가격 정보를 불러오는 중입니다.');
    try {
      const client = await getSupabase();
      catalog = await loadPriceCatalog(client);
      renderOptionGroups();
      renderPackagePrices();
      setPriceState('ready', '적용 중인 최신 가격입니다.');
      renderEstimate();
    } catch {
      catalog = PRICE_CATALOG;
      renderOptionGroups();
      renderPackagePrices();
      setPriceState('fallback', '기본 가격표로 계산 중입니다. 최종 금액은 상담 후 확정됩니다.');
      renderEstimate();
    }
  }

  calendarPrev.addEventListener('click', () => { calendarView = shiftMonth(calendarView, -1); renderCalendar(); });
  doc.querySelector('[data-calendar-next]').addEventListener('click', () => { calendarView = shiftMonth(calendarView, 1); renderCalendar(); });
  doc.querySelectorAll('[data-next-step]').forEach((button) => button.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    const steps = availableSteps();
    showStep(steps[Math.min(steps.indexOf(currentStep) + 1, steps.length - 1)]);
  }));
  doc.querySelectorAll('[data-prev-step]').forEach((button) => button.addEventListener('click', () => {
    const steps = availableSteps();
    showStep(steps[Math.max(steps.indexOf(currentStep) - 1, 0)]);
  }));
  doc.querySelectorAll('[data-step-target]').forEach((button) => button.addEventListener('click', () => {
    if (availableSteps().includes(button.dataset.stepTarget)) showStep(button.dataset.stepTarget);
  }));
  estimateToggle.addEventListener('click', (event) => {
    const collapsed = estimateCard.dataset.collapsed !== 'true';
    estimateCard.dataset.collapsed = String(collapsed);
    event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    event.currentTarget.textContent = collapsed ? '펼치기' : '접기';
  });
  priceRetry.addEventListener('click', loadCatalog);
  couponInput?.addEventListener('input', () => {
    if (appliedCouponInput) appliedCouponInput.value = '';
    renderEstimate();
  });
  couponFill?.addEventListener('click', () => {
    const coupon = getRegisteredCoupon();
    if (!coupon) {
      couponStatus.textContent = '사용 가능한 쿠폰이 없습니다. 마이페이지에서 쿠폰을 등록해주세요.';
      return;
    }
    if (appliedCouponInput) appliedCouponInput.value = coupon.code;
    if (couponInput) couponInput.value = '';
    couponStatus.textContent = `${coupon.label}을 적용했습니다.`;
    renderEstimate();
  });

  form.addEventListener('change', (event) => {
    memberNotice.hidden = form.elements.checkoutMode.value !== 'member';
    if (event.target.name === 'serviceType') renderPackagePrices();
    if (event.target.name === 'keyHandoverSource') renderKeyFollowups();
    renderEstimate();
  });
  form.addEventListener('input', renderEstimate);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!catalog) {
      status.textContent = '가격 정보를 먼저 불러와주세요.';
      return;
    }
    status.textContent = '신청 내용을 확인하고 있습니다.';
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const values = collectFormValues(form);
      if (values.checkoutMode === 'member') {
        const session = await getSession();
        values.memberId = session?.user?.id || '';
      }
      const draft = validateOrderDraft(values, catalog);
      draft.idempotencyKey = crypto.randomUUID();
      const client = await getSupabase();
      const data = await submitCleaningOrder(client, draft);
      await syncMemberProfile(client, values);
      if (draft.couponCode) consumeRegisteredCoupon();
      status.textContent = `신청이 접수되었습니다. 접수번호 ${data.receiptNumber} · 관리자가 연락 후 최종 확정합니다.`;
      form.reset();
      if (loggedIn) form.elements.checkoutMode.value = 'member';
      dateInput.value = '';
      hourInput.value = '';
      timeSection.hidden = true;
      calendarView = localDateParts(today);
      showStep(loggedIn ? 'service' : 'checkout');
      renderKeyFollowups();
      renderCalendar();
      renderHours();
      renderEstimate();
    } catch (error) {
      status.textContent = error?.message || '신청을 접수하지 못했습니다. 입력 내용을 확인해주세요.';
    } finally {
      submit.disabled = !catalog;
    }
  });

  memberNotice.hidden = loggedIn || form.elements.checkoutMode.value !== 'member';
  estimateCard.dataset.collapsed = String(shouldCollapseEstimate(globalThis.innerWidth || 1024));
  estimateToggle.setAttribute('aria-expanded', String(estimateCard.dataset.collapsed !== 'true'));
  estimateToggle.textContent = estimateCard.dataset.collapsed === 'true' ? '펼치기' : '접기';
  renderKeyFollowups();
  renderCalendar();
  renderHours();
  showStep(loggedIn ? 'service' : 'checkout', false);
  renderEstimate();
  await loadCatalog();
}

if (typeof document !== 'undefined') initOrderForm();
