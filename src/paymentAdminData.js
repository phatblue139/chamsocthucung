export const PAYMENT_STATUS_PAID = "Đã thanh toán";
export const PAYMENT_STATUS_PENDING = "Chờ thanh toán";
export const PAYMENT_STATUS_UNPAID = PAYMENT_STATUS_PENDING;
export const PAYMENT_STATUS_FAILED = "Thanh toán thất bại";
export const PAYMENT_STATUS_REFUNDED = "Đã hoàn tiền";

export function getPaymentAmount(schedule) {
  const paymentAmount = Number(schedule?.payment?.amount);
  if (Number.isFinite(paymentAmount) && paymentAmount >= 0) return paymentAmount;
  return Math.max(0, Number(schedule?.price || 0) + Number(schedule?.shipping?.totalFee || 0));
}

export function getPaymentBreakdown(schedule) {
  const serviceAmount = Math.max(0, Number(schedule?.price) || 0);
  const shippingFee = Math.max(0, Number(schedule?.shipping?.totalFee) || 0);
  const totalAmount = getPaymentAmount(schedule);

  return {
    serviceAmount,
    shippingFee,
    additionalFees: Math.max(0, totalAmount - serviceAmount - shippingFee),
    totalAmount,
  };
}

export function getPaymentStatus(schedule) {
  const status = String(schedule?.payment?.status || "").trim().toLowerCase();
  if ([PAYMENT_STATUS_PAID.toLowerCase(), "paid"].includes(status)) return PAYMENT_STATUS_PAID;
  if ([PAYMENT_STATUS_FAILED.toLowerCase(), "failed", "thất bại"].includes(status)) return PAYMENT_STATUS_FAILED;
  if ([PAYMENT_STATUS_REFUNDED.toLowerCase(), "refunded", "hoàn tiền"].includes(status)) return PAYMENT_STATUS_REFUNDED;
  return PAYMENT_STATUS_PENDING;
}

export function getPaymentStatusClass(status) {
  switch (status) {
    case PAYMENT_STATUS_PAID: return "is-paid";
    case PAYMENT_STATUS_FAILED: return "is-failed";
    case PAYMENT_STATUS_REFUNDED: return "is-refunded";
    default: return "is-pending";
  }
}

