export const ADDRESS_STORAGE_KEY = "neko:addresses";
export const SHIPMENT_STORAGE_KEY = "neko:shipments";
export const DISTANCE_CONFIG_KEY = "neko:distance-config";
const DISTANCE_CONFIG_VERSION_KEY = `${DISTANCE_CONFIG_KEY}:version`;
const DISTANCE_CONFIG_VERSION = "2";
const PREVIOUS_CENTER_2_DISTANCES = new Map([
  ["A:CENTER_2", 3], ["B:CENTER_2", 6], ["C:CENTER_2", 9], ["D:CENTER_2", 15],
  ["HN_BA_DINH:CENTER_2", 3], ["HN_HOAN_KIEM:CENTER_2", 4], ["HN_TAY_HO:CENTER_2", 5],
  ["HN_DONG_DA:CENTER_2", 6], ["HN_HAI_BA_TRUNG:CENTER_2", 7], ["HN_LONG_BIEN:CENTER_2", 8],
  ["HN_CAU_GIAY:CENTER_2", 9], ["HN_THANH_XUAN:CENTER_2", 10], ["HN_BAC_TU_LIEM:CENTER_2", 11],
  ["HN_NAM_TU_LIEM:CENTER_2", 12], ["HN_HA_DONG:CENTER_2", 15],
]);

export const SHIPMENT_STATUS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PICKUP_EN_ROUTE: "Đang đến đón thú cưng",
  PICKED_UP: "Đã đón thú cưng",
  IN_TRANSIT: "Đang vận chuyển",
  ARRIVED: "Đã đến trung tâm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const SHIPMENT_STATUS_OPTIONS = Object.values(SHIPMENT_STATUS);

export const DEFAULT_DISTANCE_CONFIG = [
  { areaCode: "A", areaName: "Khu vực A", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 2 },
  { areaCode: "B", areaName: "Khu vực B", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 5 },
  { areaCode: "C", areaName: "Khu vực C", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 8 },
  { areaCode: "D", areaName: "Khu vực D", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 12 },
  { areaCode: "A", areaName: "Khu vực A", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 3 },
  { areaCode: "B", areaName: "Khu vực B", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 6 },
  { areaCode: "C", areaName: "Khu vực C", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 9 },
  { areaCode: "D", areaName: "Khu vực D", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 15 },
  { areaCode: "HN_BA_DINH", areaName: "Ba Đình", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 2 },
  { areaCode: "HN_HOAN_KIEM", areaName: "Hoàn Kiếm", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 3 },
  { areaCode: "HN_TAY_HO", areaName: "Tây Hồ", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 4 },
  { areaCode: "HN_DONG_DA", areaName: "Đống Đa", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 5 },
  { areaCode: "HN_HAI_BA_TRUNG", areaName: "Hai Bà Trưng", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 6 },
  { areaCode: "HN_LONG_BIEN", areaName: "Long Biên", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 7 },
  { areaCode: "HN_CAU_GIAY", areaName: "Cầu Giấy", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 8 },
  { areaCode: "HN_THANH_XUAN", areaName: "Thanh Xuân", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 9 },
  { areaCode: "HN_BAC_TU_LIEM", areaName: "Bắc Từ Liêm", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 10 },
  { areaCode: "HN_NAM_TU_LIEM", areaName: "Nam Từ Liêm", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 11 },
  { areaCode: "HN_HA_DONG", areaName: "Hà Đông", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 12 },
  { areaCode: "HN_BA_DINH", areaName: "Ba Đình", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 4 },
  { areaCode: "HN_HOAN_KIEM", areaName: "Hoàn Kiếm", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 5 },
  { areaCode: "HN_TAY_HO", areaName: "Tây Hồ", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 8 },
  { areaCode: "HN_DONG_DA", areaName: "Đống Đa", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 2 },
  { areaCode: "HN_HAI_BA_TRUNG", areaName: "Hai Bà Trưng", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 5 },
  { areaCode: "HN_LONG_BIEN", areaName: "Long Biên", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 10 },
  { areaCode: "HN_CAU_GIAY", areaName: "Cầu Giấy", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 6 },
  { areaCode: "HN_THANH_XUAN", areaName: "Thanh Xuân", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 5 },
  { areaCode: "HN_BAC_TU_LIEM", areaName: "Bắc Từ Liêm", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 12 },
  { areaCode: "HN_NAM_TU_LIEM", areaName: "Nam Từ Liêm", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 9 },
  { areaCode: "HN_HA_DONG", areaName: "Hà Đông", centerCode: "CENTER_2", centerName: "Đống Đa", distanceKm: 12 },
];

export const SHIPMENT_CENTERS = [
  { code: "CENTER_2", name: "Đống Đa" },
];

