import { isAdminLoggedIn, logout } from "./auth.js";
import { loadSchedules, SCHEDULE_STATUS, SCHEDULE_STORAGE_KEY, resolveScheduleStatus } from "./careScheduleData.js";
import {
  getNextReviewId,
  loadReviews,
  REVIEW_STORAGE_KEY,
  saveReviews,
} from "./reviewData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
  throw new Error("Không có quyền truy cập trang này");
}

const form = document.getElementById("reviewForm");
const idInput = document.getElementById("reviewId");
const scheduleInput = document.getElementById("reviewSchedule");
const ratingInput = document.getElementById("reviewRating");
const commentInput = document.getElementById("reviewComment");
const saveButton = document.getElementById("reviewSaveButton");
const cancelButton = document.getElementById("reviewCancelButton");
const message = document.getElementById("reviewMessage");
const searchInput = document.getElementById("reviewSearch");
const list = document.getElementById("reviewList");
const empty = document.getElementById("reviewEmpty");
const count = document.getElementById("reviewCount");
let schedules = loadSchedules();
let reviews = loadReviews();

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const editingId = idInput.value;
  const schedule = schedules.find((item) => String(item.id) === scheduleInput.value);
  if (
    !schedule ||
    schedule.deletedAt ||
    resolveScheduleStatus(schedule) !== SCHEDULE_STATUS.COMPLETED
  ) {
    showMessage("Chỉ có thể đánh giá lịch chưa bị xóa và đã hoàn thành.", "error");
    renderScheduleOptions(editingId);
    return;
  }

  const rating = Number(ratingInput.value);
  const comment = commentInput.value.trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment || comment.length > 1000) {
    showMessage("Vui lòng chọn số sao hợp lệ và nhập bình luận tối đa 1000 ký tự.", "error");
    return;
  }

  const duplicate = reviews.find((review) =>
    String(review.scheduleId) === String(schedule.id) && String(review.id) !== editingId,
  );
  if (duplicate) {
    showMessage("Lịch này đã có đánh giá. Hãy sửa đánh giá hiện có.", "error");
    render();
    return;
  }

  const now = new Date().toISOString();
  const review = editingId
    ? {
      ...reviews.find((item) => String(item.id) === editingId),
      rating,
      comment,
      updatedAt: now,
    }
    : {
      id: getNextReviewId(reviews),
      scheduleId: String(schedule.id),
      authorUsername: String(schedule.customerUsername || schedule.ownerUsername || "admin"),
      authorName: String(schedule.customerName || schedule.ownerFullName || "Quản trị viên"),
      petName: String(schedule.petName || "Thú cưng"),
      careType: String(schedule.careType || "Chăm sóc"),
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    };

  if (editingId && !reviews.some((item) => String(item.id) === editingId)) {
    resetForm();
    showMessage("Đánh giá không còn tồn tại. Vui lòng tải lại danh sách.", "error");
    render();
    return;
  }

  const nextReviews = editingId
    ? reviews.map((item) => String(item.id) === editingId ? review : item)
    : [...reviews, review];
  if (!saveReviews(nextReviews)) {
    showMessage("Không thể lưu đánh giá. Vui lòng thử lại.", "error");
    return;
  }

  reviews = nextReviews;
  resetForm();
  render();
  showMessage(editingId ? "Đã cập nhật đánh giá." : "Đã thêm đánh giá.", "success");
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const review = reviews.find((item) => String(item.id) === button.dataset.id);
  if (!review) return;

  if (button.dataset.action === "edit") {
    editReview(review);
  } else if (button.dataset.action === "delete") {
    deleteReview(review);
  }
});

searchInput.addEventListener("input", render);
cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("", "");
});
window.addEventListener("storage", (event) => {
  if (event.key === SCHEDULE_STORAGE_KEY) schedules = loadSchedules();
  if (event.key === REVIEW_STORAGE_KEY) reviews = loadReviews();
  if (event.key === SCHEDULE_STORAGE_KEY || event.key === REVIEW_STORAGE_KEY) render();
});

