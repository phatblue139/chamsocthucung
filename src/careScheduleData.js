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

/*
 * The centre keeps 10 cages for pet sitting: 3 small, 5 medium and 2 large.
 * Every stay is priced with the same hourly rate, each cage type adds its own
 * one-off cage fee.
 */
export const PET_SITTING_CAGE_TYPES = [
  { code: "small", label: "Chuồng nhỏ", capacity: 3, fee: 20000 },
  { code: "medium", label: "Chuồng vừa", capacity: 5, fee: 30000 },
  { code: "large", label: "Chuồng lớn", capacity: 2, fee: 50000 },
];

export const DEFAULT_PET_SITTING_CAGE = "medium";
export const PET_SITTING_CAPACITY = PET_SITTING_CAGE_TYPES.reduce(
  (total, cage) => total + cage.capacity,
  0,
);

/* Cage type of a pet sitting booking, defaulting to the medium cage. */
export function getPetSittingCageType(cageType) {
  const code = String(cageType || "").trim().toLowerCase();
  return PET_SITTING_CAGE_TYPES.find((cage) => cage.code === code) ||
    PET_SITTING_CAGE_TYPES.find((cage) => cage.code === DEFAULT_PET_SITTING_CAGE);
}

/* A small pet needs a small cage, a large pet needs a large cage. */
export function getCageTypeForPetSize(size) {
  const code = String(size || "").trim().toLowerCase();
  if (["small", "nhỏ", "tiny"].includes(code)) return "small";
  if (["large", "lớn", "big"].includes(code)) return "large";
  return DEFAULT_PET_SITTING_CAGE;
}

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
    description: "Trông nom thú cưng trong chuồng riêng theo thời gian nhận và trả đã đăng ký.",
    icon: "🏠",
    hourlyRate: PET_SITTING_HOURLY_RATE,
    dailyRate: PET_SITTING_DAILY_RATE,
    cageTypes: PET_SITTING_CAGE_TYPES,
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

/*
 * Price of one pet staying at the centre: the same hourly rate for every
 * cage type (capped at one day price per 24 hours) plus the one-off fee of
 * the cage the pet occupies.
 */
export function getPetSittingPrice(startDate, startTime, endDate, endTime, cageType = null) {
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
  const basePrice = fullDays * PET_SITTING_DAILY_RATE + remainingPrice;
  const cage = cageType ? getPetSittingCageType(cageType) : null;
  return basePrice + (cage ? cage.fee : 0);
}

export function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return `${number.toLocaleString("vi-VN")}đ`;
}

export const OPEN_TIME = "08:00";
export const CLOSE_TIME = "19:00";
export const TIME_STEP_MINUTES = 5;

/* A pet needs this much time between two appointments at the centre. */
export const SCHEDULE_BUFFER_MINUTES = 30;

/* The new booking runs inside the window of an existing booking. */
export const SCHEDULE_CONFLICT_OVERLAP = "overlap";
/* The new booking only misses the existing one by less than the buffer. */
export const SCHEDULE_CONFLICT_TOO_CLOSE = "too-close";

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

export function isSampleSchedule(schedule) {
  return String(schedule?.source || "").trim().toLowerCase() === "sample";
}

export function getSampleSchedules() {
  return clone(SAMPLE_SCHEDULES).map(normalizeSchedule);
}

