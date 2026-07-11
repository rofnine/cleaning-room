import { requireMember } from '../auth/auth-guards.js';
import { listCoupons, registerCouponCode } from '../auth/coupons.js';
import { getSupabase } from '../lib/supabase.js';

const ORDER_STATUS_LABELS = Object.freeze({
  new: '접수 완료',
  contact_pending: '연락 대기',
  estimate_sent: '견적 안내',
  booking_confirmed: '예약 확정',
  payment_requested: '결제 요청',
  paid: '결제 완료',
  work_completed: '작업 완료',
  review_requested: '후기 요청',
  hold_expired_contact_needed: '일정 재확인 필요',
  cancelled: '취소됨',
});

const INQUIRY_STATUS_LABELS = Object.freeze({
  received: '접수 완료',
  answered: '답변 완료',
  closed: '종료',
  cancelled: '취소됨',
});

const CANCELLABLE_ORDER_STATUSES = new Set([
  'new',
  'contact_pending',
  'estimate_sent',
  'booking_confirmed',
  'payment_requested',
  'hold_expired_contact_needed',
]);

const CANCELLABLE_INQUIRY_STATUSES = new Set(['received']);

function formatDate(value) {
  if (!value) return '발급일 확인 중';
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '발급일 확인 중';
  }
}

function formatDateTime(value) {
  if (!value) return '일정 상담 후 확정';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(value));
  } catch {
    return '일정 확인 중';
  }
}

