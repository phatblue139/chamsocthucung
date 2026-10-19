import { formatCurrency, loadSchedules, saveSchedules } from "./careScheduleData.js";
import { logout } from "./auth.js";
import {
  confirmPaymentReceived,
  getPaymentAmount,
  getPaymentStatus,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_UNPAID,
} from "./paymentAdminData.js";

const list = document.getElementById("paymentList");
const empty = document.getElementById("paymentEmpty");
const message = document.getElementById("paymentMessage");
const searchInput = document.getElementById("paymentSearch");
const filterInput = document.getElementById("paymentFilter");
const logoutButton = document.getElementById("logoutBtn");

logoutButton?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

searchInput?.addEventListener("input", render);
filterInput?.addEventListener("change", render);
window.addEventListener("storage", render);
render();

function render() {
  const schedules = loadSchedules();
  const paidCount = schedules.filter((schedule) => getPaymentStatus(schedule) === PAYMENT_STATUS_PAID).length;
  const unpaidCount = schedules.length - paidCount;
  const total = schedules.reduce((sum, schedule) => sum + getPaymentAmount(schedule), 0);
  document.getElementById("paidCount").textContent = String(paidCount);
  document.getElementById("unpaidCount").textContent = String(unpaidCount);
  document.getElementById("paymentTotal").textContent = formatCurrency(total) || "0đ";

  const query = String(searchInput?.value || "").trim().toLocaleLowerCase("vi");
  const selectedStatus = filterInput?.value || "all";
  const visibleSchedules = schedules.filter((schedule) => {
    const status = getPaymentStatus(schedule);
    const statusMatches = selectedStatus === "all" ||
      (selectedStatus === "paid" && status === PAYMENT_STATUS_PAID) ||
      (selectedStatus === "unpaid" && status === PAYMENT_STATUS_UNPAID);
    const searchable = [
      schedule.id,
      schedule.customerName,
      schedule.customerUsername,
      schedule.customerPhone,
      schedule.petName,
      schedule.careType,
    ].join(" ").toLocaleLowerCase("vi");
    return statusMatches && searchable.includes(query);
  }).sort((left, right) => String(right.createdAt || right.date || "").localeCompare(String(left.createdAt || left.date || "")));

  list.replaceChildren();
  visibleSchedules.forEach((schedule) => list.appendChild(createPaymentRow(schedule)));
  empty.hidden = visibleSchedules.length > 0;
}

function createPaymentRow(schedule) {
  const row = document.createElement("tr");
  const paymentMethod = schedule.payment?.method;
  const methodLabel = paymentMethod === "wallet"
    ? "Ví NEKO"
    : paymentMethod === "bank-transfer"
      ? "Chuyển khoản"
      : "Tại trung tâm";
  const status = getPaymentStatus(schedule);
  const cells = [
    `#${schedule.id ?? "-"}`,
    `${schedule.customerName || schedule.customerUsername || "Khách hàng"}${schedule.customerUsername ? ` · @${schedule.customerUsername}` : ""}`,
    `${schedule.petName || "Thú cưng"} · ${schedule.careType || "Chăm sóc"}`,
    methodLabel,
    formatCurrency(getPaymentAmount(schedule)) || "0đ",
  ];
  cells.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });

  const statusCell = document.createElement("td");
  const statusBadge = document.createElement("span");
  statusBadge.className = `payment-status-badge ${status === PAYMENT_STATUS_PAID ? "is-paid" : "is-unpaid"}`;
  statusBadge.textContent = status;
  statusCell.appendChild(statusBadge);
  row.appendChild(statusCell);

  const actionCell = document.createElement("td");
  if (status !== PAYMENT_STATUS_PAID) {
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "care-btn care-btn-add payment-confirm-button";
    confirmButton.textContent = "Xác nhận đã thu";
    confirmButton.addEventListener("click", () => markPaymentReceived(schedule.id));
    actionCell.appendChild(confirmButton);
  } else {
    actionCell.textContent = schedule.payment?.paidAt
      ? new Date(schedule.payment.paidAt).toLocaleDateString("vi-VN")
      : "Đã xác nhận";
  }
  row.appendChild(actionCell);
  return row;
}

function markPaymentReceived(scheduleId) {
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

function showMessage(text, type) {
  if (!message) return;
  message.textContent = text;
  message.className = `user-form-message ${type}`;
}