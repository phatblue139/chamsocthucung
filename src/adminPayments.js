import { formatCurrency, loadSchedules, saveSchedules } from "./careScheduleData.js";
import { logout } from "./auth.js";
import {
  confirmPaymentReceived,
  buildPaymentCsv,
  filterPayments,
  getPaymentAmount,
  getPaymentBreakdown,
  getPaymentStatus,
  getPaymentStatusClass,
  getPaymentStatistics,
  updatePaymentStatus,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REFUNDED,
} from "./paymentAdminData.js";

const list = document.getElementById("paymentList");
const empty = document.getElementById("paymentEmpty");
const message = document.getElementById("paymentMessage");
const searchInput = document.getElementById("paymentSearch");
const filterInput = document.getElementById("paymentFilter");
const methodFilterInput = document.getElementById("paymentMethodFilter");
const dateFieldInput = document.getElementById("paymentDateField");
const dateFromInput = document.getElementById("paymentDateFrom");
const dateToInput = document.getElementById("paymentDateTo");
const exportButton = document.getElementById("exportPaymentsCsv");
const logoutButton = document.getElementById("logoutBtn");
const detailsDialog = document.getElementById("paymentDetailsDialog");
const detailsContent = document.getElementById("paymentDetailsContent");
const detailsCloseButton = document.getElementById("paymentDetailsClose");
const detailsPrintButton = document.getElementById("paymentDetailsPrint");

logoutButton?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

searchInput?.addEventListener("input", render);
filterInput?.addEventListener("change", render);
methodFilterInput?.addEventListener("change", render);
dateFieldInput?.addEventListener("change", render);
dateFromInput?.addEventListener("change", render);
dateToInput?.addEventListener("change", render);
exportButton?.addEventListener("click", exportPayments);
window.addEventListener("storage", () => {
  render();
  if (detailsDialog.open && detailsDialog.dataset.scheduleId) {
    const schedule = loadSchedules().find((item) => String(item.id) === detailsDialog.dataset.scheduleId);
    if (schedule) renderPaymentDetails(schedule);
    else detailsDialog.close();
  }
});
detailsCloseButton.addEventListener("click", () => detailsDialog.close());
detailsPrintButton.addEventListener("click", () => window.print());
detailsDialog.addEventListener("click", (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});
render();

function render() {
  const schedules = loadSchedules();
  const statistics = getPaymentStatistics(schedules);
  document.getElementById("paidCount").textContent = String(statistics.paidTransactions);
  document.getElementById("unpaidCount").textContent = String(statistics.unpaidTransactions);
  document.getElementById("failedCount").textContent = String(statistics.failedTransactions);
  document.getElementById("refundedCount").textContent = String(statistics.refundedTransactions);
  document.getElementById("receivedRevenue").textContent = formatCurrency(statistics.receivedRevenue) || "0đ";
  document.getElementById("outstandingAmount").textContent = formatCurrency(statistics.outstandingAmount) || "0đ";

  const dateFrom = dateFromInput.value;
  const dateTo = dateToInput.value;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    showMessage("Ngày bắt đầu không được sau ngày kết thúc.", "error");
  } else if (message.textContent === "Ngày bắt đầu không được sau ngày kết thúc.") {
    showMessage("", "");
  }
  const visibleSchedules = filterPayments(schedules, {
    query: searchInput?.value || "",
    status: filterInput?.value === "all" ? "all" : ({
      paid: PAYMENT_STATUS_PAID,
      pending: PAYMENT_STATUS_PENDING,
      failed: PAYMENT_STATUS_FAILED,
      refunded: PAYMENT_STATUS_REFUNDED,
    }[filterInput?.value] || "all"),
    method: methodFilterInput?.value || "all",
    dateField: dateFieldInput?.value || "booking",
    dateFrom,
    dateTo,
  });

  list.replaceChildren();
  visibleSchedules.forEach((schedule) => list.appendChild(createPaymentRow(schedule)));
  empty.hidden = visibleSchedules.length > 0;
  exportButton.disabled = visibleSchedules.length === 0;
}