export function loadSchedules() {
  const storage = getStorage();
  if (!storage) return getSampleSchedules();

  const stored = storage.getItem(SCHEDULE_STORAGE_KEY);
  if (stored === null) {
    return getSampleSchedules();
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed.map(normalizeSchedule);
    return [];
  } catch (error) {
    // Khi dữ liệu JSON lỗi, không tự ý thay dữ liệu thật bằng dữ liệu mẫu để tránh ghi đè dữ liệu cũ
    return [];
  }
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

export function getScheduleOwner(schedule) {
  const item = schedule && typeof schedule === "object" ? schedule : {};
  return String(item.customerUsername || item.ownerUsername || "").trim();
}

/*
 * A pet only belongs to one customer, so a schedule can never clash with a
 * schedule of another customer even when both records reuse the same pet id.
 */
function isSameScheduleOwner(schedule, candidateOwner) {
  const scheduleOwner = getScheduleOwner(schedule).toLowerCase();
  const targetOwner = String(candidateOwner || "").trim().toLowerCase();
  if (!scheduleOwner || !targetOwner) return true;
  return scheduleOwner === targetOwner;
}

export function findScheduleConflicts(schedules, candidate, bufferMinutes = SCHEDULE_BUFFER_MINUTES) {
  const candidateInterval = getScheduleInterval(candidate);
  const candidatePetIds = getSchedulePetIds(candidate);
  const candidateOwner = getScheduleOwner(candidate);

  return (Array.isArray(schedules) ? schedules : []).filter((schedule) => {
    if (
      schedule.deletedAt ||
      ![SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(resolveScheduleStatus(schedule))
    ) return false;

    if (!isSameScheduleOwner(schedule, candidateOwner)) return false;

    const sharedPet = Array.from(getSchedulePetIds(schedule)).some((petId) => candidatePetIds.has(petId));
    if (!sharedPet) return false;

    const scheduleInterval = getScheduleInterval(schedule);
    if (!Number.isFinite(candidateInterval.start) || !Number.isFinite(scheduleInterval.start)) {
      // Records with an unusable date/time can only be compared as exact slots.
      return `${candidate.date || ""} ${candidate.time || ""}` === `${schedule.date || ""} ${schedule.time || ""}`;
    }

    // The pet needs `bufferMinutes` to move between two appointments.
    const gap = Math.max(
      candidateInterval.start - scheduleInterval.end,
      scheduleInterval.start - candidateInterval.end,
      0,
    );
    return gap < bufferMinutes;
  });
}

export function hasScheduleConflict(schedules, candidate, bufferMinutes = SCHEDULE_BUFFER_MINUTES) {
  return findScheduleConflicts(schedules, candidate, bufferMinutes).length > 0;
}

/*
 * Tells why a candidate clashes with an existing schedule: either the two
 * appointments overlap (the pet is booked during that whole window) or they
 * are simply closer than the buffer.
 */
export function getScheduleConflictType(schedule, candidate, bufferMinutes = SCHEDULE_BUFFER_MINUTES) {
  const candidateOwner = getScheduleOwner(candidate);
  if (!isSameScheduleOwner(schedule, candidateOwner)) return null;

  const candidatePetIds = getSchedulePetIds(candidate);
  const sharedPet = Array.from(getSchedulePetIds(schedule)).some((petId) => candidatePetIds.has(petId));
  if (!sharedPet) return null;

  const candidateInterval = getScheduleInterval(candidate);
  const scheduleInterval = getScheduleInterval(schedule);
  if (!Number.isFinite(candidateInterval.start) || !Number.isFinite(scheduleInterval.start)) {
    return SCHEDULE_CONFLICT_TOO_CLOSE;
  }

  const overlaps = candidateInterval.start <= scheduleInterval.end &&
    scheduleInterval.start <= candidateInterval.end;
  if (overlaps) return SCHEDULE_CONFLICT_OVERLAP;

  const gap = Math.max(
    candidateInterval.start - scheduleInterval.end,
    scheduleInterval.start - candidateInterval.end,
    0,
  );
  return gap < bufferMinutes ? SCHEDULE_CONFLICT_TOO_CLOSE : null;
}

function toScheduleMinutes(dateValue, timeValue) {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);
  const [hour, minute] = String(timeValue || "").split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return NaN;
  return Math.floor(Date.UTC(year, month - 1, day) / 60000) + hour * 60 + minute;
}

/*
 * The centre keeps a fixed number of cages for pet sitting: every cage holds
 * one pet, so at most PET_SITTING_CAPACITY pets can stay at the same time.
 */

/* Pets of a schedule that are taken in for pet sitting (one cage each). */
export function getSchedulePetSittingIds(schedule) {
  const item = schedule && typeof schedule === "object" ? schedule : {};
  const services = Array.isArray(item.petServices) ? item.petServices : [];
  const sittingIds = new Set(
    services
      .filter((entry) => Array.isArray(entry.services) && entry.services.includes(CARE_TYPE_PET_SITTING))
      .map((entry) => String(entry.petId)),
  );
  if (sittingIds.size) return sittingIds;
  // Legacy records only keep the stay window without the service list.
  if (item.endDate && item.endTime) return getSchedulePetIds(item);
  return new Set();
}

/* Cage type of a pet in a schedule: saved on the booking, else the pet size. */
export function resolveScheduleCageType(schedule, petId, petsById = new Map()) {
  const services = Array.isArray(schedule?.petServices) ? schedule.petServices : [];
  const entry = services.find((item) => String(item?.petId) === String(petId));
  if (entry?.cageType) return getPetSittingCageType(entry.cageType).code;
  const pet = petsById instanceof Map ? petsById.get(String(petId)) : null;
  if (pet) return getCageTypeForPetSize(pet.size);
  return DEFAULT_PET_SITTING_CAGE;
}

/*
 * Stay windows of every pet taken in for pet sitting, clipped to the window
 * of the candidate booking.
 */
function collectPetSittingRanges(schedules, candidate, { excludeScheduleId = null, pets = [] } = {}) {
  const candidateInterval = getScheduleInterval(candidate);
  const rangesByPet = new Map();
  if (!Number.isFinite(candidateInterval.start)) return rangesByPet;

  const windowStart = candidateInterval.start;
  const windowEnd = Math.max(candidateInterval.end, windowStart + 1);
  const petsById = new Map(
    (Array.isArray(pets) ? pets : []).map((pet) => [String(pet?.id), pet]),
  );

  const addRange = (petId, cageType, interval) => {
    if (!Number.isFinite(interval.start)) return;
    const start = Math.max(interval.start, windowStart);
    const end = Math.min(Math.max(interval.end, interval.start + 1), windowEnd);
    if (end <= start) return;
    const key = String(petId);
    if (!rangesByPet.has(key)) rangesByPet.set(key, { cageType, ranges: [] });
    rangesByPet.get(key).ranges.push({ start, end });
  };

  (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
    if (schedule.deletedAt) return;
    if (![SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(resolveScheduleStatus(schedule))) return;
    if (excludeScheduleId !== null && Number(schedule.id) === Number(excludeScheduleId)) return;
    const interval = getScheduleInterval(schedule);
    getSchedulePetSittingIds(schedule).forEach((petId) => {
      addRange(petId, resolveScheduleCageType(schedule, petId, petsById), interval);
    });
  });

  getSchedulePetSittingIds(candidate).forEach((petId) => {
    addRange(petId, resolveScheduleCageType(candidate, petId, petsById), candidateInterval);
  });

  return rangesByPet;
}

/* Highest number of pets staying at the same time, optionally per cage type. */
function getPeakFromRanges(rangesByPet, cageType = null) {
  const events = [];
  rangesByPet.forEach((entry) => {
    if (cageType && entry.cageType !== cageType) return;
    const merged = [];
    entry.ranges
      .slice()
      .sort((a, b) => a.start - b.start)
      .forEach((range) => {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
        else merged.push({ ...range });
      });
    merged.forEach((range) => {
      events.push({ at: range.start, delta: 1 });
      events.push({ at: range.end, delta: -1 });
    });
  });

  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let current = 0;
  let peak = 0;
  events.forEach((event) => {
    current += event.delta;
    if (current > peak) peak = current;
  });
  return peak;
}

/*
 * Highest number of pets that stay at the centre at the same time when the
 * candidate booking is added to the given schedules.
 */
export function getPetSittingPeakLoad(schedules, candidate, options = {}) {
  return getPeakFromRanges(collectPetSittingRanges(schedules, candidate, options));
}

/* Cage usage per cage type when the candidate booking is added. */
export function getPetSittingCageUsage(schedules, candidate, options = {}) {
  const rangesByPet = collectPetSittingRanges(schedules, candidate, options);
  const byType = {};
  PET_SITTING_CAGE_TYPES.forEach((cage) => {
    const used = getPeakFromRanges(rangesByPet, cage.code);
    byType[cage.code] = {
      code: cage.code,
      label: cage.label,
      used,
      capacity: cage.capacity,
      free: Math.max(cage.capacity - used, 0),
    };
  });

  const used = getPeakFromRanges(rangesByPet);
  return {
    byType,
    used,
    capacity: PET_SITTING_CAPACITY,
    free: Math.max(PET_SITTING_CAPACITY - used, 0),
  };
}

/* How many cages the candidate booking needs and how many are still free. */
export function getPetSittingCapacityUsage(schedules, candidate, options = {}) {
  const usage = getPetSittingCageUsage(schedules, candidate, options);
  return { used: usage.used, capacity: usage.capacity, free: usage.free };
}

function getScheduleInterval(schedule) {
  const item = schedule && typeof schedule === "object" ? schedule : {};
  const start = toScheduleMinutes(item.date, item.time);
  const hasRange = Boolean(item.endDate && item.endTime);
  const rangeEnd = hasRange ? toScheduleMinutes(item.endDate, item.endTime) : start;
  const end = Number.isFinite(rangeEnd) && rangeEnd > start ? rangeEnd : start;
  return { start, end, hasRange };
}

function getSchedulePetIds(schedule) {
  const values = [
    ...(Array.isArray(schedule?.petIds) ? schedule.petIds : []),
    ...(Array.isArray(schedule?.petServices) ? schedule.petServices.map((item) => item.petId) : []),
    schedule?.petId,
  ];
  return new Set(values.filter((value) => value !== "" && value !== null && value !== undefined).map(String));
}

export function clearSchedules() {
  getStorage()?.removeItem(SCHEDULE_STORAGE_KEY);
}

export default SAMPLE_SCHEDULES;
