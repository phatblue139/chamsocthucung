const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123456";
const AUTH_KEY = "neko:admin";

export function isAdminLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function login(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}