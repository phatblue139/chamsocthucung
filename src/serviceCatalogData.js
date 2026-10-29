export const SERVICE_CATALOG_STORAGE_KEY = "neko:serviceCatalog";
export const CARE_TYPE_PET_SITTING = "Trông coi thú cưng";
export const PET_SITTING_HOURLY_RATE = 10000;
export const PET_SITTING_DAILY_RATE = 150000;
export const PET_SITTING_CAGE_TYPES = [
  { code: "small", label: "Chuồng nhỏ", capacity: 3, fee: 20000 },
  { code: "medium", label: "Chuồng vừa", capacity: 5, fee: 30000 },
  { code: "large", label: "Chuồng lớn", capacity: 2, fee: 50000 },
];

const DEFAULT_SERVICE_CATALOG = [
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

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function cloneCatalog(catalog) {
  return catalog.map((service) => ({
    ...service,
    ...(Array.isArray(service.cageTypes)
      ? { cageTypes: service.cageTypes.map((cage) => ({ ...cage })) }
      : {}),
  }));
}

function normalizeCatalog(catalog) {
  if (!Array.isArray(catalog)) return null;
  const normalized = catalog
    .filter((service) => service && typeof service === "object")
    .map((service) => ({
      ...service,
      id: String(service.id || "").trim(),
      value: String(service.value || service.name || "").trim(),
      name: String(service.name || service.value || "").trim(),
      description: String(service.description || "").trim(),
      icon: String(service.icon || "🐾").trim(),
      active: service.active !== false,
    }));
  const sittingService = normalized.find((service) => service.id === "pet-sitting");
  if (!sittingService) {
    normalized.push(cloneCatalog(DEFAULT_SERVICE_CATALOG.filter((service) => service.id === "pet-sitting"))[0]);
  }
  return normalized;
}

function readCatalog() {
  const storage = getStorage();
  if (!storage) return cloneCatalog(DEFAULT_SERVICE_CATALOG);
  try {
    const stored = storage.getItem(SERVICE_CATALOG_STORAGE_KEY);
    if (stored === null) return cloneCatalog(DEFAULT_SERVICE_CATALOG);
    const catalog = normalizeCatalog(JSON.parse(stored));
    return catalog || cloneCatalog(DEFAULT_SERVICE_CATALOG);
  } catch (error) {
    return cloneCatalog(DEFAULT_SERVICE_CATALOG);
  }
}

function getCareTypes(catalog) {
  return catalog
    .filter((service) => service.active && Number.isFinite(Number(service.price)))
    .map(({ value, price }) => ({ value, price: Number(price) }));
}

function refreshCatalog() {
  SERVICE_CATALOG = readCatalog();
  CARE_TYPES = getCareTypes(SERVICE_CATALOG);
  CARE_TYPE_PRICES = createPriceMap(CARE_TYPES);
}

function createPriceMap(careTypes) {
  return careTypes.reduce((map, item) => {
    map[item.value] = item.price;
    return map;
  }, {});
}

export let SERVICE_CATALOG = readCatalog();
export let CARE_TYPES = getCareTypes(SERVICE_CATALOG);
let CARE_TYPE_PRICES = createPriceMap(CARE_TYPES);

export function loadServiceCatalog() {
  return cloneCatalog(readCatalog());
}

export function saveServiceCatalog(catalog) {
  const storage = getStorage();
  const normalized = normalizeCatalog(catalog);
  if (!storage || !normalized) return false;
  if (
    normalized.some((service) =>
      !service.id ||
      !service.value ||
      !service.name ||
      (service.id !== "pet-sitting" &&
        (!Number.isFinite(Number(service.price)) || Number(service.price) < 0)),
    ) ||
    new Set(normalized.map((service) => service.id)).size !== normalized.length ||
    new Set(normalized.map((service) => service.value.toLocaleLowerCase("vi"))).size !== normalized.length
  ) return false;

  try {
    storage.setItem(SERVICE_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
    refreshCatalog();
    return true;
  } catch (error) {
    return false;
  }
}

export function getCareTypePrice(careType) {
  const services = Array.isArray(careType)
    ? careType
    : String(careType || "").split(" · ");
  return services.reduce((total, service) => total + (CARE_TYPE_PRICES[String(service || "").trim()] ?? 0), 0);
}

export function isKnownCareType(careType) {
  return Object.prototype.hasOwnProperty.call(CARE_TYPE_PRICES, String(careType || "").trim());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SERVICE_CATALOG_STORAGE_KEY) refreshCatalog();
  });
}
