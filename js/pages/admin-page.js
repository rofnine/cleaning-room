import { getSession, signOut } from '../auth/auth-service.js';
import { getSupabase } from '../lib/supabase.js';
import { adminAccessDecision, formatOrderStatus, normalizeBookingConfirmation } from '../admin/admin-domain.js';
import { buildMonthCalendar, keyHandoverAlert, normalizePriceUpdate } from '../admin/admin-dashboard.js';
import { buildOperationsSummary, buildSettlementRows, buildTeamUtilization, normalizeTaxInvoiceRequest } from '../admin/operations-domain.js';

const VIEW_TITLES = Object.freeze({ dashboard: '통합 대시보드', orders: '발주 관리', calendar: '예약 캘린더', payments: '결제·정산', 'tax-invoices': '세금계산서', resources: '작업팀 운영', inquiries: '문의 관리', reviews: '후기 관리', prices: '가격 관리' });
const CATEGORY_LABELS = Object.freeze({ package: '기본 청소', appliance: '가전 청소', site_extra: '추가 케어' });
const MODE_LABELS = Object.freeze({ per_area: '평당', per_area_minimum: '평당·최소', fixed: '고정', bundle: '묶음', quote: '별도 상담' });
let orders = [];
let adminClient = null;
let calendarDate = new Date();
let adminUserId = null;
let payments = [];
let settlementRecords = [];
let taxInvoices = [];
let teamAssignments = [];
let teamProfiles = [];
let operationsReady = true;
let orderAutoRefreshTimer = null;
let inquiryAutoRefreshTimer = null;

function safe(value) { return String(value ?? ''); }
function won(value) { return `${Number(value || 0).toLocaleString('ko-KR')}원`; }
function dateText(value) { return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value)) : '상담 후 결정'; }
function dayKey(value) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
function tableMessage(body, columns, message) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = columns; cell.textContent = message; row.append(cell); body.replaceChildren(row); }
function statusPill(text, tone = '') { const span = document.createElement('span'); span.className = `status-pill${tone ? ` ${tone}` : ''}`; span.textContent = text; return span; }
function formatInquiryStatus(status) { return ({ received: '접수 완료', answered: '답변 완료', closed: '종료', cancelled: '취소됨' })[status] || status || '확인 중'; }

async function loadOrders() {
  const { data, error } = await adminClient.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  orders = data || [];
  renderOrders();
  renderCalendar();
}

function startOrderAutoRefresh() {
  if (orderAutoRefreshTimer) clearInterval(orderAutoRefreshTimer);
  orderAutoRefreshTimer = setInterval(async () => {
    try {
      await loadOrders();
    } catch {
      // 다음 주기에서 다시 시도합니다. 관리자 화면을 방해하지 않습니다.
    }
  }, 30000);
}

function startInquiryAutoRefresh() {
  if (inquiryAutoRefreshTimer) clearInterval(inquiryAutoRefreshTimer);
  inquiryAutoRefreshTimer = setInterval(async () => {
    try {
      const activeView = document.querySelector('[data-admin-view="inquiries"]');
      if (!activeView?.hidden) await loadInquiries();
    } catch {
      // 다음 주기에서 다시 시도합니다.
    }
  }, 30000);
}

