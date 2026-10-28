export const PAYMENT_STATUS_PAID = "Đã thanh toán";
export const PAYMENT_STATUS_UNPAID = "Chưa thanh toán";

export function getPaymentAmount(schedule) {
  const paymentAmount = Number(schedule?.payment?.amount);
  if (Number.isFinite(paymentAmount) && paymentAmount >= 0) return paymentAmount;
  return Math.max(0, Number(schedule?.price || 0) + Number(schedule?.shipping?.totalFee || 0));
}

export function getPaymentStatus(schedule) {
  const status = String(schedule?.payment?.status || "").trim().toLowerCase();
  return status === PAYMENT_STATUS_PAID.toLowerCase() || status === "paid"
    ? PAYMENT_STATUS_PAID
    : PAYMENT_STATUS_UNPAID;
}

export function confirmPaymentReceived(schedule, adminUsername = "admin", paidAt = new Date().toISOString()) {
  const existingPayment = schedule?.payment && typeof schedule.payment === "object" ? schedule.payment : {};
  return {
    ...schedule,
    payment: {
      ...existingPayment,
      amount: getPaymentAmount(schedule),
      status: PAYMENT_STATUS_PAID,
      paidAt,
      receivedBy: String(adminUsername || "admin"),
    },
  };
}

export function revokePaymentReceived(schedule, adminUsername = "admin") {
  const existingPayment = schedule?.payment && typeof schedule.payment === "object" ? schedule.payment : {};
  return {
    ...schedule,
    payment: {
      ...existingPayment,
      amount: getPaymentAmount(schedule),
      status: PAYMENT_STATUS_UNPAID,
      paidAt: undefined,
      receivedBy: undefined,
    },
  };
}