function createPaymentRow(schedule) {
  const row = document.createElement("tr");
  const methodLabel = getPaymentMethodLabel(schedule.payment?.method);
  const status = getPaymentStatus(schedule);
  const paymentBreakdown = getPaymentBreakdown(schedule);
  const cells = [
    `#${schedule.id ?? "-"}`,
    schedule.payment?.transactionId || "—",
    formatPaymentDate(schedule.date),
    formatPaymentDate(schedule.payment?.paidAt),
    `${schedule.customerName || schedule.customerUsername || "Khách hàng"}${schedule.customerUsername ? ` · @${schedule.customerUsername}` : ""}`,
    schedule.customerPhone || schedule.ownerPhone || "—",
    `${schedule.petName || "Thú cưng"} · ${schedule.careType || "Chăm sóc"}`,
    methodLabel,
    "",
    formatCurrency(getPaymentAmount(schedule)) || "0đ",
  ];
  cells.forEach((value, index) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (index === 8) appendPriceBreakdown(cell, schedule, paymentBreakdown);
    row.appendChild(cell);
  });

  const statusCell = document.createElement("td");
  const statusBadge = document.createElement("span");
  statusBadge.className = `payment-status-badge ${getPaymentStatusClass(status)}`;
  statusBadge.textContent = status;
  statusCell.appendChild(statusBadge);
  row.appendChild(statusCell);

  const actionCell = document.createElement("td");
  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "care-btn care-btn-edit payment-details-button";
  detailsButton.textContent = "Chi tiết";
  detailsButton.addEventListener("click", () => {
    renderPaymentDetails(schedule);
    detailsDialog.showModal();
  });
  actionCell.appendChild(detailsButton);
  const confirmerCell = document.createElement("td");
  confirmerCell.textContent = schedule.payment?.receivedBy || "—";
  if (status === PAYMENT_STATUS_PENDING) {
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "care-btn care-btn-add payment-confirm-button";
    confirmButton.textContent = "Xác nhận đã thu";
    confirmButton.addEventListener("click", () => markPaymentReceived(schedule.id));
    actionCell.appendChild(confirmButton);
    actionCell.appendChild(createStatusButton(schedule, PAYMENT_STATUS_FAILED, "Đánh dấu thất bại", "payment-failed-button"));
  } else if (status === PAYMENT_STATUS_FAILED) {
    actionCell.appendChild(createStatusButton(schedule, PAYMENT_STATUS_PENDING, "Cho thanh toán lại", "payment-retry-button"));
  } else if (status === PAYMENT_STATUS_PAID) {
    actionCell.appendChild(createStatusButton(schedule, PAYMENT_STATUS_REFUNDED, "Đánh dấu hoàn tiền", "payment-refund-button"));
  } else {
    actionCell.textContent = "Đã hoàn tiền";
  }
  row.appendChild(confirmerCell);
  row.appendChild(actionCell);
  return row;
}

function appendPriceBreakdown(cell, schedule, breakdown) {
  cell.classList.add("payment-price-breakdown");
  const lines = [
    ["Dịch vụ", breakdown.serviceAmount],
    ["Vận chuyển", breakdown.shippingFee],
  ];
  if (breakdown.additionalFees > 0) lines.push(["Phụ phí khác", breakdown.additionalFees]);
  if (Array.isArray(schedule.petServices)) {
    schedule.petServices.forEach((item) => {
      if (!item?.petName && !Array.isArray(item?.services)) return;
      const description = [
        item.petName,
        Array.isArray(item.services) ? item.services.join(", ") : "",
      ].filter(Boolean).join(": ");
      if (description) {
        const detail = document.createElement("small");
        detail.textContent = description;
        cell.appendChild(detail);
      }
    });
  }
  lines.forEach(([label, amount]) => {
    const line = document.createElement("span");
    line.textContent = `${label}: ${formatCurrency(amount) || "0đ"}`;
    cell.appendChild(line);
  });
}

function formatPaymentDate(value) {
  const dateValue = String(value || "").trim();
  if (!dateValue) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).toLocaleDateString("vi-VN");
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}

function formatPaymentDateTime(value) {
  const dateValue = String(value || "").trim();
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? formatPaymentDate(dateValue) : date.toLocaleString("vi-VN");
}

function getPaymentMethodLabel(method) {
  if (method === "wallet") return "Ví NEKO";
  if (method === "bank-transfer") return "Chuyển khoản";
  if (method === "at-center") return "Tại trung tâm";
  return method ? String(method) : "—";
}

