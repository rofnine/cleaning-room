function integer(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export function buildSettlementRows(orders = [], payments = [], records = [], invoices = []) {
  return orders.map((order) => {
    const record = records.find((item) => item.order_id === order.id) || {};
    const paidAmount = payments
      .filter((item) => item.order_id === order.id && item.status === 'paid')
      .reduce((sum, item) => sum + integer(item.amount), 0);
    const adjustmentAmount = integer(record.adjustment_amount);
    const refundAmount = integer(record.refund_amount);
    const expectedAmount = integer(order.final_amount ?? order.estimated_amount) + adjustmentAmount;
    const outstandingAmount = Math.max(0, expectedAmount - paidAmount + refundAmount);
    const settlementStatus = outstandingAmount === 0 ? 'completed' : paidAmount > 0 ? 'partial' : 'pending';
    const invoice = invoices.filter((item) => item.order_id === order.id).at(-1);
    return {
      orderId: order.id,
      receiptNumber: String(order.receipt_number || ''),
      customerName: String(order.contact_name || ''),
      expectedAmount,
      paidAmount,
      refundAmount,
      outstandingAmount,
      settlementStatus,
      invoiceStatus: invoice?.status || 'none',
    };
  });
}

export function buildOperationsSummary(orders = [], settlementRows = [], invoices = []) {
  return {
    contractedAmount: settlementRows.reduce((sum, row) => sum + integer(row.expectedAmount), 0),
    paidAmount: settlementRows.reduce((sum, row) => sum + integer(row.paidAmount) - integer(row.refundAmount), 0),
    outstandingAmount: settlementRows.reduce((sum, row) => sum + integer(row.outstandingAmount), 0),
    confirmedBookings: orders.filter((order) => order.status === 'booking_confirmed').length,
    invoiceQueue: invoices.filter((invoice) => ['draft', 'ready', 'failed'].includes(invoice.status)).length,
  };
}

export function normalizeTaxInvoiceRequest(input = {}) {
  const registrationNumber = String(input.registrationNumber || '').replace(/\D/g, '');
  if (registrationNumber.length !== 10) throw new Error('사업자번호 10자리를 확인해주세요.');
  const orderId = String(input.orderId || '').trim();
  const companyName = String(input.companyName || '').trim();
  const representativeName = String(input.representativeName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const supplyAmount = integer(input.supplyAmount);
  if (!orderId || !companyName || !representativeName) throw new Error('주문과 사업자 기본정보를 입력해주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('세금계산서 수신 이메일을 확인해주세요.');
  if (supplyAmount <= 0) throw new Error('공급가액은 0원보다 커야 합니다.');
  const taxAmount = input.taxAmount == null || input.taxAmount === '' ? Math.round(supplyAmount * 0.1) : integer(input.taxAmount);
  if (taxAmount < 0) throw new Error('세액을 확인해주세요.');
  return {
    orderId,
    registrationNumber,
    companyName,
    representativeName,
    address: String(input.address || '').trim(),
    businessType: String(input.businessType || '').trim(),
    businessItem: String(input.businessItem || '').trim(),
    email,
    supplyAmount,
    taxAmount,
    totalAmount: supplyAmount + taxAmount,
  };
}

export function buildTeamUtilization(assignments = [], teamProfiles = []) {
  return teamProfiles.map((profile) => {
    const rows = assignments.filter((item) => item.team_user_id === profile.id && item.status !== 'cancelled');
    const scheduledHours = rows.reduce((sum, item) => {
      const start = new Date(item.starts_at).getTime();
      const end = new Date(item.ends_at).getTime();
      return sum + (Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3600000 : 0);
    }, 0);
    return {
      teamId: profile.id,
      name: profile.display_name || profile.email || '청소팀',
      assignedCount: rows.length,
      activeCount: rows.filter((item) => ['assigned', 'in_progress'].includes(item.status)).length,
      scheduledHours: Math.round(scheduledHours * 10) / 10,
    };
  });
}