function renderOrders() {
  const body = document.querySelector('[data-order-rows]');
  const query = document.querySelector('[data-order-search]').value.trim().toLowerCase();
  const status = document.querySelector('[data-order-status-filter]').value;
  const filtered = orders.filter((order) => {
    const haystack = `${order.receipt_number} ${order.contact_name} ${order.contact_phone}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!status || order.status === status);
  });
  body.replaceChildren();
  if (!filtered.length) return tableMessage(body, 8, '조건에 맞는 신청이 없습니다.');
  for (const order of filtered) {
    const row = document.createElement('tr');
    const values = [order.receipt_number, order.contact_name, order.kind === 'booking' ? '예약' : '상담', order.package_id, dateText(order.preferred_start)];
    values.forEach((value) => { const cell = document.createElement('td'); cell.textContent = safe(value); row.append(cell); });
    const handover = document.createElement('td'); handover.textContent = keyHandoverAlert(order); handover.classList.toggle('handover-alert', handover.textContent !== '확인 완료'); row.append(handover);
    const state = document.createElement('td'); state.textContent = formatOrderStatus(order.status); row.append(state);
    const action = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.textContent = '상세'; button.dataset.orderId = order.id; action.append(button); row.append(action); body.append(row);
  }
  const today = dayKey(new Date());
  document.querySelector('[data-kpi="new"]').textContent = orders.filter((item) => item.status === 'new').length;
  document.querySelector('[data-kpi="contact"]').textContent = orders.filter((item) => item.status === 'contact_pending').length;
  document.querySelector('[data-kpi="confirmed"]').textContent = orders.filter((item) => item.status === 'booking_confirmed').length;
  document.querySelector('[data-kpi="today"]').textContent = orders.filter((item) => item.preferred_start && dayKey(item.preferred_start) === today && !['cancelled'].includes(item.status)).length;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  document.querySelector('[data-calendar-title]').textContent = `${year}년 ${monthIndex + 1}월`;
  const grid = document.querySelector('[data-calendar-grid]');
  grid.replaceChildren(...buildMonthCalendar(year, monthIndex, orders).map((cell) => {
    const day = document.createElement('article');
    day.className = `calendar-day${cell.inMonth ? '' : ' is-outside'}`;
    const number = document.createElement('span'); number.className = 'calendar-day-number'; number.textContent = cell.day; day.append(number);
    cell.orders.forEach((order) => {
      const item = document.createElement('button'); item.type = 'button'; item.className = `calendar-order${order.status === 'booking_confirmed' ? ' is-confirmed' : ''}`; item.dataset.orderId = order.id; item.textContent = `${dateText(order.preferred_start).split(' ').at(-1)} ${order.contact_name}`; day.append(item);
    });
    return day;
  }));
}

function openOrder(orderId) {
  const order = orders.find((item) => item.id === orderId); if (!order) return;
  const detail = document.querySelector('[data-order-detail]'); detail.replaceChildren();
  const title = document.createElement('h2'); title.textContent = `${order.receipt_number} · ${order.contact_name}`; detail.append(title);
  const grid = document.createElement('div'); grid.className = 'order-detail-grid';
  const details = [['연락처', order.contact_phone], ['이메일', order.contact_email], ['주소', `${order.district} ${order.address_full} ${order.address_detail || ''}`], ['패키지', order.package_id], ['예상 견적', won(order.estimated_amount)], ['키 인계', keyHandoverAlert(order)], ['요청사항', order.notes || '-']];
  details.forEach(([label, value]) => { const item = document.createElement('div'); const name = document.createElement('span'); name.textContent = label; const content = document.createElement('strong'); content.textContent = safe(value); item.append(name, content); grid.append(item); }); detail.append(grid);
  const form = document.querySelector('[data-confirm-booking]'); form.elements.orderId.value = order.id; form.elements.finalAmount.value = order.final_amount || order.estimated_amount || '';
  const assignmentForm = document.querySelector('[data-team-assignment]');
  const assignment = teamAssignments.find((item) => item.order_id === order.id);
  assignmentForm.elements.orderId.value = order.id;
  assignmentForm.elements.teamUserId.value = assignment?.team_user_id || '';
  assignmentForm.elements.status.value = assignment?.status || 'planned';
  const start = assignment?.starts_at || order.preferred_start;
  const end = assignment?.ends_at || (start ? new Date(new Date(start).getTime() + 2 * 3600000).toISOString() : null);
  assignmentForm.elements.startsAt.value = start ? new Date(start).toISOString().slice(0, 16) : '';
  assignmentForm.elements.endsAt.value = end ? new Date(end).toISOString().slice(0, 16) : '';
  document.querySelector('[data-order-dialog]').showModal();
}

async function safeRows(table, select = '*', orderBy = 'created_at') {
  let query = adminClient.from(table).select(select);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query.limit(500);
  if (error) { operationsReady = false; return []; }
  return data || [];
}

function renderSettlementRows(target, rows, limit = rows.length) {
  target.replaceChildren();
  if (!rows.length) return tableMessage(target, target === document.querySelector('[data-settlement-rows]') ? 9 : 6, operationsReady ? '정산 내역이 없습니다.' : '운영 데이터베이스 적용 후 표시됩니다.');
  rows.slice(0, limit).forEach((item) => {
    const row = document.createElement('tr');
    const values = [item.receiptNumber, item.customerName, won(item.expectedAmount), won(item.paidAmount)];
    if (target === document.querySelector('[data-settlement-rows]')) values.push(won(item.refundAmount), won(item.outstandingAmount), item.settlementStatus === 'completed' ? '정산 완료' : item.settlementStatus === 'partial' ? '일부 결제' : '결제 대기', invoiceLabel(item.invoiceStatus));
    else values.push(won(item.outstandingAmount), invoiceLabel(item.invoiceStatus));
    values.forEach((value, index) => { const cell = document.createElement('td'); cell.textContent = value; if ([2, 3, 4, 5].includes(index)) cell.classList.add('money'); if (String(value).includes('미수') || (index === 4 && item.outstandingAmount > 0)) cell.classList.add('outstanding'); row.append(cell); });
    if (target === document.querySelector('[data-settlement-rows]')) { const action = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.dataset.settlementOrder = item.orderId; button.textContent = '정산 설정'; action.append(button); row.append(action); }
    target.append(row);
  });
}

function invoiceLabel(status) {
  return ({ none: '미발행', draft: '작성 중', ready: '발행 대기', test_issued: '테스트 발행', issue_requested: '발행 요청', issued: '발행 완료', nts_pending: '국세청 전송 대기', nts_sent: '국세청 전송 완료', failed: '발행 실패', cancelled: '취소' })[status] || status;
}

function renderTaxInvoices() {
  const body = document.querySelector('[data-tax-invoice-rows]'); body.replaceChildren();
  if (!taxInvoices.length) return tableMessage(body, 7, operationsReady ? '발행된 세금계산서가 없습니다.' : '운영 데이터베이스 적용 후 표시됩니다.');
  taxInvoices.forEach((item) => {
    const order = orders.find((row) => row.id === item.order_id);
    const row = document.createElement('tr');
    [item.provider_document_key || '-', order?.receipt_number || item.order_id.slice(0, 8), item.company_name, won(item.supply_amount), won(item.tax_amount), invoiceLabel(item.status), dateText(item.issued_at || item.created_at)].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
    body.append(row);
  });
}

function renderResources() {
  const rows = buildTeamUtilization(teamAssignments, teamProfiles);
  const container = document.querySelector('[data-resource-rows]'); const mini = document.querySelector('[data-dashboard-resources]');
  container.replaceChildren(); mini.replaceChildren();
  if (!rows.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = operationsReady ? '등록된 작업팀 계정이 없습니다.' : '운영 데이터베이스 적용 후 표시됩니다.'; container.append(empty); mini.append(empty.cloneNode(true)); return; }
  rows.forEach((item) => {
    const card = document.createElement('article'); card.className = 'resource-card';
    const head = document.createElement('header'); const title = document.createElement('h3'); title.textContent = item.name; head.append(title, statusPill(item.activeCount ? '투입 예정' : '대기', item.activeCount ? '' : 'is-complete'));
    const dl = document.createElement('dl'); [['배정 작업', `${item.assignedCount}건`], ['예정 시간', `${item.scheduledHours}시간`]].forEach(([label, value]) => { const div = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; div.append(dt, dd); dl.append(div); }); card.append(head, dl); container.append(card);
    const compact = document.createElement('div'); compact.className = 'mini-resource-row'; const text = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = item.name; const sub = document.createElement('span'); sub.textContent = `${item.assignedCount}건 · ${item.scheduledHours}시간`; text.append(strong, sub); compact.append(text, statusPill(item.activeCount ? '예정 있음' : '대기')); mini.append(compact);
  });
}

function populateOperationSelects() {
  const orderSelect = document.querySelector('[data-tax-invoice-form] [name="orderId"]');
  orderSelect.replaceChildren(new Option('주문 선택', ''));
  orders.filter((order) => Number(order.final_amount || order.estimated_amount) > 0).forEach((order) => orderSelect.append(new Option(`${order.receipt_number} · ${order.contact_name} · ${won(order.final_amount || order.estimated_amount)}`, order.id)));
  const teamSelect = document.querySelector('[data-team-assignment] [name="teamUserId"]');
  teamSelect.replaceChildren(new Option('팀 선택', ''));
  teamProfiles.forEach((profile) => teamSelect.append(new Option(profile.display_name || profile.email || '청소팀', profile.id)));
}

function renderOperations() {
  const rows = buildSettlementRows(orders, payments, settlementRecords, taxInvoices);
  const summary = buildOperationsSummary(orders, rows, taxInvoices);
  document.querySelector('[data-operations-kpi="contracted"]').textContent = won(summary.contractedAmount);
  document.querySelector('[data-operations-kpi="paid"]').textContent = won(summary.paidAmount);
  document.querySelector('[data-operations-kpi="outstanding"]').textContent = won(summary.outstandingAmount);
  document.querySelector('[data-operations-kpi="bookings"]').textContent = `${summary.confirmedBookings}건`;
  document.querySelector('[data-operations-kpi="invoices"]').textContent = `${summary.invoiceQueue}건`;
  renderSettlementRows(document.querySelector('[data-settlement-rows]'), rows);
  renderSettlementRows(document.querySelector('[data-dashboard-settlements]'), rows.filter((item) => item.outstandingAmount > 0 || !['nts_sent', 'test_issued'].includes(item.invoiceStatus)), 6);
  renderTaxInvoices(); renderResources(); populateOperationSelects();
}

async function loadOperationsData() {
  operationsReady = true;
  [payments, settlementRecords, taxInvoices, teamAssignments] = await Promise.all([
    safeRows('payment_orders', 'id,order_id,kind,amount,status,created_at'),
    safeRows('settlement_records'), safeRows('tax_invoices'), safeRows('team_assignments'),
  ]);
  const { data: profiles, error } = await adminClient.from('profiles').select('id,display_name,role').eq('role', 'team');
  if (error) operationsReady = false;
  teamProfiles = profiles || [];
  renderOperations();
}

function priceInput(name, row, type = 'number') {
  const input = document.createElement('input'); input.name = name; input.type = type;
  if (type === 'checkbox') input.checked = row[name] !== false;
  else { input.value = row[name] ?? ''; input.min = '0'; input.step = '1000'; }
  return input;
}

function renderPriceRows(rows) {
  const body = document.querySelector('[data-price-rows]'); body.replaceChildren();
  rows.forEach((price) => {
    const row = document.createElement('tr'); row.dataset.priceId = price.id; row.dataset.category = price.category;
    const category = document.createElement('td'); category.textContent = CATEGORY_LABELS[price.category] || price.category;
    const label = document.createElement('td'); label.textContent = price.label;
    const modeCell = document.createElement('td'); const mode = document.createElement('select'); mode.name = 'pricing_mode';
    Object.entries(MODE_LABELS).forEach(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; option.selected = price.pricing_mode === value; mode.append(option); }); modeCell.append(mode);
    const unit = document.createElement('td'); unit.append(priceInput('unit_price', price));
    const minimum = document.createElement('td'); minimum.append(priceInput('minimum_amount', price));
    const fixed = document.createElement('td'); fixed.append(priceInput('fixed_price', price));
    const publicCell = document.createElement('td'); publicCell.append(priceInput('public_visible', price, 'checkbox'));
    const activeCell = document.createElement('td'); activeCell.append(priceInput('active', price, 'checkbox'));
    const action = document.createElement('td'); const save = document.createElement('button'); save.type = 'button'; save.className = 'save-price'; save.dataset.savePrice = price.id; save.textContent = '저장'; action.append(save);
    row.append(category, label, modeCell, unit, minimum, fixed, publicCell, activeCell, action); body.append(row);
  });
}

async function loadPrices() {
  const body = document.querySelector('[data-price-rows]'); tableMessage(body, 9, '가격표를 불러오는 중입니다.');
  const { data, error } = await adminClient.from('price_catalog').select('id,category,label,unit_price,minimum_amount,fixed_price,pricing_mode,public_visible,sort_order,active,updated_at').order('sort_order', { ascending: true });
  if (error) throw error;
  renderPriceRows(data || []);
}

async function savePrice(button) {
  const row = button.closest('[data-price-id]'); const output = document.querySelector('[data-price-admin-status]');
  button.disabled = true; output.textContent = '가격을 저장하고 있습니다…';
  try {
    const payload = normalizePriceUpdate({
      id: row.dataset.priceId, category: row.dataset.category,
      pricing_mode: row.querySelector('[name="pricing_mode"]').value,
      unit_price: row.querySelector('[name="unit_price"]').value,
      minimum_amount: row.querySelector('[name="minimum_amount"]').value,
      fixed_price: row.querySelector('[name="fixed_price"]').value,
      public_visible: row.querySelector('[name="public_visible"]').checked,
      active: row.querySelector('[name="active"]').checked,
    });
    const { error } = await adminClient.from('price_catalog').update(payload).eq('id', row.dataset.priceId);
    if (error) throw error;
    output.textContent = '저장했습니다. 공개 가격표와 새 예약 견적에 반영됩니다.';
  } catch (error) { output.textContent = error?.message || '가격을 저장하지 못했습니다.'; }
  finally { button.disabled = false; }
}

async function loadPayments() {
  tableMessage(document.querySelector('[data-settlement-rows]'), 9, '결제와 정산 내역을 불러오는 중입니다.');
  await loadOperationsData();
}

async function loadInquiries() {
  const body = document.querySelector('[data-inquiry-rows]'); tableMessage(body, 5, '문의 내역을 불러오는 중입니다.');
  const { data, error } = await adminClient.from('inquiries').select('receipt_number,type,title,status,created_at').order('created_at', { ascending: false }).limit(200); if (error) throw error;
  body.replaceChildren(); if (!data?.length) return tableMessage(body, 5, '문의 내역이 없습니다.');
  data.forEach((item) => { const row = document.createElement('tr'); [item.type, item.title, item.receipt_number, formatInquiryStatus(item.status), dateText(item.created_at)].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }); body.append(row); });
}

async function loadReviews() {
  const body = document.querySelector('[data-review-rows]'); tableMessage(body, 5, '후기를 불러오는 중입니다.');
  const { data, error } = await adminClient.from('reviews').select('author_display,rating,content,created_at,review_replies(content)').order('created_at', { ascending: false }).limit(200); if (error) throw error;
  body.replaceChildren(); if (!data?.length) return tableMessage(body, 5, '등록된 후기가 없습니다.');
  data.forEach((item) => { const reply = Array.isArray(item.review_replies) ? item.review_replies[0] : item.review_replies; const row = document.createElement('tr'); [item.author_display, `${item.rating}점`, item.content, dateText(item.created_at), reply?.content || '답변 전'].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }); body.append(row); });
}

async function saveTeamAssignment(form) {
  const output = form.querySelector('[data-assignment-status]');
  try {
    const startsAt = new Date(form.elements.startsAt.value); const endsAt = new Date(form.elements.endsAt.value);
    if (!form.elements.teamUserId.value || !Number.isFinite(startsAt.getTime()) || endsAt <= startsAt) throw new Error('팀과 올바른 작업시간을 입력해주세요.');
    const payload = { order_id: form.elements.orderId.value, team_user_id: form.elements.teamUserId.value, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: form.elements.status.value, assigned_by: adminUserId };
    const { error } = await adminClient.from('team_assignments').upsert(payload, { onConflict: 'order_id' });
    if (error) throw error;
    output.textContent = '작업팀 배정을 저장했습니다.'; await loadOperationsData();
  } catch (error) { output.textContent = error?.message || '팀 배정을 저장하지 못했습니다.'; }
}

function openSettlement(orderId) {
  const form = document.querySelector('[data-settlement-form]'); const record = settlementRecords.find((item) => item.order_id === orderId) || {};
  form.elements.orderId.value = orderId; form.elements.adjustmentAmount.value = record.adjustment_amount || 0; form.elements.refundAmount.value = record.refund_amount || 0; form.elements.dueDate.value = record.due_date || ''; form.elements.status.value = record.status || 'pending'; form.elements.memo.value = record.memo || '';
  document.querySelector('[data-settlement-dialog]').showModal();
}

async function saveSettlement(form) {
  const output = form.querySelector('[data-settlement-status]');
  try {
    const payload = { order_id: form.elements.orderId.value, adjustment_amount: Number(form.elements.adjustmentAmount.value || 0), refund_amount: Number(form.elements.refundAmount.value || 0), due_date: form.elements.dueDate.value || null, status: form.elements.status.value, memo: form.elements.memo.value.trim(), updated_by: adminUserId };
    if (!Number.isInteger(payload.adjustment_amount) || !Number.isInteger(payload.refund_amount) || payload.refund_amount < 0) throw new Error('조정·환불 금액을 확인해주세요.');
    const { error } = await adminClient.from('settlement_records').upsert(payload, { onConflict: 'order_id' }); if (error) throw error;
    output.textContent = '정산 조건을 저장했습니다.'; await loadOperationsData();
  } catch (error) { output.textContent = error?.message || '정산 조건을 저장하지 못했습니다.'; }
}

function updateInvoiceTotal(form) {
  const supply = Number(form.elements.supplyAmount.value || 0);
  const tax = form.elements.taxAmount.value === '' ? Math.round(supply * .1) : Number(form.elements.taxAmount.value || 0);
  document.querySelector('[data-tax-invoice-total]').textContent = won(Math.max(0, supply + tax));
}

async function issueTaxInvoice(form) {
  const output = form.querySelector('[data-tax-invoice-status]');
  try {
    const payload = normalizeTaxInvoiceRequest(Object.fromEntries(new FormData(form)));
    output.textContent = '테스트 세금계산서를 발행하고 있습니다…';
    const { data, error } = await adminClient.functions.invoke('admin-tax-invoice', { body: payload });
    if (error) throw error;
    output.textContent = `테스트 발행 완료 · ${data.documentKey}`;
    await loadOperationsData();
  } catch (error) { output.textContent = error?.message || '세금계산서를 발행하지 못했습니다.'; }
}

async function showView(name) {
  document.querySelectorAll('[data-admin-view]').forEach((view) => { const active = view.dataset.adminView === name; view.hidden = !active; view.classList.toggle('is-active', active); });
  document.querySelectorAll('[data-admin-nav]').forEach((button) => button.classList.toggle('active', button.dataset.adminNav === name));
  document.querySelector('[data-admin-title]').textContent = VIEW_TITLES[name];
  try {
    if (name === 'dashboard') await loadOperationsData();
    if (name === 'prices') await loadPrices();
    if (name === 'payments') await loadPayments();
    if (name === 'tax-invoices' || name === 'resources') await loadOperationsData();
    if (name === 'inquiries') await loadInquiries();
    if (name === 'reviews') await loadReviews();
    if (name === 'calendar') renderCalendar();
  } catch (error) { document.querySelector('[data-admin-title]').textContent = error?.message || '데이터를 불러오지 못했습니다.'; }
}

function setAdminDrawerOpen(open) {
  const shell = document.querySelector('[data-admin-shell]');
  const overlay = document.querySelector('[data-admin-drawer-overlay]');
  const toggle = document.querySelector('[data-admin-menu-toggle]');
  shell?.classList.toggle('drawer-open', open);
  if (overlay) overlay.hidden = !open;
  toggle?.setAttribute('aria-expanded', String(open));
  toggle?.setAttribute('aria-label', open ? '관리자 메뉴 닫기' : '관리자 메뉴 열기');
}

function bindEvents() {
  document.querySelector('[data-admin-menu-toggle]')?.addEventListener('click', () => {
    const shell = document.querySelector('[data-admin-shell]');
    setAdminDrawerOpen(!shell?.classList.contains('drawer-open'));
  });
  document.querySelector('[data-admin-drawer-overlay]')?.addEventListener('click', () => setAdminDrawerOpen(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setAdminDrawerOpen(false); });
  document.querySelectorAll('[data-admin-nav]').forEach((button) => button.addEventListener('click', () => {
    setAdminDrawerOpen(false);
    showView(button.dataset.adminNav);
  }));
  document.querySelector('[data-refresh-orders]').addEventListener('click', loadOrders);
  document.querySelector('[data-refresh-prices]').addEventListener('click', loadPrices);
  document.querySelector('[data-refresh-payments]').addEventListener('click', loadPayments);
  document.querySelector('[data-refresh-inquiries]').addEventListener('click', loadInquiries);
  document.querySelector('[data-refresh-reviews]').addEventListener('click', loadReviews);
  document.querySelector('[data-refresh-resources]').addEventListener('click', loadOperationsData);
  document.querySelector('[data-open-resources]').addEventListener('click', () => showView('resources'));
  document.querySelector('[data-open-settlements]').addEventListener('click', () => showView('payments'));
  document.querySelector('[data-open-tax-invoice]').addEventListener('click', () => document.querySelector('[data-tax-invoice-dialog]').showModal());
  document.querySelector('[data-order-search]').addEventListener('input', renderOrders);
  document.querySelector('[data-order-status-filter]').addEventListener('change', renderOrders);
  document.querySelector('[data-order-rows]').addEventListener('click', (event) => { const button = event.target.closest('button[data-order-id]'); if (button) openOrder(button.dataset.orderId); });
  document.querySelector('[data-settlement-rows]').addEventListener('click', (event) => { const button = event.target.closest('[data-settlement-order]'); if (button) openSettlement(button.dataset.settlementOrder); });
  document.querySelector('[data-calendar-grid]').addEventListener('click', (event) => { const button = event.target.closest('button[data-order-id]'); if (button) openOrder(button.dataset.orderId); });
  document.querySelector('[data-price-rows]').addEventListener('click', (event) => { const button = event.target.closest('[data-save-price]'); if (button) savePrice(button); });
  document.querySelector('[data-calendar-prev]').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); });
  document.querySelector('[data-calendar-next]').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); });
  document.querySelector('[data-confirm-booking]').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const output = form.querySelector('[data-confirm-status]'); try { const payload = normalizeBookingConfirmation(form.elements.orderId.value, new Date(form.elements.startsAt.value).toISOString(), new Date(form.elements.endsAt.value).toISOString()); payload.finalAmount = Number(form.elements.finalAmount.value || 0); const { error } = await adminClient.functions.invoke('admin-confirm-booking', { body: payload }); if (error) throw error; output.textContent = '예약을 확정했습니다.'; await loadOrders(); } catch (error) { output.textContent = error?.message || '예약을 확정하지 못했습니다.'; } });
  document.querySelector('[data-team-assignment]').addEventListener('submit', async (event) => { event.preventDefault(); await saveTeamAssignment(event.currentTarget); });
  document.querySelector('[data-settlement-form]').addEventListener('submit', async (event) => { event.preventDefault(); await saveSettlement(event.currentTarget); });
  const taxForm = document.querySelector('[data-tax-invoice-form]');
  taxForm.elements.orderId.addEventListener('change', () => { const order = orders.find((item) => item.id === taxForm.elements.orderId.value); const total = Number(order?.final_amount || order?.estimated_amount || 0); if (total > 0) { taxForm.elements.supplyAmount.value = Math.round(total / 1.1); taxForm.elements.taxAmount.value = total - Number(taxForm.elements.supplyAmount.value); updateInvoiceTotal(taxForm); } });
  taxForm.elements.supplyAmount.addEventListener('input', () => updateInvoiceTotal(taxForm));
  taxForm.elements.taxAmount.addEventListener('input', () => updateInvoiceTotal(taxForm));
  taxForm.addEventListener('submit', async (event) => { event.preventDefault(); await issueTaxInvoice(event.currentTarget); });
  document.querySelector('[data-admin-signout]').addEventListener('click', async () => { await signOut(); location.replace('./index.html'); });
}

async function initAdmin() {
  const status = document.querySelector('[data-admin-status]');
  try {
    const session = await getSession(); adminClient = await getSupabase(); let role = null;
    if (session) { const { data } = await adminClient.from('profiles').select('role').eq('id', session.user.id).maybeSingle(); role = data?.role; }
    const decision = adminAccessDecision(session, role); if (!decision.allowed) { location.replace(decision.redirectTo); return; }
    status.hidden = true; document.querySelector('[data-admin-shell]').hidden = false; document.querySelector('[data-admin-email]').textContent = session.user.email; adminUserId = session.user.id;
    bindEvents(); await loadOrders(); startOrderAutoRefresh(); startInquiryAutoRefresh(); await loadOperationsData();
  } catch (error) { status.textContent = error?.message || '관리자 화면을 불러오지 못했습니다.'; }
}

initAdmin();