export function filterPayments(schedules, {
  query = "",
  status = "all",
  method = "all",
  dateField = "booking",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase("vi");
  if (dateFrom && dateTo && dateFrom > dateTo) return [];

  return (Array.isArray(schedules) ? schedules : []).filter((schedule) => {
    if (status !== "all" && getPaymentStatus(schedule) !== status) return false;

    const scheduleMethod = String(schedule?.payment?.method || "");
    if (method === "unknown" ? Boolean(scheduleMethod) : method !== "all" && scheduleMethod !== method) return false;

    const searchable = [
      schedule?.id,
      schedule?.payment?.transactionId,
      schedule?.customerName,
      schedule?.customerUsername,
      schedule?.customerPhone || schedule?.ownerPhone,
      schedule?.petName,
      schedule?.careType,
    ].join(" ").toLocaleLowerCase("vi");
    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;

    const rawDate = dateField === "payment" ? schedule?.payment?.paidAt : schedule?.date;
    const date = getFilterDate(rawDate);
    if ((dateFrom || dateTo) && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  }).sort((left, right) =>
    String(right.createdAt || right.date || "").localeCompare(String(left.createdAt || left.date || "")),
  );
}

function getFilterDate(value) {
  const dateValue = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  const parsedDate = new Date(dateValue);
  if (!dateValue || Number.isNaN(parsedDate.getTime())) return "";
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildPaymentCsv(schedules) {
  const rows = [
    [
      "Mã lịch",
      "Mã giao dịch",
      "Ngày đặt lịch",
      "Ngày thanh toán",
      "Khách hàng",
      "Tài khoản",
      "Số điện thoại",
      "Thú cưng",
      "Dịch vụ",
      "Phương thức",
      "Giá dịch vụ",
      "Phí vận chuyển",
      "Phụ phí khác",
      "Tổng tiền",
      "Trạng thái",
      "Người xác nhận",
    ],
    ...(Array.isArray(schedules) ? schedules : []).map((schedule) => {
      const breakdown = getPaymentBreakdown(schedule);
      const services = Array.isArray(schedule?.petServices) && schedule.petServices.length
        ? schedule.petServices.map((item) =>
          `${item.petName || "Thú cưng"}: ${Array.isArray(item.services) ? item.services.join(", ") : "Chăm sóc"}`,
        ).join(" | ")
        : String(schedule?.careType || "Chăm sóc");
      return [
        schedule?.id ? `#${schedule.id}` : "",
        schedule?.payment?.transactionId || "",
        schedule?.date || "",
        schedule?.payment?.paidAt || "",
        schedule?.customerName || schedule?.customerUsername || "",
        schedule?.customerUsername || "",
        schedule?.customerPhone || schedule?.ownerPhone || "",
        schedule?.petName || "",
        services,
        schedule?.payment?.method || "",
        breakdown.serviceAmount,
        breakdown.shippingFee,
        breakdown.additionalFees,
        breakdown.totalAmount,
        getPaymentStatus(schedule),
        schedule?.payment?.receivedBy || "",
      ];
    }),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

function escapeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function getPaymentStatistics(schedules) {
  const transactions = Array.isArray(schedules) ? schedules : [];
  const statistics = {
    receivedRevenue: 0,
    outstandingAmount: 0,
    paidTransactions: 0,
    unpaidTransactions: 0,
    failedTransactions: 0,
    refundedTransactions: 0,
  };

  transactions.forEach((schedule) => {
    const amount = getPaymentAmount(schedule);
    const status = getPaymentStatus(schedule);
    if (status === PAYMENT_STATUS_PAID) {
      statistics.receivedRevenue += amount;
      statistics.paidTransactions += 1;
    } else if (status === PAYMENT_STATUS_PENDING) {
      statistics.outstandingAmount += amount;
      statistics.unpaidTransactions += 1;
    } else if (status === PAYMENT_STATUS_FAILED) {
      statistics.outstandingAmount += amount;
      statistics.failedTransactions += 1;
    } else if (status === PAYMENT_STATUS_REFUNDED) {
      statistics.refundedTransactions += 1;
    }
  });

  return statistics;
}

export function confirmPaymentReceived(schedule, adminUsername = "admin", paidAt = new Date().toISOString()) {
  const existingPayment = schedule?.payment && typeof schedule.payment === "object" ? schedule.payment : {};
  const transactionId = existingPayment.transactionId ||
    `PAY-${String(schedule?.id || "NA").padStart(6, "0")}-${Date.parse(paidAt).toString(36).toUpperCase()}`;
  return {
    ...schedule,
    payment: {
      ...existingPayment,
      amount: getPaymentAmount(schedule),
      status: PAYMENT_STATUS_PAID,
      paidAt,
      receivedBy: String(adminUsername || "admin"),
      transactionId,
      statusChangedAt: paidAt,
      statusChangedBy: String(adminUsername || "admin"),
    },
  };
}

export function updatePaymentStatus(schedule, nextStatus, adminUsername = "admin", changedAt = new Date().toISOString()) {
  const allowedStatuses = [
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_REFUNDED,
  ];
  if (!allowedStatuses.includes(nextStatus)) return null;

  const currentStatus = getPaymentStatus(schedule);
  const allowedTransitions = {
    [PAYMENT_STATUS_PENDING]: [PAYMENT_STATUS_FAILED],
    [PAYMENT_STATUS_FAILED]: [PAYMENT_STATUS_PENDING],
    [PAYMENT_STATUS_PAID]: [PAYMENT_STATUS_REFUNDED],
    [PAYMENT_STATUS_REFUNDED]: [],
  };
  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) return null;

  const username = String(adminUsername || "admin");
  const payment = {
    ...(schedule?.payment && typeof schedule.payment === "object" ? schedule.payment : {}),
    status: nextStatus,
    statusChangedAt: changedAt,
    statusChangedBy: username,
  };
  if (nextStatus === PAYMENT_STATUS_FAILED) {
    payment.failedAt = changedAt;
    payment.failedBy = username;
  }
  if (nextStatus === PAYMENT_STATUS_PENDING) {
    payment.retryRequestedAt = changedAt;
    payment.retryRequestedBy = username;
  }
  if (nextStatus === PAYMENT_STATUS_REFUNDED) {
    payment.refundedAt = changedAt;
    payment.refundedBy = username;
  }

  return { ...schedule, payment };
}