import { assertConfirmedRange } from '../orders/schedule.js';

export function adminAccessDecision(session, role) {
  if (!session) return { allowed: false, redirectTo: 'auth.html?next=admin.html' };
  if (role !== 'admin') return { allowed: false, redirectTo: 'mypage.html' };
  return { allowed: true, redirectTo: null };
}

export function normalizeBookingConfirmation(orderId, startsAt, endsAt) {
  const id = String(orderId || '').trim();
  if (!id) throw new Error('Choose an order');
  const range = assertConfirmedRange(startsAt, endsAt);
  return { orderId: id, startsAt: range.start, endsAt: range.end };
}

export function formatOrderStatus(status) {
  return ({
    new: '신규 접수', contact_pending: '연락 대기', estimate_sent: '견적 안내',
    booking_confirmed: '예약 확정', payment_requested: '선결제 대기', paid: '선결제 완료',
    work_completed: '작업 완료', review_requested: '후기 요청',
    hold_expired_contact_needed: '선점 만료·연락 필요', cancelled: '취소',
  })[status] || status;
}
