import sampleAccounts from "./sampleAccounts.json" with { type: "json" };

const ADMIN_USERNAME = "admin";
const SAMPLE_ADMIN = sampleAccounts.find((account) => account.role === "admin");
const ADMIN_AUTH_KEY = "neko:admin";
const USER_AUTH_KEY = "neko:user";
const USERS_KEY = "neko:users";

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function readUsers() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const storedUsers = storage.getItem(USERS_KEY);
    if (storedUsers === null) {
      const sampleUsers = sampleAccounts
        .filter((account) => account.role === "user")
        .map(({ role, ...user }) => ({ ...user, createdAt: "2026-01-01T00:00:00.000Z" }));
      saveUsers(sampleUsers);
      return sampleUsers;
    }

    const users = JSON.parse(storedUsers);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch (error) {
    return false;
  }
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    phone: user.phone || "",
  };
}

export function registerUser({ username = "", password = "", fullName = "", phone = "" } = {}) {
  const normalizedUsername = normalizeUsername(username);
  const cleanPassword = String(password || "");
  const cleanFullName = String(fullName || "").trim();
  const cleanPhone = String(phone || "").trim();

  if (!/^\S{3,30}$/.test(normalizedUsername)) {
    return { success: false, error: "Tên đăng nhập phải dài từ 3 đến 30 ký tự và không có khoảng trắng." };
  }

  if (cleanPassword.length < 6) {
    return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự." };
  }

  if (sampleAccounts.some((account) => account.role === "admin" && normalizeUsername(account.username) === normalizedUsername)) {
    return { success: false, error: "Tên đăng nhập này không dành cho người dùng." };
  }

  const users = readUsers();
  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    return { success: false, error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." };
  }

  const user = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: normalizedUsername,
    password: cleanPassword,
    fullName: cleanFullName || normalizedUsername,
    phone: cleanPhone,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  if (!saveUsers(users)) {
    return { success: false, error: "Không thể lưu tài khoản. Vui lòng thử lại." };
  }

  return { success: true, user: toPublicUser(user) };
}

export function register(data) {
  return registerUser(data);
}

export function login(username, password) {
  const storage = getStorage();
  if (!storage) return false;

  const normalizedUsername = normalizeUsername(username);
  const cleanPassword = String(password || "");

  if (SAMPLE_ADMIN && normalizedUsername === ADMIN_USERNAME && cleanPassword === SAMPLE_ADMIN.password) {
    storage.setItem(ADMIN_AUTH_KEY, "true");
    storage.removeItem(USER_AUTH_KEY);
    return true;
  }

  const user = readUsers().find((item) => normalizeUsername(item.username) === normalizedUsername);
  if (!user || user.password !== cleanPassword) return false;

  storage.removeItem(ADMIN_AUTH_KEY);
  storage.setItem(USER_AUTH_KEY, JSON.stringify({
    userId: user.id,
    username: user.username,
    loggedInAt: new Date().toISOString(),
  }));
  return true;
}

export function getCurrentUser() {
  const storage = getStorage();
  if (!storage || storage.getItem(ADMIN_AUTH_KEY) === "true") return null;

  try {
    const session = JSON.parse(storage.getItem(USER_AUTH_KEY) || "null");
    if (!session?.username) return null;

    const user = readUsers().find((item) => normalizeUsername(item.username) === normalizeUsername(session.username));
    if (!user) {
      storage.removeItem(USER_AUTH_KEY);
      return null;
    }

    return toPublicUser(user);
  } catch (error) {
    storage.removeItem(USER_AUTH_KEY);
    return null;
  }
}

export function isAdminLoggedIn() {
  return getStorage()?.getItem(ADMIN_AUTH_KEY) === "true";
}

export function isUserLoggedIn() {
  return Boolean(getCurrentUser());
}

export function getCurrentRole() {
  if (isAdminLoggedIn()) return "admin";
  if (isUserLoggedIn()) return "user";
  return null;
}

export function logout() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ADMIN_AUTH_KEY);
  storage.removeItem(USER_AUTH_KEY);
}

export function logoutUser() {
  getStorage()?.removeItem(USER_AUTH_KEY);
}