export const ADDRESS_LOCATION_OPTIONS = [
  {
    city: "Hà Nội",
    districts: [
      { name: "Ba Đình", areaCode: "HN_BA_DINH", wards: ["Phúc Xá", "Trúc Bạch", "Vĩnh Phúc", "Liễu Giai"] },
      { name: "Hoàn Kiếm", areaCode: "HN_HOAN_KIEM", wards: ["Hàng Bạc", "Hàng Trống", "Tràng Tiền", "Chương Dương"] },
      { name: "Tây Hồ", areaCode: "HN_TAY_HO", wards: ["Quảng An", "Nhật Tân", "Xuân La", "Bưởi"] },
      { name: "Đống Đa", areaCode: "HN_DONG_DA", wards: ["Cát Linh", "Văn Miếu", "Láng Thượng", "Trung Liệt"] },
      { name: "Hai Bà Trưng", areaCode: "HN_HAI_BA_TRUNG", wards: ["Bạch Mai", "Thanh Nhàn", "Minh Khai", "Vĩnh Tuy"] },
      { name: "Long Biên", areaCode: "HN_LONG_BIEN", wards: ["Ngọc Lâm", "Gia Thụy", "Bồ Đề", "Việt Hưng"] },
      { name: "Cầu Giấy", areaCode: "HN_CAU_GIAY", wards: ["Nghĩa Tân", "Dịch Vọng", "Mai Dịch", "Yên Hòa"] },
      { name: "Thanh Xuân", areaCode: "HN_THANH_XUAN", wards: ["Nhân Chính", "Khương Trung", "Khương Đình", "Hạ Đình"] },
      { name: "Bắc Từ Liêm", areaCode: "HN_BAC_TU_LIEM", wards: ["Cổ Nhuế", "Xuân Đỉnh", "Minh Khai", "Phú Diễn"] },
      { name: "Nam Từ Liêm", areaCode: "HN_NAM_TU_LIEM", wards: ["Cầu Diễn", "Mỹ Đình", "Mễ Trì", "Phú Đô"] },
      { name: "Hà Đông", areaCode: "HN_HA_DONG", wards: ["Mộ Lao", "Văn Quán", "Yết Kiêu", "Phú La"] },
    ],
  },
];

export function getAddressAreaCode(city, district) {
  const selectedCity = ADDRESS_LOCATION_OPTIONS.find((location) => location.city === String(city || "").trim());
  return selectedCity?.districts.find((item) => item.name === String(district || "").trim())?.areaCode || "";
}

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

export function getDistanceConfig() {
  const storage = getStorage();
  if (!storage) return [...DEFAULT_DISTANCE_CONFIG];

  try {
    const stored = storage.getItem(DISTANCE_CONFIG_KEY);
    if (!stored) {
      storage.setItem(DISTANCE_CONFIG_KEY, JSON.stringify(DEFAULT_DISTANCE_CONFIG));
      storage.setItem(DISTANCE_CONFIG_VERSION_KEY, DISTANCE_CONFIG_VERSION);
      return [...DEFAULT_DISTANCE_CONFIG];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.length) {
      storage.setItem(DISTANCE_CONFIG_KEY, JSON.stringify(DEFAULT_DISTANCE_CONFIG));
      storage.setItem(DISTANCE_CONFIG_VERSION_KEY, DISTANCE_CONFIG_VERSION);
      return [...DEFAULT_DISTANCE_CONFIG];
    }
    const savedKeys = new Set(parsed.map((row) => `${row.areaCode}:${row.centerCode}`));
    const newlyConfiguredRows = DEFAULT_DISTANCE_CONFIG.filter((row) => !savedKeys.has(`${row.areaCode}:${row.centerCode}`));
    let config = [...parsed, ...newlyConfiguredRows];
    if (storage.getItem(DISTANCE_CONFIG_VERSION_KEY) !== DISTANCE_CONFIG_VERSION) {
      const currentCenterRoutes = new Map(DEFAULT_DISTANCE_CONFIG
        .filter((row) => row.centerCode === "CENTER_2")
        .map((row) => [`${row.areaCode}:${row.centerCode}`, row]));
      config = config.map((row) => {
        const key = `${row.areaCode}:${row.centerCode}`;
        const currentRoute = currentCenterRoutes.get(key);
        return currentRoute && row.distanceKm === PREVIOUS_CENTER_2_DISTANCES.get(key)
          ? currentRoute
          : row;
      });
      storage.setItem(DISTANCE_CONFIG_KEY, JSON.stringify(config));
      storage.setItem(DISTANCE_CONFIG_VERSION_KEY, DISTANCE_CONFIG_VERSION);
    }
    return config;
  } catch (error) {
    return [...DEFAULT_DISTANCE_CONFIG];
  }
}

