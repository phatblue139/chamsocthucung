import {
  getCurrentRole,
  getCurrentUser,
  login,
  logout,
  registerUser,
} from "./auth.js";

function getField(form, name) {
  return form?.elements?.namedItem(name) || null;
}

function openDialog(dialog) {
  if (dialog && !dialog.open) dialog.showModal();
}

function resetDialog(dialog) {
  dialog?.querySelector("form")?.reset();
  const error = dialog?.querySelector("[data-auth-error]") || dialog?.querySelector(".login-error");
  if (error) {
    error.hidden = true;
    error.textContent = "";
  }
}

function setError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

export function initAdminUI() {
  const loginDialog = document.getElementById("loginDialog");
  const registerDialog = document.getElementById("registerDialog");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const adminLinks = document.querySelectorAll(".admin-link");
  const userLinks = document.querySelectorAll(".user-link");
  const contactCta = document.querySelector("[data-contact-cta]");
  const userGreeting = document.querySelector("[data-user-greeting]");

  function updateAuthUI() {
    const role = getCurrentRole();
    const currentUser = getCurrentUser();
    const isLoggedIn = Boolean(role);

    adminLinks.forEach((link) => {
      link.hidden = role !== "admin";
    });
    userLinks.forEach((link) => {
      link.hidden = role !== "user";
    });
    if (loginBtn) loginBtn.hidden = isLoggedIn;
    if (registerBtn) registerBtn.hidden = isLoggedIn;
    if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
    if (contactCta) contactCta.hidden = isLoggedIn;

    if (userGreeting) {
      const displayName = role === "admin"
        ? "Quản trị viên"
        : currentUser?.fullName || currentUser?.username || "";

      userGreeting.textContent = displayName;
      userGreeting.hidden = !displayName;
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const role = getCurrentRole();
      if (role === "user") {
        location.href = "/user.html";
        return;
      }
      if (role === "admin") {
        location.href = "/src/admin.html";
        return;
      }
      resetDialog(loginDialog);
      openDialog(loginDialog);
      getField(loginForm, "username")?.focus();
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      resetDialog(registerDialog);
      openDialog(registerDialog);
      getField(registerForm, "fullName")?.focus();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logout();
      location.href = "/";
    });
  }

  const closeButtons = [
    ...document.querySelectorAll("[data-close-dialog]"),
    ...[loginDialog, registerDialog]
      .filter(Boolean)
      .map((dialog) => dialog.querySelector("[data-close-dialog]"))
      .filter(Boolean),
  ];

  new Set(closeButtons).forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("dialog")?.close();
    });
  });

  [loginDialog, registerDialog].forEach((dialog) => {
    if (!dialog) return;
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = getField(loginForm, "username")?.value.trim() || "";
      const password = getField(loginForm, "password")?.value || "";
      const ok = login(username, password);

      if (!ok) {
        setError(loginError, "Sai tên đăng nhập hoặc mật khẩu!");
        return;
      }

      loginDialog?.close();
      location.href = getCurrentRole() === "admin" ? "/src/admin.html" : "/user.html";
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const fullName = getField(registerForm, "fullName")?.value.trim() || "";
      const username = getField(registerForm, "username")?.value.trim() || "";
      const phone = getField(registerForm, "phone")?.value.trim() || "";
      const password = getField(registerForm, "password")?.value || "";
      const confirmPassword = getField(registerForm, "confirmPassword")?.value || "";

      if (!fullName || !username || !phone || !password) {
        setError(registerError, "Vui lòng điền đầy đủ thông tin đăng ký.");
        return;
      }

      if (password.length < 6) {
        setError(registerError, "Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }

      if (password !== confirmPassword) {
        setError(registerError, "Mật khẩu xác nhận không khớp.");
        return;
      }

      const result = registerUser({ fullName, username, phone, password });
      if (!result.success) {
        setError(registerError, result.error);
        return;
      }

      if (!login(username, password)) {
        setError(registerError, "Tài khoản đã tạo nhưng chưa đăng nhập được. Vui lòng thử đăng nhập lại.");
        return;
      }

      registerDialog?.close();
      location.href = "/user.html";
    });
  }

  window.addEventListener("storage", updateAuthUI);
  updateAuthUI();
}

export const initAuthUI = initAdminUI;
