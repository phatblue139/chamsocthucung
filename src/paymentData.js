export const PAYMENT_PREFERENCE_STORAGE_KEY = "neko:paymentPreferences";
export const DEFAULT_PAYMENT_METHOD = "at-center";

const PAYMENT_METHODS = new Set([DEFAULT_PAYMENT_METHOD, "bank-transfer"]);

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

function readPreferences(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(PAYMENT_PREFERENCE_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function loadPaymentPreference(username) {
  const normalizedUsername = normalizeUsername(username);
  const storage = getStorage();
  if (!normalizedUsername || !storage) return DEFAULT_PAYMENT_METHOD;

  const method = readPreferences(storage)[normalizedUsername];
  return PAYMENT_METHODS.has(method) ? method : DEFAULT_PAYMENT_METHOD;
}

export function savePaymentPreference(username, method) {
  const normalizedUsername = normalizeUsername(username);
  const storage = getStorage();
  if (!normalizedUsername || !storage || !PAYMENT_METHODS.has(method)) return false;

  const preferences = readPreferences(storage);
  preferences[normalizedUsername] = method;
  try {
    storage.setItem(PAYMENT_PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch (error) {
    return false;
  }
}