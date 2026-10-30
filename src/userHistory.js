import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  SCHEDULE_STATUS,
  SCHEDULE_STORAGE_KEY,
  formatCurrency,
  getScheduleStatusClass,
  loadSchedules,
  resolveScheduleStatus,
} from "./careScheduleData.js";
import {
  SHIPMENT_STORAGE_KEY,
  getShipmentStorage,
} from "./shippingData.js";
import {
  canReviewSchedule,
  createReviewRecord,
  getNextReviewId,
  getReviewForSchedule,
  loadReviews,
  REVIEW_STORAGE_KEY,
  saveReviews,
  validateReview,
} from "./reviewData.js";

initSiteHeader();

const user = getCurrentUser();
if (!user) {
  location.replace("/");
} else {
  initHistoryPage(user);
}

function initHistoryPage(user) {
  const historyList = document.getElementById("userScheduleHistoryList");
  const historyEmpty = document.getElementById("userScheduleHistoryEmpty");
  const historyCount = document.getElementById("userScheduleHistoryCount");
  const historyMessage = document.getElementById("historyMessage");
  let schedules = loadSchedules();
  let reviews = loadReviews();

  window.addEventListener("storage", (event) => {
    if (event.key === SCHEDULE_STORAGE_KEY) schedules = loadSchedules();
    if (event.key === REVIEW_STORAGE_KEY) reviews = loadReviews();
    if ([SCHEDULE_STORAGE_KEY, REVIEW_STORAGE_KEY, SHIPMENT_STORAGE_KEY].includes(event.key)) render();
  });

  render();

  function render() {
    if (!historyList || !historyEmpty || !historyCount) return;

    const historySchedules = schedules
      .filter((schedule) =>
        !schedule.deletedAt &&
        String(schedule.customerUsername || schedule.ownerUsername) === String(user.username) &&
        [SCHEDULE_STATUS.CANCELLED, SCHEDULE_STATUS.COMPLETED].includes(resolveScheduleStatus(schedule)),
      )
      .sort((first, second) =>
        `${second.date || ""} ${second.time || ""}`.localeCompare(`${first.date || ""} ${first.time || ""}`),
      );

    historyList.replaceChildren();
    historyCount.textContent = `${historySchedules.length} lịch`;
    historyEmpty.hidden = historySchedules.length > 0;
    historySchedules.forEach(renderScheduleCard);
  }

  function renderScheduleCard(schedule) {
    const card = document.createElement("article");
    card.className = "user-schedule-card";

    const heading = document.createElement("div");
    heading.className = "user-schedule-card-heading";
    const title = document.createElement("div");
    title.className = "user-schedule-card-title";

    const petName = document.createElement("h3");
    petName.textContent = schedule.petName || "Thú cưng";
    const dateTag = document.createElement("span");
    dateTag.className = "user-schedule-date";
    dateTag.textContent = formatDate(schedule.date);
    const timeTag = document.createElement("span");
    timeTag.className = "user-schedule-time";
    timeTag.textContent = schedule.time || "Chưa chọn giờ";
    title.append(petName, dateTag, timeTag);
    heading.appendChild(title);

    const statusValue = resolveScheduleStatus(schedule);
    const status = document.createElement("span");
    status.className = `user-schedule-status ${getScheduleStatusClass(statusValue)}`;
    status.textContent = statusValue;
    const statusGroup = document.createElement("div");
    statusGroup.className = "user-schedule-status-group";
    statusGroup.appendChild(status);
    heading.appendChild(statusGroup);

    const paymentAmount = Number(
      schedule.payment?.amount ?? (Number(schedule.price) + Number(schedule.shipping?.totalFee || 0)),
    );
    const details = document.createElement("div");
    details.className = "user-schedule-details";
    details.textContent = `${formatDate(schedule.date)} · ${schedule.time || ""}${schedule.endDate ? ` → ${formatDate(schedule.endDate)} ${schedule.endTime || ""}` : ""} · ${schedule.careType || "Chăm sóc"}${formatCurrency(paymentAmount) ? ` · ${formatCurrency(paymentAmount)}` : ""}`;
    card.append(heading, details);

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "user-schedule-hint";
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.textContent = "Xem chi tiết lịch";

    const more = document.createElement("div");
    more.className = "user-schedule-more";
    more.hidden = true;
    more.append(
      createScheduleRow(schedule.endDate ? "Ngày nhận" : "Ngày", formatDate(schedule.date)),
      createScheduleRow(schedule.endDate ? "Giờ nhận" : "Giờ đặt lịch", schedule.time || "Chưa chọn"),
    );
    if (schedule.endDate) {
      more.appendChild(createScheduleRow("Ngày/giờ trả", `${formatDate(schedule.endDate)} · ${schedule.endTime || "Chưa chọn"}`));
    }

    if (Array.isArray(schedule.petServices) && schedule.petServices.length) {
      schedule.petServices.forEach((item) => {
        const services = Array.isArray(item.services) ? item.services.join(", ") : "Chăm sóc";
        const price = formatCurrency(item.price) || "Theo yêu cầu";
        more.appendChild(createScheduleRow(item.petName || "Thú cưng", `${services} · ${price}`));
      });
    } else {
      more.append(
        createScheduleRow("Thú cưng", schedule.petName || "Thú cưng"),
        createScheduleRow("Loại chăm sóc", schedule.careType || "Chăm sóc"),
      );
    }

    if (schedule.shipping) {
      const shipment = getShipmentStorage().find((item) =>
        String(item.id) === String(schedule.shipping.id) &&
        String(item.customerUsername) === String(user.username),
      );
      more.append(
        createScheduleRow("Vận chuyển", `${schedule.shipping.centerName || "Trung tâm NEKO"} · ${schedule.shipping.transportType === "round-trip" ? "Hai chiều" : "Một chiều"}`),
        createScheduleRow("Phí vận chuyển", formatCurrency(schedule.shipping.totalFee) || "Theo yêu cầu"),
        createScheduleRow("Trạng thái vận chuyển", shipment?.status || "Không tìm thấy đơn vận chuyển"),
      );
      (shipment?.statusHistory || []).forEach((entry) => {
        more.appendChild(createScheduleRow("Lịch sử vận chuyển", `${entry.status} · ${formatDateTime(entry.changedAt)}`));
      });
    }

    more.append(
      createScheduleRow("Tổng thanh toán", formatCurrency(paymentAmount) || "Theo yêu cầu"),
      createScheduleRow("Phương thức thanh toán", schedule.payment?.method === "bank-transfer" ? "Chuyển khoản" : "Thanh toán tại trung tâm"),
      createScheduleRow("Trạng thái thanh toán", schedule.payment?.status || "Chưa thanh toán"),
      createScheduleRow("Mã lịch", schedule.id || "-"),
      createScheduleRow("Trung tâm", schedule.shipCenter || schedule.shipping?.centerName || "-"),
      createScheduleRow("Ghi chú", schedule.note || "Không có"),
    );
    toggleButton.addEventListener("click", () => {
      const isOpen = !more.hidden;
      more.hidden = isOpen;
      toggleButton.setAttribute("aria-expanded", String(!isOpen));
      toggleButton.textContent = isOpen ? "Xem chi tiết lịch" : "Thu gọn";
      card.classList.toggle("is-open", !isOpen);
    });
    card.append(toggleButton, more);

    if (statusValue === SCHEDULE_STATUS.COMPLETED) {
      const reviewEditor = createReviewEditor(schedule);
      reviewEditor.id = `userScheduleReview-${schedule.id}`;
      reviewEditor.hidden = true;

      const reviewButton = document.createElement("button");
      reviewButton.type = "button";
      reviewButton.className = "care-btn care-btn-confirm user-schedule-review-button";
      reviewButton.setAttribute("aria-expanded", "false");
      reviewButton.setAttribute("aria-controls", reviewEditor.id);
      reviewButton.textContent = getReviewForSchedule(reviews, schedule.id, user.username)
        ? "Sửa đánh giá"
        : "Viết đánh giá";
      reviewButton.addEventListener("click", () => {
        const isOpen = !reviewEditor.hidden;
        reviewEditor.hidden = isOpen;
        reviewButton.setAttribute("aria-expanded", String(!isOpen));
        if (!isOpen) {
          reviewEditor.hidden = false;
          reviewEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      statusGroup.appendChild(reviewButton);
      card.appendChild(reviewEditor);
    }
    historyList.appendChild(card);
  }

  function createReviewEditor(schedule) {
    const section = document.createElement("section");
    section.className = "user-review-editor";
    const heading = document.createElement("h4");
    heading.textContent = "Đánh giá dịch vụ";
    section.appendChild(heading);

    const existingReview = getReviewForSchedule(reviews, schedule.id, user.username);
    const anyReview = getReviewForSchedule(reviews, schedule.id);
    if (anyReview && !existingReview) {
      const notice = document.createElement("p");
      notice.className = "user-review-notice";
      notice.textContent = "Lịch này đã có đánh giá.";
      section.appendChild(notice);
      return section;
    }

    const form = document.createElement("form");
    form.className = "user-review-form";
    const ratingGroup = document.createElement("div");
    ratingGroup.className = "care-form-group";
    const ratingLabel = document.createElement("label");
    ratingLabel.htmlFor = `historyReviewRating-${schedule.id}`;
    ratingLabel.textContent = "Mức đánh giá";
    const rating = document.createElement("select");
    rating.id = ratingLabel.htmlFor;
    rating.required = true;
    [
      ["5", "5 sao - Rất hài lòng"],
      ["4", "4 sao - Hài lòng"],
      ["3", "3 sao - Bình thường"],
      ["2", "2 sao - Chưa hài lòng"],
      ["1", "1 sao - Không hài lòng"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      rating.appendChild(option);
    });
    if (existingReview) rating.value = String(existingReview.rating);
    ratingGroup.append(ratingLabel, rating);

    const commentGroup = document.createElement("div");
    commentGroup.className = "care-form-group";
    const commentLabel = document.createElement("label");
    commentLabel.htmlFor = `historyReviewComment-${schedule.id}`;
    commentLabel.textContent = "Bình luận";
    const comment = document.createElement("textarea");
    comment.id = commentLabel.htmlFor;
    comment.required = true;
    comment.maxLength = 1000;
    comment.rows = 3;
    comment.placeholder = "Chia sẻ trải nghiệm chăm sóc thú cưng của bạn";
    comment.value = existingReview?.comment || "";
    commentGroup.append(commentLabel, comment);

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "care-btn care-btn-add";
    saveButton.textContent = existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá";
    form.append(ratingGroup, commentGroup, saveButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const validationError = validateReview({
        schedule,
        username: user.username,
        rating: rating.value,
        comment: comment.value,
      });
      if (validationError) {
        showMessage(validationError, "error");
        return;
      }

      const latestReviews = loadReviews();
      const latestReview = getReviewForSchedule(latestReviews, schedule.id, user.username);
      let nextReviews;
      if (latestReview) {
        nextReviews = latestReviews.map((review) =>
          String(review.id) === String(latestReview.id)
            ? { ...review, rating: Number(rating.value), comment: comment.value.trim(), updatedAt: new Date().toISOString() }
            : review,
        );
      } else {
        if (getReviewForSchedule(latestReviews, schedule.id)) {
          reviews = latestReviews;
          render();
          showMessage("Lịch này đã có đánh giá.", "error");
          return;
        }
        if (!canReviewSchedule(schedule, user.username)) {
          showMessage("Chỉ có thể đánh giá lịch đã hoàn thành của bạn.", "error");
          return;
        }
        nextReviews = [...latestReviews, createReviewRecord({
          id: getNextReviewId(latestReviews),
          schedule,
          user,
          rating: Number(rating.value),
          comment: comment.value,
        })];
      }

      if (!saveReviews(nextReviews)) {
        showMessage(latestReview ? "Không thể cập nhật đánh giá. Vui lòng thử lại." : "Không thể gửi đánh giá. Vui lòng thử lại.", "error");
        return;
      }
      reviews = nextReviews;
      render();
      showMessage(latestReview ? "Đã cập nhật đánh giá." : "Cảm ơn bạn đã gửi đánh giá.", "success");
    });

    if (existingReview) {
      const notice = document.createElement("p");
      notice.className = "user-review-notice";
      notice.textContent = `Đánh giá hiện tại: ${existingReview.rating}/5 sao`;
      section.appendChild(notice);
    }
    section.appendChild(form);
    return section;
  }

  function showMessage(text, type) {
    const message = document.getElementById("historyMessage");
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }
}

function createScheduleRow(label, value) {
  const row = document.createElement("div");
  row.className = "user-schedule-detail-row";
  const term = document.createElement("span");
  term.className = "user-schedule-detail-label";
  term.textContent = label;
  const description = document.createElement("span");
  description.className = "user-schedule-detail-value";
  description.textContent = String(value);
  row.append(term, description);
  return row;
}

function formatDate(value) {
  if (!value) return "Chưa chọn ngày";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "thời điểm không rõ" : date.toLocaleString("vi-VN");
}
