const SAMPLE_SCHEDULES = [
  {
    id: 1,
    petId: 1,
    petName: "Milu",
    careType: "Cho ăn",
    date: "2026-10-20",
    time: "08:00",
    note: "Cho ăn buổi sáng",
    customerUsername: "sample",
    customerName: "Nguyễn Minh Anh",
    customerPhone: "0901234567",
    status: "Chờ xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 2,
    petId: 2,
    petName: "Misa",
    careType: "Tắm",
    date: "2026-10-21",
    time: "10:00",
    note: "Tắm và vệ sinh tai",
    customerUsername: "sample",
    customerName: "Nguyễn Minh Anh",
    customerPhone: "0901234567",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 3,
    petId: 3,
    petName: "Lucky",
    careType: "Tẩy giun",
    date: "2026-10-22",
    time: "17:00",
    note: "Tẩy giun định kỳ",
    customerUsername: "sample",
    customerName: "Nguyễn Minh Anh",
    customerPhone: "0901234567",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 4,
    petId: 1,
    petName: "Milu",
    careType: "Tiêm phòng",
    date: "2026-10-23",
    time: "09:30",
    note: "Tiêm vaccine định kỳ",
    customerUsername: "sample",
    customerName: "Nguyễn Minh Anh",
    customerPhone: "0901234567",
    status: "Đã xác nhận",
    source: "sample",
    createdAt: "2026-09-20T08:00:00.000Z",
  },
  {
    id: 5,
    petId: 2,
    petName: "Misa",
    careType: "Cắt móng",
    date: "2026-10-24",
    time: "14:00",
    note: "Cắt móng chân",
    customerUsername: "sample",
    customerName: "Nguyễn Minh Anh",
    customerPhone: "0901234567",
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
export const CARE_TYPE_PET_SITTING = "Trông coi thú cưng";
export const PET_SITTING_HOURLY_RATE = 10000;
export const PET_SITTING_DAILY_RATE = 150000;

export const SERVICE_CATALOG = [
  {
    id: "bath",
    value: "Tắm",
    name: "Tắm",
    description: "Làm sạch lông và chăm sóc vệ sinh cho thú cưng.",
    icon: "🛁",
    price: 100000,
    unit: "lần",
    active: true,
  },
  {
    id: "nail-trim",
    value: "Cắt móng",
    name: "Cắt móng",
    description: "Cắt và chăm sóc móng gọn gàng cho thú cưng.",
    icon: "✂️",
    price: 50000,
    unit: "lần",
    active: true,
  },
  {
    id: "vaccination",
    value: "Tiêm phòng",
    name: "Tiêm phòng",
    description: "Đặt lịch tiêm phòng theo nhu cầu chăm sóc của thú cưng.",
    icon: "💉",
    price: 200000,
    unit: "lần",
    active: true,
  },
  {
    id: "deworming",
    value: "Tẩy giun",
    name: "Tẩy giun",
    description: "Hỗ trợ chăm sóc sức khỏe định kỳ cho thú cưng.",
    icon: "🩺",
    price: 150000,
    unit: "lần",
    active: true,
  },
  {
    id: "feeding",
    value: "Cho ăn",
    name: "Cho ăn",
    description: "Chuẩn bị bữa ăn và chăm sóc thú cưng theo lịch.",
    icon: "🥣",
    price: 50000,
    unit: "lần",
    active: true,
  },
  {
    id: "pet-sitting",
    value: CARE_TYPE_PET_SITTING,
    name: CARE_TYPE_PET_SITTING,
    description: "Trông nom thú cưng theo thời gian nhận và trả đã đăng ký.",
    icon: "🏠",
    hourlyRate: PET_SITTING_HOURLY_RATE,
    dailyRate: PET_SITTING_DAILY_RATE,
    active: true,
  },
];

export const CARE_TYPES = SERVICE_CATALOG
  .filter((service) => service.active && Number.isFinite(service.price))
  .map(({ value, price }) => ({ value, price }));

const CARE_TYPE_PRICES = CARE_TYPES.reduce((map, item) => {
  map[item.value] = item.price;
  return map;
}, {});

export function getCareTypePrice(careType) {
  const services = Array.isArray(careType)
    ? careType
    : String(careType || "").split(" · ");
  return services.reduce((total, service) => total + (CARE_TYPE_PRICES[String(service || "").trim()] ?? 0), 0);
}

export function isKnownCareType(careType) {
  return Object.prototype.hasOwnProperty.call(CARE_TYPE_PRICES, String(careType || "").trim());
}

/*
 * Keep existing schedule snapshots priced as created; this catalog is the
 * source for new bookings and public price displays.
 */

export function getPetSittingPrice(startDate, startTime, endDate, endTime) {
  const toMinutes = (dateValue, timeValue) => {
    const [year, month, day] = String(dateValue || "").split("-").map(Number);
    const [hour, minute] = String(timeValue || "").split(":").map(Number);
    if (![year, month, day, hour, minute].every(Number.isFinite)) return NaN;
    return Math.floor(Date.UTC(year, month - 1, day) / 60000) + hour * 60 + minute;
  };

  const duration = toMinutes(endDate, endTime) - toMinutes(startDate, startTime);
  if (!Number.isFinite(duration) || duration <= 0) return 0;

  const fullDays = Math.floor(duration / (24 * 60));
  const remainingHours = Math.ceil((duration % (24 * 60)) / 60);
  const remainingPrice = Math.min(remainingHours * PET_SITTING_HOURLY_RATE, PET_SITTING_DAILY_RATE);
  return fullDays * PET_SITTING_DAILY_RATE + remainingPrice;
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

export function mergeScheduleUpdate(schedule, changes) {
  const existing = schedule && typeof schedule === "object" ? schedule : {};
  const next = { ...existing, ...changes };
  if (!Array.isArray(existing.petServices) || !existing.petServices.length) return next;

  ["petId", "petIds", "petName", "petNames", "petServices", "careType", "price"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(existing, key)) next[key] = existing[key];
    else delete next[key];
  });
  return next;
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

export function hasScheduleConflict(schedules, candidate) {
  const candidateStart = `${candidate.date || ""} ${candidate.time || ""}`;
  const candidateHasRange = Boolean(candidate.endDate && candidate.endTime);
  const candidateEnd = `${candidate.endDate || ""} ${candidate.endTime || ""}`;
  const candidatePetIds = getSchedulePetIds(candidate);
  const candidateHasSitting = hasPetSittingService(candidate);

  return (Array.isArray(schedules) ? schedules : []).some((schedule) => {
    if (
      schedule.deletedAt ||
      ![SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(resolveScheduleStatus(schedule))
    ) return false;

    const sharedPet = Array.from(getSchedulePetIds(schedule)).some((petId) => candidatePetIds.has(petId));
    if (!sharedPet) return false;

    const scheduleStart = `${schedule.date || ""} ${schedule.time || ""}`;
    const scheduleHasRange = Boolean(schedule.endDate && schedule.endTime);
    const scheduleEnd = `${schedule.endDate || ""} ${schedule.endTime || ""}`;
    const scheduleHasSitting = hasPetSittingService(schedule);

    if (candidateHasRange && scheduleHasRange) {
      return candidateStart < scheduleEnd && scheduleStart < candidateEnd;
    }
    if (candidateHasRange) {
      return candidateHasSitting
        ? candidateStart <= scheduleStart && scheduleStart < candidateEnd
        : candidateStart === scheduleStart;
    }
    if (scheduleHasRange) {
      return scheduleHasSitting
        ? scheduleStart <= candidateStart && candidateStart < scheduleEnd
        : scheduleStart === candidateStart;
    }
    return candidateStart === scheduleStart;
  });
}

function getSchedulePetIds(schedule) {
  const values = [
    ...(Array.isArray(schedule?.petIds) ? schedule.petIds : []),
    ...(Array.isArray(schedule?.petServices) ? schedule.petServices.map((item) => item.petId) : []),
    schedule?.petId,
  ];
  return new Set(values.filter((value) => value !== "" && value !== null && value !== undefined).map(String));
}

function hasPetSittingService(schedule) {
  return Boolean(
    schedule?.endDate ||
    (Array.isArray(schedule?.petServices) && schedule.petServices.some(
      (item) => Array.isArray(item.services) && item.services.includes(CARE_TYPE_PET_SITTING),
    )) ||
    String(schedule?.careType || "").includes(CARE_TYPE_PET_SITTING),
  );
}

export function clearSchedules() {
  getStorage()?.removeItem(SCHEDULE_STORAGE_KEY);
}

export default SAMPLE_SCHEDULES;
