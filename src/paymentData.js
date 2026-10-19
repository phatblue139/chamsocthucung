export const PAYMENT_PREFERENCE_STORAGE_KEY = "neko:paymentPreferences";
export const DEFAULT_PAYMENT_METHOD = "at-center";

const PAYMENT_METHODS = new Set([DEFAULT_PAYMENT_METHOD, "bank-transfer", "wallet"]);
const WALLET_STORAGE_PREFIX = "neko:wallet:";

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

function getWalletKey(username) {
  const normalizedUsername = normalizeUsername(username);
  return normalizedUsername ? `${WALLET_STORAGE_PREFIX}${encodeURIComponent(normalizedUsername)}` : "";
}

function readWalletTransactions(storageKey) {
  const storage = getStorage();
  if (!storage || !storageKey) return [];

  try {
    const parsed = JSON.parse(storage.getItem(storageKey) || "null");
    if (!Array.isArray(parsed?.transactions)) return [];
    return parsed.transactions.filter((transaction) =>
      ["top-up", "payment", "withdrawal"].includes(transaction?.type) &&
      Number.isSafeInteger(transaction.amount) && transaction.amount > 0,
    );
  } catch (error) {
    return [];
  }
}

export function loadWallet(username) {
  const transactions = readWalletTransactions(getWalletKey(username));
  const balance = transactions.reduce((total, transaction) =>
    total + (transaction.type === "top-up" ? transaction.amount : -transaction.amount), 0,
  );
  return { balance: Math.max(0, balance), transactions };
}

function recordWalletTransaction(username, type, amount, description) {
  const storage = getStorage();
  const storageKey = getWalletKey(username);
  if (!storage || !storageKey || !Number.isSafeInteger(amount) || amount <= 0) return false;

  const transactions = readWalletTransactions(storageKey);
  const balance = transactions.reduce((total, transaction) =>
    total + (transaction.type === "top-up" ? transaction.amount : -transaction.amount), 0,
  );
  if (type !== "top-up" && balance < amount) return false;

  transactions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    description,
    status: type === "withdrawal" ? "pending" : "completed",
    createdAt: new Date().toISOString(),
  });
  try {
    storage.setItem(storageKey, JSON.stringify({ transactions }));
    return true;
  } catch (error) {
    return false;
  }
}

export function topUpWallet(username, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  return recordWalletTransaction(username, "top-up", amount, "Nạp thử nghiệm");
}

export function chargeWallet(username, amount, description = "Thanh toán lịch chăm sóc") {
  return recordWalletTransaction(username, "payment", amount, description);
}

export function requestWalletWithdrawal(username, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  return recordWalletTransaction(username, "withdrawal", amount, "Yêu cầu rút tiền (mô phỏng)");
}