function renderPaymentDetails(schedule) {
  detailsDialog.dataset.scheduleId = String(schedule.id);
  detailsContent.replaceChildren();

  const title = document.getElementById("paymentDetailsTitle");
  title.textContent = `Chi tiết hóa đơn #${schedule.id ?? "—"}`;

  const customer = createInvoiceSection("Thông tin lịch và khách hàng");
  customer.append(createInvoiceList([
    ["Mã lịch", schedule.id ? `#${schedule.id}` : "—"],
    ["Mã giao dịch", schedule.payment?.transactionId || "—"],
    ["Ngày đặt lịch", `${formatPaymentDate(schedule.date)}${schedule.time ? ` · ${schedule.time}` : ""}`],
    ["Khách hàng", schedule.customerName || schedule.customerUsername || "Khách hàng"],
    ["Tài khoản", schedule.customerUsername ? `@${schedule.customerUsername}` : "—"],
    ["Số điện thoại", schedule.customerPhone || schedule.ownerPhone || "—"],
  ]));

  const services = createInvoiceSection("Thú cưng và dịch vụ");
  services.append(createInvoiceServiceList(schedule));

  const breakdown = getPaymentBreakdown(schedule);
  const priceLines = createInvoiceList([
    ["Giá dịch vụ", formatCurrency(breakdown.serviceAmount) || "0đ"],
    ["Phí vận chuyển", formatCurrency(breakdown.shippingFee) || "0đ"],
    ["Phụ phí khác", formatCurrency(breakdown.additionalFees) || "0đ"],
  ]);
  const total = document.createElement("p");
  total.className = "admin-payment-invoice-total";
  const totalLabel = document.createElement("strong");
  totalLabel.textContent = "Tổng tiền";
  const totalValue = document.createElement("strong");
  totalValue.textContent = formatCurrency(breakdown.totalAmount) || "0đ";
  total.append(totalLabel, totalValue);
  const priceSection = createInvoiceSection("Chi tiết thanh toán");
  priceSection.append(priceLines, total);

  const status = getPaymentStatus(schedule);
  const statusBadge = document.createElement("span");
  statusBadge.className = `payment-status-badge ${getPaymentStatusClass(status)}`;
  statusBadge.textContent = status;
  const paymentSection = createInvoiceSection("Phương thức và trạng thái");
  paymentSection.append(createInvoiceList([
    ["Phương thức thanh toán", getPaymentMethodLabel(schedule.payment?.method)],
    ["Thời gian thanh toán", formatPaymentDateTime(schedule.payment?.paidAt)],
    ["Người xác nhận", schedule.payment?.receivedBy || "—"],
    ["Trạng thái giao dịch", ""],
  ]));
  paymentSection.querySelector("dd:last-child").append(statusBadge);
  detailsContent.append(customer, services, priceSection, paymentSection);
}

function createInvoiceSection(headingText) {
  const section = document.createElement("section");
  section.className = "admin-payment-invoice-section";
  const heading = document.createElement("h3");
  heading.textContent = headingText;
  section.append(heading);
  return section;
}

function createInvoiceList(entries) {
  const list = document.createElement("dl");
  list.className = "admin-payment-invoice-list";
  entries.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
  });
  return list;
}

function createInvoiceServiceList(schedule) {
  const list = document.createElement("div");
  list.className = "admin-payment-invoice-services";
  if (Array.isArray(schedule.petServices) && schedule.petServices.length) {
    schedule.petServices.forEach((petService) => {
      const entry = document.createElement("article");
      const heading = document.createElement("strong");
      heading.textContent = petService.petName || "Thú cưng";
      const serviceNames = document.createElement("p");
      serviceNames.textContent = Array.isArray(petService.services) && petService.services.length
        ? petService.services.join(", ")
        : "Chăm sóc theo yêu cầu";
      entry.append(heading, serviceNames);
      if (Number.isFinite(Number(petService.price)) && Number(petService.price) > 0) {
        const price = document.createElement("span");
        price.textContent = formatCurrency(petService.price);
        entry.append(price);
      }
      list.append(entry);
    });
    return list;
  }

  const entry = document.createElement("article");
  const heading = document.createElement("strong");
  heading.textContent = schedule.petName || "Thú cưng";
  const serviceNames = document.createElement("p");
  serviceNames.textContent = schedule.careType || "Chăm sóc theo yêu cầu";
  entry.append(heading, serviceNames);
  list.append(entry);
  return list;
}

