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

  const statusMap = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
  };
  const rawStatus = String(item.status || "").trim();
  const status = statusMap[rawStatus.toLowerCase()] || rawStatus || (source === "user" ? "Chờ xác nhận" : "Đã xác nhận");

  return {
    ...item,
    id,
    petId: item.petId || "",
    petName: String(item.petName || "").trim(),
    careType: String(item.careType || "").trim(),
    date: String(item.date || "").trim(),
    time: String(item.time || "").trim(),
    note: String(item.note || "").trim(),
    customerUsername,
    customerName,
    customerPhone,
    status,
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
