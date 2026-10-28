import { formatCurrency, loadSchedules, saveSchedules } from "./careScheduleData.js";
import { logout } from "./auth.js";
import {
  confirmPaymentReceived,
  getPaymentAmount,
  getPaymentStatus,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_UNPAID,
  revokePaymentReceived,
} from "./paymentAdminData.js";

const BANK_ACCOUNT_STORAGE_KEY = "neko:bankAccounts";

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function loadBankAccount(username) {
  const storage = getStorage();
  const normalized = normalizeUsername(username);
  if (!storage || !normalized) return null;
  try {
    const parsed = JSON.parse(storage.getItem(BANK_ACCOUNT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed[normalized] || null : null;
  } catch (error) {
    return null;
  }
}

const list = document.getElementById("paymentList");
const empty = document.getElementById("paymentEmpty");
const message = document.getElementById("paymentMessage");
const searchInput = document.getElementById("paymentSearch");
const filterInput = document.getElementById("paymentFilter");
const logoutButton = document.getElementById("logoutBtn");
const detailToggle = document.getElementById("paymentDetailToggle");
let showDetails = false;

logoutButton?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

searchInput?.addEventListener("input", render);
filterInput?.addEventListener("change", render);
detailToggle?.addEventListener("click", () => {
  showDetails = !showDetails;
  detailToggle.textContent = showDetails ? "Ẩn chi tiết" : "Xem chi tiết";
  render();
});
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
  const methodLabel = paymentMethod === "bank-transfer"
    ? "Chuyển khoản QR"
    : "Tại trung tâm";
  const status = getPaymentStatus(schedule);
  const bank = loadBankAccount(schedule.customerUsername);
  const bankInfo = bank
    ? ` | NH: ${bank.bankName || "-"} | STK: ${bank.bankAccountNumber || "-"} | Chủ TK: ${bank.bankAccountName || "-"}`
    : " | Chưa có thông tin TK ngân hàng";
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
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "4px";
    const paidText = document.createElement("span");
    paidText.textContent = schedule.payment?.paidAt
      ? new Date(schedule.payment.paidAt).toLocaleDateString("vi-VN")
      : "Đã xác nhận";
    const revokeButton = document.createElement("button");
    revokeButton.type = "button";
    revokeButton.className = "care-btn payment-confirm-button";
    revokeButton.textContent = "Thu hồi xác nhận";
    revokeButton.addEventListener("click", () => revokePaymentReceivedAction(schedule.id));
    wrapper.append(paidText, revokeButton);
    actionCell.appendChild(wrapper);
  }
  row.appendChild(actionCell);
  if (showDetails) {
    const detailRow = document.createElement("tr");
    const detailCell = document.createElement("td");
    detailCell.colSpan = 7;
    detailCell.style.fontSize = "13px";
    detailCell.style.color = "var(--muted)";
    detailCell.textContent = `Người dùng: ${schedule.customerUsername || "-"} | SĐT: ${schedule.customerPhone || "-"} | Ngày: ${schedule.date || "-"} ${schedule.time || ""}${bankInfo}`;
    detailRow.appendChild(detailCell);
    row.insertAdjacentElement("afterend", detailRow);
  }
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

function revokePaymentReceivedAction(scheduleId) {
  if (!confirm("Bạn có chắc muốn thu hồi xác nhận thanh toán của lịch này?")) return;
  const schedules = loadSchedules();
  const target = schedules.find((schedule) => String(schedule.id) === String(scheduleId));
  if (!target) {
    showMessage("Không tìm thấy lịch cần cập nhật. Hãy tải lại trang.", "error");
    return;
  }

  const updatedSchedules = schedules.map((schedule) =>
    String(schedule.id) === String(scheduleId) ? revokePaymentReceived(schedule) : schedule,
  );
  if (!saveSchedules(updatedSchedules)) {
    showMessage("Không thể thu hồi xác nhận thanh toán. Vui lòng thử lại.", "error");
    return;
  }
  showMessage(`Đã thu hồi xác nhận thanh toán cho lịch #${scheduleId}.`, "success");
  render();
}

function showMessage(text, type) {
  if (!message) return;
  message.textContent = text;
  message.className = `user-form-message ${type}`;
}