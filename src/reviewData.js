import { SCHEDULE_STATUS, resolveScheduleStatus } from "./careScheduleData.js";

export const REVIEW_STORAGE_KEY = "neko:reviews";

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function normalizeReview(review) {
  const item = review && typeof review === "object" ? review : {};
  return {
    ...item,
    id: String(item.id ?? ""),
    scheduleId: String(item.scheduleId ?? ""),
    authorUsername: String(item.authorUsername || "").trim(),
    authorName: String(item.authorName || "").trim(),
    petName: String(item.petName || "").trim(),
    careType: String(item.careType || "").trim(),
    rating: Number(item.rating),
    comment: String(item.comment || "").trim(),
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  };
}

export function loadReviews() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const stored = storage.getItem(REVIEW_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeReview) : [];
  } catch (error) {
    return [];
  }
}

export function saveReviews(reviews) {
  const storage = getStorage();
  if (!storage || !Array.isArray(reviews)) return false;

  try {
    storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews.map(normalizeReview)));
    return true;
  } catch (error) {
    return false;
  }
}

export function canReviewSchedule(schedule, username) {
  if (!schedule || schedule.deletedAt || resolveScheduleStatus(schedule) !== SCHEDULE_STATUS.COMPLETED) {
    return false;
  }

  const owner = String(schedule.customerUsername || schedule.ownerUsername || "").trim().toLocaleLowerCase("vi");
  return Boolean(owner && owner === String(username || "").trim().toLocaleLowerCase("vi"));
}

export function validateReview({ schedule, username, rating, comment }) {
  if (!canReviewSchedule(schedule, username)) return "Chỉ có thể đánh giá lịch đã hoàn thành của bạn.";

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return "Vui lòng chọn số sao từ 1 đến 5.";
  }

  const cleanComment = String(comment || "").trim();
  if (!cleanComment) return "Vui lòng nhập nội dung đánh giá.";
  if (cleanComment.length > 1000) return "Nội dung đánh giá không được vượt quá 1000 ký tự.";
  return "";
}

export function getReviewForSchedule(reviews, scheduleId, username = "") {
  const normalizedUsername = String(username || "").trim().toLocaleLowerCase("vi");
  return (Array.isArray(reviews) ? reviews : []).find((review) =>
    String(review.scheduleId) === String(scheduleId) &&
    (!normalizedUsername || String(review.authorUsername || "").trim().toLocaleLowerCase("vi") === normalizedUsername),
  ) || null;
}

export function getNextReviewId(reviews = loadReviews()) {
  const ids = (Array.isArray(reviews) ? reviews : [])
    .map((review) => Number(review?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function createReviewRecord({ id, schedule, user, rating, comment, now = new Date().toISOString() }) {
  return normalizeReview({
    id,
    scheduleId: schedule.id,
    authorUsername: user.username,
    authorName: user.fullName || user.username,
    petName: schedule.petName || "Thú cưng",
    careType: schedule.careType || "Chăm sóc",
    rating,
    comment,
    createdAt: now,
    updatedAt: now,
  });
}