function renderScheduleOptions(editingId = "") {
  const selectedScheduleId = scheduleInput.value;
  const currentReview = reviews.find((review) => String(review.id) === editingId);
  const available = schedules.filter((schedule) =>
    !schedule.deletedAt &&
    resolveScheduleStatus(schedule) === SCHEDULE_STATUS.COMPLETED &&
    (!reviews.some((review) => String(review.scheduleId) === String(schedule.id)) ||
      String(schedule.id) === String(currentReview?.scheduleId)),
  );
  scheduleInput.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = available.length ? "-- Chọn lịch hoàn thành --" : "Không có lịch hoàn thành chưa được đánh giá";
  scheduleInput.appendChild(placeholder);
  available.forEach((schedule) => {
    const option = document.createElement("option");
    option.value = String(schedule.id);
    option.textContent = `#${schedule.id} · ${schedule.customerName || schedule.customerUsername || "Khách hàng"} · ${schedule.petName || "Thú cưng"} · ${schedule.date || "Chưa rõ ngày"}`;
    scheduleInput.appendChild(option);
  });
  scheduleInput.value = available.some((schedule) => String(schedule.id) === selectedScheduleId)
    ? selectedScheduleId
    : String(currentReview?.scheduleId || "");
  scheduleInput.disabled = Boolean(editingId);
}

function render() {
  renderScheduleOptions(idInput.value);
  const query = String(searchInput.value || "").trim().toLocaleLowerCase("vi");
  const visibleReviews = reviews.filter((review) => {
    const schedule = schedules.find((item) => String(item.id) === String(review.scheduleId));
    const searchable = [
      review.scheduleId,
      review.authorName,
      review.authorUsername,
      review.petName,
      review.careType,
      review.comment,
      schedule?.customerPhone,
    ].join(" ").toLocaleLowerCase("vi");
    return searchable.includes(query);
  }).sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

  list.replaceChildren();
  visibleReviews.forEach((review) => list.appendChild(createReviewRow(review)));
  count.textContent = `${reviews.length} đánh giá · ${visibleReviews.length} đang hiển thị`;
  empty.hidden = visibleReviews.length > 0;
}

function createReviewRow(review) {
  const row = document.createElement("tr");
  [
    `#${review.scheduleId}`,
    `${review.authorName || "Khách hàng"}${review.authorUsername ? ` · @${review.authorUsername}` : ""}`,
    `${review.petName || "Thú cưng"} · ${review.careType || "Chăm sóc"}`,
    `${review.rating}/5 sao`,
    review.comment,
    review.createdAt ? new Date(review.createdAt).toLocaleDateString("vi-VN") : "—",
  ].forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });

  const actionCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "care-actions";
  [["edit", "Sửa", "care-btn-edit"], ["delete", "Xóa", "care-btn-delete"]].forEach(([action, label, className]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = String(review.id);
    button.className = className;
    button.textContent = label;
    actions.appendChild(button);
  });
  actionCell.appendChild(actions);
  row.appendChild(actionCell);
  return row;
}

function editReview(review) {
  idInput.value = String(review.id);
  renderScheduleOptions(idInput.value);
  scheduleInput.value = String(review.scheduleId);
  ratingInput.value = String(review.rating);
  commentInput.value = review.comment;
  saveButton.textContent = "Lưu thay đổi";
  cancelButton.hidden = false;
  commentInput.focus();
}

function deleteReview(review) {
  if (!confirm(`Xóa đánh giá cho lịch #${review.scheduleId}?`)) return;
  const nextReviews = reviews.filter((item) => String(item.id) !== String(review.id));
  if (!saveReviews(nextReviews)) {
    showMessage("Không thể xóa đánh giá. Vui lòng thử lại.", "error");
    return;
  }
  reviews = nextReviews;
  if (String(idInput.value) === String(review.id)) resetForm();
  render();
  showMessage("Đã xóa đánh giá.", "success");
}

function resetForm() {
  form.reset();
  idInput.value = "";
  scheduleInput.disabled = false;
  saveButton.textContent = "Thêm đánh giá";
  cancelButton.hidden = true;
  renderScheduleOptions();
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `user-form-message ${type}`;
}

render();
