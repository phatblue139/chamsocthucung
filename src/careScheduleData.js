const SAMPLE_SCHEDULES = [
  {
    id: 1,
    petId: 1,
    petName: "Milu",
    careType: "Cho ăn",
    date: "2026-09-23",
    time: "08:00",
    note: "Cho ăn buổi sáng",
    customerUsername: "sample",
    customerName: "Dữ liệu mẫu",
    customerPhone: "",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 2,
    petId: 2,
    petName: "Misa",
    careType: "Tắm",
    date: "2026-09-23",
    time: "10:00",
    note: "Tắm và vệ sinh tai",
    customerUsername: "sample",
    customerName: "Dữ liệu mẫu",
    customerPhone: "",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 3,
    petId: 3,
    petName: "Lucky",
    careType: "Tẩy giun",
    date: "2026-09-23",
    time: "17:00",
    note: "Tẩy giun định kỳ",
    customerUsername: "sample",
    customerName: "Dữ liệu mẫu",
    customerPhone: "",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 4,
    petId: 1,
    petName: "Milu",
    careType: "Tiêm phòng",
    date: "2026-09-25",
    time: "09:30",
    note: "Tiêm vaccine định kỳ",
    customerUsername: "sample",
    customerName: "Dữ liệu mẫu",
    customerPhone: "",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 5,
    petId: 2,
    petName: "Misa",
    careType: "Cắt móng",
    date: "2026-09-26",
    time: "14:00",
    note: "Cắt móng chân",
    customerUsername: "sample",
    customerName: "Dữ liệu mẫu",
    customerPhone: "",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
];

export const SCHEDULE_STORAGE_KEY = "careSchedules";

export const SCHEDULE_STATUS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

export const CARE_TYPE_OTHER = "Khác";

export const CARE_TYPES = [
  { value: "Tắm", price: 100000 },
  { value: "Cắt móng", price: 50000 },
  { value: "Tiêm phòng", price: 200000 },
  { value: "Tẩy giun", price: 150000 },
  { value: "Cho ăn", price: 50000 },
];

const CARE_TYPE_PRICES = CARE_TYPES.reduce((map, item) => {
  map[item.value] = item.price;
  return map;
}, {});

export function getCareTypePrice(careType) {
  return CARE_TYPE_PRICES[String(careType || "").trim()] ?? 0;
}

export function isKnownCareType(careType) {
  return Object.prototype.hasOwnProperty.call(CARE_TYPE_PRICES, String(careType || "").trim());
}

export function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return `${number.toLocaleString("vi-VN")}đ`;
}

export const OPEN_TIME = "08:00";
export const CLOSE_TIME = "19:00";
export const TIME_STEP_MINUTES = 5;

function timeToMinutes(value) {
  const [hour, minute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour * 60 + minute;
}

function minutesToTime(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function getTimeOptions({ open = OPEN_TIME, close = CLOSE_TIME, step = TIME_STEP_MINUTES } = {}) {
  const start = timeToMinutes(open);
  const end = timeToMinutes(close);
  const options = [];
  for (let minutes = start; minutes <= end; minutes += step) {
    options.push(minutesToTime(minutes));
  }
  return options;
}

const STATUS_ALIASES = {
  pending: SCHEDULE_STATUS.PENDING,
  confirmed: SCHEDULE_STATUS.CONFIRMED,
  completed: SCHEDULE_STATUS.COMPLETED,
  cancelled: SCHEDULE_STATUS.CANCELLED,
};

const STATUS_CLASSES = {
  [SCHEDULE_STATUS.PENDING]: "pending",
  [SCHEDULE_STATUS.CONFIRMED]: "confirmed",
  [SCHEDULE_STATUS.COMPLETED]: "completed",
  [SCHEDULE_STATUS.CANCELLED]: "cancelled",
};

export function normalizeStatus(status, source) {
  const raw = String(status || "").trim();

  return (
    STATUS_ALIASES[raw.toLowerCase()] ||
    raw ||
    (source === "user" ? SCHEDULE_STATUS.PENDING : SCHEDULE_STATUS.CONFIRMED)
  );
}

export function resolveScheduleStatus(schedule) {
  const item = schedule && typeof schedule === "object" ? schedule : {};
  const customer = String(item.customerUsername || item.ownerUsername || "").trim();

  return normalizeStatus(item.status, item.source || (customer ? "user" : "admin"));
}

export function getScheduleStatusClass(status) {
  return STATUS_CLASSES[String(status || "").trim()] || "pending";
}

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function clone(data) {
  return data.map((item) => ({ ...item }));
}

function normalizeSchedule(schedule) {
  const item = schedule && typeof schedule === "object" ? schedule : {};
  const numericId = Number(item.id);
  const id = Number.isInteger(numericId) && numericId > 0 ? numericId : item.id;
  const customerUsername = String(item.customerUsername || item.ownerUsername || "").trim();
  const customerName = String(item.customerName || item.ownerFullName || customerUsername).trim();
  const customerPhone = String(item.customerPhone || item.ownerPhone || "").trim();
  const source = String(item.source || (customerUsername ? "user" : "admin"));
  const careType = String(item.careType || "").trim();
  const price = Number(item.price);

  return {
    ...item,
    id,
    petId: item.petId || "",
    petName: String(item.petName || "").trim(),
    careType,
    price: Number.isFinite(price) && price > 0 ? price : getCareTypePrice(careType),
    date: String(item.date || "").trim(),
    time: String(item.time || "").trim(),
    note: String(item.note || "").trim(),
    customerUsername,
    customerName,
    customerPhone,
    status: normalizeStatus(item.status, source),
    source,
    createdAt: String(item.createdAt || ""),
  };
}

export function getSampleSchedules() {
  return clone(SAMPLE_SCHEDULES).map(normalizeSchedule);
}

export function loadSchedules() {
  const storage = getStorage();
  if (!storage) return getSampleSchedules();

  const stored = storage.getItem(SCHEDULE_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.map(normalizeSchedule);
    } catch (error) {
      return getSampleSchedules();
    }
  }

  return getSampleSchedules();
}

export function saveSchedules(schedules) {
  const storage = getStorage();
  if (!storage || !Array.isArray(schedules)) return false;

  try {
    storage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules.map(normalizeSchedule)));
    return true;
  } catch (error) {
    return false;
  }
}

export function getNextScheduleId(schedules = loadSchedules()) {
  const ids = (Array.isArray(schedules) ? schedules : [])
    .map((schedule) => Number(schedule?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function clearSchedules() {
  getStorage()?.removeItem(SCHEDULE_STORAGE_KEY);
}

export default SAMPLE_SCHEDULES;