function formatWon(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('ko-KR')}원` : '상담 후 확정';
}

function showRecordMessage(target, message) {
  if (!target) return;
  const empty = document.createElement('p');
  empty.className = 'member-record-empty';
  empty.textContent = message;
  target.replaceChildren(empty);
}

function createRecordMeta(items) {
  const wrap = document.createElement('dl');
  wrap.className = 'member-record-meta';
  items.forEach(([label, value]) => {
    const group = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value || '-';
    group.append(term, detail);
    wrap.append(group);
  });
  return wrap;
}

function createCancelButton(kind, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'member-cancel-button';
  button.dataset[kind === 'order' ? 'cancelOrder' : 'cancelInquiry'] = id;
  button.textContent = '취소하기';
  return button;
}

function renderCoupons() {
  const list = document.querySelector('[data-coupon-list]');
  if (!list) return;
  const coupons = listCoupons();
  list.replaceChildren();
  if (!coupons.length) {
    const empty = document.createElement('p');
    empty.className = 'coupon-empty';
    empty.textContent = '등록된 쿠폰이 없습니다. 쿠폰 코드가 있다면 직접 등록해 사용할 수 있습니다.';
    list.append(empty);
    return;
  }
  for (const coupon of coupons) {
    const card = document.createElement('article');
    card.className = 'coupon-card';
    card.innerHTML = `
      <span>${coupon.status || '사용 가능'}</span>
      <strong>${coupon.label || '할인 쿠폰'}</strong>
      <p>${coupon.rate || 10}% 할인 · ${formatDate(coupon.issuedAt)}</p>
      <small>예약 화면에서 쿠폰 적용 버튼을 누르거나 쿠폰 코드를 직접 입력해 사용할 수 있습니다.</small>
    `;
    list.append(card);
  }
}

function renderOrderList(orders = []) {
  const list = document.querySelector('[data-order-list]');
  if (!list) return;
  if (!orders.length) return showRecordMessage(list, '신청한 예약·상담 내역이 없습니다.');
  list.replaceChildren();
  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = `member-record-card${order.status === 'cancelled' ? ' is-cancelled' : ''}`;
    const header = document.createElement('div');
    header.className = 'member-record-head';
    const title = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.textContent = order.kind === 'booking' ? '희망일정 예약' : '견적 상담';
    const strong = document.createElement('strong');
    strong.textContent = order.receipt_number || '접수번호 확인 중';
    title.append(eyebrow, strong);
    const status = document.createElement('span');
    status.className = 'member-record-status';
    status.textContent = ORDER_STATUS_LABELS[order.status] || order.status || '확인 중';
    header.append(title, status);
    card.append(header);
    card.append(createRecordMeta([
      ['희망일정', formatDateTime(order.preferred_start)],
      ['서비스', order.package_id || order.service_type],
      ['견적금액', formatWon(order.final_amount || order.estimated_amount)],
      ['주소', [order.district, order.address_full].filter(Boolean).join(' ')],
    ]));
    const foot = document.createElement('div');
    foot.className = 'member-record-foot';
    const created = document.createElement('small');
    created.textContent = `신청일 ${formatDateTime(order.created_at)}`;
    foot.append(created);
    if (CANCELLABLE_ORDER_STATUSES.has(order.status)) foot.append(createCancelButton('order', order.id));
    card.append(foot);
    list.append(card);
  });
}

function renderInquiryList(inquiries = []) {
  const list = document.querySelector('[data-inquiry-list]');
  if (!list) return;
  if (!inquiries.length) return showRecordMessage(list, '접수한 문의 내역이 없습니다.');
  list.replaceChildren();
  inquiries.forEach((inquiry) => {
    const card = document.createElement('article');
    card.className = `member-record-card${inquiry.status === 'cancelled' ? ' is-cancelled' : ''}`;
    const header = document.createElement('div');
    header.className = 'member-record-head';
    const title = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.textContent = inquiry.type || '문의';
    const strong = document.createElement('strong');
    strong.textContent = inquiry.title || inquiry.receipt_number || '문의 제목 확인 중';
    title.append(eyebrow, strong);
    const status = document.createElement('span');
    status.className = 'member-record-status';
    status.textContent = INQUIRY_STATUS_LABELS[inquiry.status] || inquiry.status || '확인 중';
    header.append(title, status);
    card.append(header);
    card.append(createRecordMeta([
      ['접수번호', inquiry.receipt_number || '-'],
      ['접수일', formatDateTime(inquiry.created_at)],
      ['최근 변경', formatDateTime(inquiry.updated_at)],
    ]));
    const foot = document.createElement('div');
    foot.className = 'member-record-foot';
    const note = document.createElement('small');
    note.textContent = inquiry.status === 'cancelled' ? '취소 기록이 관리자 화면에 남아 있습니다.' : '관리자가 확인 후 답변합니다.';
    foot.append(note);
    if (CANCELLABLE_INQUIRY_STATUSES.has(inquiry.status)) foot.append(createCancelButton('inquiry', inquiry.id));
    card.append(foot);
    list.append(card);
  });
}

async function loadMemberOrders(client) {
  const list = document.querySelector('[data-order-list]');
  showRecordMessage(list, '주문내역을 불러오는 중입니다.');
  const { data, error } = await client
    .from('orders')
    .select('id,receipt_number,kind,status,service_type,package_id,preferred_start,estimated_amount,final_amount,district,address_full,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  renderOrderList(data || []);
}

async function loadMemberInquiries(client) {
  const list = document.querySelector('[data-inquiry-list]');
  showRecordMessage(list, '문의내역을 불러오는 중입니다.');
  const { data, error } = await client
    .from('inquiries')
    .select('id,receipt_number,type,title,status,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  renderInquiryList(data || []);
}

async function cancelMemberOrder(client, orderId, reason = 'customer_mypage_cancel') {
  const { data, error } = await client.rpc('cancel_customer_order', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
  return data;
}

async function cancelMemberInquiry(client, inquiryId, reason = 'customer_mypage_cancel') {
  const { data, error } = await client.rpc('cancel_customer_inquiry', { p_inquiry_id: inquiryId, p_reason: reason });
  if (error) throw error;
  return data;
}

function bindCancellationEvents(client) {
  document.querySelector('[data-order-list]')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cancel-order]');
    if (!button) return;
    if (!globalThis.confirm?.('이 신청을 취소할까요? 취소 기록은 관리자에게 남습니다.')) return;
    button.disabled = true;
    button.textContent = '취소 중';
    try {
      await cancelMemberOrder(client, button.dataset.cancelOrder);
      await loadMemberOrders(client);
    } catch (error) {
      button.disabled = false;
      button.textContent = error?.message || '취소 실패';
    }
  });
  document.querySelector('[data-inquiry-list]')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cancel-inquiry]');
    if (!button) return;
    if (!globalThis.confirm?.('이 문의를 취소할까요? 취소 기록은 관리자에게 남습니다.')) return;
    button.disabled = true;
    button.textContent = '취소 중';
    try {
      await cancelMemberInquiry(client, button.dataset.cancelInquiry);
      await loadMemberInquiries(client);
    } catch (error) {
      button.disabled = false;
      button.textContent = error?.message || '취소 실패';
    }
  });
}

function selectTab(targetId) {
  document.querySelectorAll('[data-account-tab]').forEach((item) => {
    item.setAttribute('aria-selected', String(item.getAttribute('aria-controls') === targetId));
  });
  document.querySelectorAll('[data-account-panel]').forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
}

function initTabs() {
  const hashTargets = {
    '#orders': 'panel-orders',
    '#coupons': 'panel-coupons',
    '#inquiries': 'panel-inquiries',
    '#profile': 'panel-profile',
  };
  const initial = hashTargets[location.hash] || 'panel-orders';
  selectTab(initial);
  document.querySelectorAll('[data-account-tab]').forEach((button) => {
    button.addEventListener('click', () => selectTab(button.getAttribute('aria-controls')));
  });
  window.addEventListener('hashchange', () => {
    if (hashTargets[location.hash]) selectTab(hashTargets[location.hash]);
  });
}

async function loadProfile(session) {
  const nameInput = document.querySelector('[data-profile-name]');
  const phoneInput = document.querySelector('[data-profile-phone]');
  const status = document.querySelector('[data-profile-status]');
  if (!nameInput || !phoneInput || !session?.user?.id) return;
  try {
    const client = await getSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('display_name,phone')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    nameInput.value = data?.display_name || '';
    phoneInput.value = data?.phone || '';
    if (status) status.textContent = data?.display_name || data?.phone ? '저장된 고객정보를 불러왔습니다.' : '';
  } catch {
    if (status) status.textContent = '회원정보를 불러오지 못했습니다. 저장은 다시 시도합니다.';
  }
}

function initProfileForm(session) {
  const form = document.querySelector('[data-profile-form]');
  const status = document.querySelector('[data-profile-status]');
  if (!form || !session?.user?.id) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const displayName = form.elements.displayName.value.trim();
    const phone = form.elements.phone.value.replace(/\D/g, '');
    if (submit) submit.disabled = true;
    if (status) status.textContent = '회원정보를 저장하고 있습니다.';
    try {
      const client = await getSupabase();
      const { error } = await client
        .from('profiles')
        .update({
          display_name: displayName || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);
      if (error) throw error;
      form.elements.phone.value = phone;
      if (status) status.textContent = '회원정보를 저장했습니다.';
    } catch (error) {
      if (status) status.textContent = error?.message || '회원정보를 저장하지 못했습니다.';
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

async function initMyPage() {
  const status = document.querySelector('[data-member-status]');
  try {
    const session = await requireMember();
    if (!session) return;
    status.textContent = `${session.user.email} 계정으로 로그인했습니다.`;
    document.querySelector('[data-account-shell]').hidden = false;
    initTabs();
    renderCoupons(session);
    initProfileForm(session);

    const client = await getSupabase();
    bindCancellationEvents(client);
    await Promise.all([
      loadProfile(session),
      loadMemberOrders(client),
      loadMemberInquiries(client),
    ]);

    document.querySelector('[data-coupon-register]')?.addEventListener('click', () => {
      const input = document.querySelector('[data-coupon-register-input]');
      const output = document.querySelector('[data-coupon-register-status]');
      try {
        const coupon = registerCouponCode(input.value, session.user.email);
        output.textContent = coupon.alreadyRegistered ? '이미 등록된 쿠폰입니다.' : '쿠폰을 등록했습니다.';
        input.value = '';
        renderCoupons(session);
      } catch (error) {
        output.textContent = error?.message || '쿠폰을 등록하지 못했습니다.';
      }
    });
  } catch (error) {
    status.textContent = error?.message || '회원 정보를 불러오지 못했습니다.';
  }
}

initMyPage();