export function saveDistanceConfig(distanceConfig) {
  const storage = getStorage();
  if (!storage || !Array.isArray(distanceConfig)) return false;

  try {
    storage.setItem(DISTANCE_CONFIG_KEY, JSON.stringify(distanceConfig));
    storage.setItem(DISTANCE_CONFIG_VERSION_KEY, DISTANCE_CONFIG_VERSION);
    return true;
  } catch (error) {
    return false;
  }
}

export function getDistanceForLocation(areaCode, centerCode) {
  const code = String(areaCode || "").trim().toUpperCase();
  const center = String(centerCode || "").trim();
  return getDistanceConfig().find((location) =>
    location.areaCode === code && location.centerCode === center,
  ) || null;
}

export function normalizePetSize(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["small", "nhỏ", "tiny"].includes(raw)) return "small";
  if (["medium", "vừa", "mid"].includes(raw)) return "medium";
  if (["large", "lớn", "big"].includes(raw)) return "large";
  return raw;
}

export function getPetSizeLabel(size) {
  switch (normalizePetSize(size)) {
    case "small": return "Nhỏ";
    case "medium": return "Vừa";
    case "large": return "Lớn";
    default: return "Chưa chọn";
  }
}

export function calculateShipmentFee({ distanceKm, returnDistanceKm, petSize, transportType }) {
  const distance = Number(distanceKm);
  const size = normalizePetSize(petSize);
  const normalizedTransport = String(transportType || "").trim().toLowerCase();
  const type = normalizedTransport === "round-trip" || normalizedTransport === "hai-chieu" ? "round-trip" : "one-way";
  const returnDistance = returnDistanceKm == null || returnDistanceKm === ""
    ? distance
    : Number(returnDistanceKm);

  if (!Number.isFinite(distance) || distance < 0) {
    return { valid: false, message: "Thiếu thông tin khoảng cách mô phỏng để tính phí ship." };
  }
  if (type === "round-trip" && (!Number.isFinite(returnDistance) || returnDistance < 0)) {
    return { valid: false, message: "Thiếu thông tin khoảng cách địa chỉ trả để tính phí ship." };
  }
  if (!["small", "medium", "large"].includes(size)) {
    return { valid: false, message: "Vui lòng chọn nhóm kích thước thú cưng trước khi xác nhận ship." };
  }

  const baseFee = type === "round-trip" ? 35000 : 20000;
  if (distance > 15 || (type === "round-trip" && returnDistance > 15)) {
    return { valid: false, message: "Khoảng cách vượt phạm vi hỗ trợ hiện tại. Vui lòng xác nhận thủ công với NEKO." };
  }
  const legDistances = type === "round-trip" ? [distance, returnDistance] : [distance];
  const distanceFee = legDistances.reduce(
    (total, legDistance) => total + Math.ceil(Math.max(0, legDistance - 3)) * 5000,
    0,
  );

  const sizeFee = size === "small" ? 0 : size === "medium" ? 5000 : 10000;
  const total = baseFee + distanceFee + sizeFee;

  return {
    valid: true,
    transportType: type,
    baseFee,
    distanceFee,
    weightFee: 0,
    sizeFee,
    total,
    summary: {
      base: baseFee,
      distance: distanceFee,
      weight: 0,
      size: sizeFee,
    },
    message: type === "round-trip"
      ? "Vận chuyển hai chiều: phí quãng đường tính cho cả lượt đi và lượt về."
      : "Vận chuyển một chiều: phí gồm 3 km đầu, quãng đường vượt mức và kích thước thú cưng.",
  };
}

export function validateShipmentAddress(address) {
  return Boolean(address && String(address.ownerUsername || "").trim() && String(address.name || "").trim());
}

export function getAddressStorage() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const saved = storage.getItem(ADDRESS_STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function saveAddressStorage(addresses) {
  const storage = getStorage();
  if (!storage || !Array.isArray(addresses)) return false;

  try {
    storage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
    return true;
  } catch (error) {
    return false;
  }
}

export function getShipmentStorage() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const saved = storage.getItem(SHIPMENT_STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function saveShipmentStorage(shipments) {
  const storage = getStorage();
  if (!storage || !Array.isArray(shipments)) return false;

  try {
    storage.setItem(SHIPMENT_STORAGE_KEY, JSON.stringify(shipments));
    return true;
  } catch (error) {
    return false;
  }
}

export function getNextShipmentId(shipments = getShipmentStorage()) {
  const ids = Array.isArray(shipments)
    ? shipments.map((shipment) => Number(shipment?.id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function validateShippingPet(pet) {
  if (!pet || !String(pet.name || "").trim()) {
    return { valid: false, message: "Vui lòng chọn thú cưng đã đăng ký để ship." };
  }
  if (!["small", "medium", "large"].includes(normalizePetSize(pet.size))) {
    return { valid: false, message: "Thú cưng thiếu nhóm kích thước. Vui lòng cập nhật hồ sơ thú cưng trước khi đặt ship." };
  }
  return { valid: true };
}
