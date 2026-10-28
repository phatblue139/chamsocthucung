import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";

initSiteHeader();

const user = getCurrentUser();
if (!user) {
  location.replace("/");
} else {
  initProfile(user);
}

const BANK_ACCOUNT_STORAGE_KEY = "neko:bankAccounts";

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

function loadBankAccount(username) {
  const storage = getStorage();
  const normalized = normalizeUsername(username);
  if (!storage || !normalized) return null;
  try {
    const parsed = JSON.parse(storage.getItem(BANK_ACCOUNT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed[normalized] || null : null;
  } catch (error) {
    return null;
  }
}

function saveBankAccount(username, data) {
  const storage = getStorage();
  const normalized = normalizeUsername(username);
  if (!storage || !normalized) return false;
  try {
    const parsed = JSON.parse(storage.getItem(BANK_ACCOUNT_STORAGE_KEY) || "{}");
    const accounts = parsed && typeof parsed === "object" ? parsed : {};
    accounts[normalized] = data;
    storage.setItem(BANK_ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    return false;
  }
}

function initProfile(user) {
  const fullNameEl = document.getElementById("profileFullName");
  const usernameEl = document.getElementById("profileUsername");
  const phoneEl = document.getElementById("profilePhone");
  const form = document.getElementById("bankAccountForm");
  const bankNameInput = document.getElementById("bankName");
  const bankAccountNumberInput = document.getElementById("bankAccountNumber");
  const bankAccountNameInput = document.getElementById("bankAccountName");
  const messageEl = document.getElementById("bankAccountMessage");

  if (fullNameEl) fullNameEl.textContent = user.fullName || "-";
  if (usernameEl) usernameEl.textContent = user.username || "-";
  if (phoneEl) phoneEl.textContent = user.phone || "-";

  const existing = loadBankAccount(user.username);
  if (existing) {
    if (bankNameInput) bankNameInput.value = existing.bankName || "";
    if (bankAccountNumberInput) bankAccountNumberInput.value = existing.bankAccountNumber || "";
    if (bankAccountNameInput) bankAccountNameInput.value = existing.bankAccountName || "";
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = {
      bankName: bankNameInput?.value.trim() || "",
      bankAccountNumber: bankAccountNumberInput?.value.trim() || "",
      bankAccountName: bankAccountNameInput?.value.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    if (saveBankAccount(user.username, data)) {
      if (messageEl) messageEl.textContent = "Đã lưu thông tin tài khoản ngân hàng.";
      if (messageEl) messageEl.className = "user-form-message is-success";
    } else {
      if (messageEl) messageEl.textContent = "Không thể lưu thông tin. Vui lòng thử lại.";
      if (messageEl) messageEl.className = "user-form-message is-error";
    }
  });
}