function markPaymentReceived(scheduleId) {
  const currentSchedules = loadSchedules();
  const currentTarget = currentSchedules.find((schedule) => String(schedule.id) === String(scheduleId));
  if (!currentTarget) {
    showMessage("Không tìm thấy lịch cần cập nhật. Hãy tải lại trang.", "error");
    return;
  }
  if (getPaymentStatus(target) !== PAYMENT_STATUS_PENDING) {
    showMessage("Giao dịch đã được cập nhật ở nơi khác. Hãy tải lại danh sách trước khi xác nhận.", "error");
    render();
    return;
  }
  const amount = formatCurrency(getPaymentAmount(currentTarget)) || "0đ";
  if (!confirm(`Xác nhận đã thực nhận ${amount} cho lịch #${scheduleId}? Chỉ tiếp tục nếu tiền đã được nhận thực tế.`)) return;

  const schedules = loadSchedules();
  const target = schedules.find((schedule) => String(schedule.id) === String(scheduleId));
  if (!target) {
    showMessage("Không tìm thấy lịch cần cập nhật. Hãy tải lại trang.", "error");
    return;
  }

  const updatedSchedules = schedules.map((schedule) =>
    String(schedule.id) === String(scheduleId) ? confirmPaymentReceived(schedule) : schedule,
  );
  if (!saveSchedules(updatedSchedules)) {
    showMessage("Không thể lưu xác nhận thanh toán. Vui lòng thử lại.", "error");
    return;
  }
  showMessage(`Đã xác nhận thanh toán cho lịch #${scheduleId}.`, "success");
  render();
}

function createStatusButton(schedule, nextStatus, label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `care-btn care-btn-cancel ${className}`;
  button.textContent = label;
  button.addEventListener("click", () => changePaymentStatus(schedule.id, nextStatus));
  return button;
}

function changePaymentStatus(scheduleId, nextStatus) {
  const confirmationMessage = nextStatus === PAYMENT_STATUS_REFUNDED
    ? `Xác nhận đánh dấu giao dịch lịch #${scheduleId} đã hoàn tiền? Hãy chỉ xác nhận sau khi đã hoàn tiền thực tế.`
    : nextStatus === PAYMENT_STATUS_FAILED
      ? `Đánh dấu thanh toán lịch #${scheduleId} thất bại?`
      : `Đưa lịch #${scheduleId} về trạng thái chờ thanh toán để khách có thể thanh toán lại?`;
  if (!confirm(confirmationMessage)) return;

  const schedules = loadSchedules();
  const target = schedules.find((schedule) => String(schedule.id) === String(scheduleId));
  if (!target) {
    showMessage("Không tìm thấy giao dịch cần cập nhật. Hãy tải lại trang.", "error");
    return;
  }

  const updatedTarget = updatePaymentStatus(target, nextStatus);
  if (!updatedTarget) {
    showMessage("Không thể chuyển trạng thái giao dịch này. Vui lòng tải lại trang và thử lại.", "error");
    return;
  }
  const updatedSchedules = schedules.map((schedule) =>
    String(schedule.id) === String(scheduleId) ? updatedTarget : schedule,
  );
  if (!saveSchedules(updatedSchedules)) {
    showMessage("Không thể lưu trạng thái thanh toán. Vui lòng thử lại.", "error");
    return;
  }
  showMessage(`Đã cập nhật trạng thái lịch #${scheduleId}: ${nextStatus}.`, "success");
  render();
}

function exportPayments() {
  const schedules = loadSchedules();
  const filtered = filterPayments(schedules, {
    query: searchInput?.value || "",
    status: filterInput?.value === "all" ? "all" : ({
      paid: PAYMENT_STATUS_PAID,
      pending: PAYMENT_STATUS_PENDING,
      failed: PAYMENT_STATUS_FAILED,
      refunded: PAYMENT_STATUS_REFUNDED,
    }[filterInput?.value] || "all"),
    method: methodFilterInput?.value || "all",
    dateField: dateFieldInput?.value || "booking",
    dateFrom: dateFromInput.value,
    dateTo: dateToInput.value,
  });
  if (!filtered.length) {
    showMessage("Không có giao dịch phù hợp để xuất.", "error");
    return;
  }

  const csv = buildPaymentCsv(filtered);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `thanh-toan-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showMessage(`Đã xuất ${filtered.length} giao dịch ra CSV.`, "success");
}

function showMessage(text, type) {
  if (!message) return;
  message.textContent = text;
  message.className = `user-form-message ${type}`;
}