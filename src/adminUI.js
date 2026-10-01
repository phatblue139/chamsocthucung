import {
  getCurrentRole,
  getCurrentUser,
  login,
  logout,
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
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const navCta = document.getElementById("navCta");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const adminLinks = document.querySelectorAll(".admin-link");
  const userLinks = document.querySelectorAll(".user-link");
  const userGreeting = document.querySelector("[data-user-greeting]");
  const userName = document.querySelector("[data-user-name]");

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
    // Đã đăng nhập thì bỏ "Đặt lịch ngay", dùng "Đặt lịch của tôi" thay thế.
    if (navCta) navCta.hidden = isLoggedIn;
    if (userGreeting && currentUser) userGreeting.textContent = currentUser.fullName;

    if (userName) {
      userName.hidden = !isLoggedIn;
      if (isLoggedIn) {
        userName.textContent = currentUser
          ? currentUser.fullName
          : "Quản trị viên";
      } else {
        userName.textContent = "";
      }
    }

    window.dispatchEvent(new CustomEvent("neko:authchange", { detail: { role, currentUser } }));
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      resetDialog(loginDialog);
      openDialog(loginDialog);
      getField(loginForm, "username")?.focus();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logout();
      window.location.href = "/";
    });
  }

  const closeButtons = [
    ...document.querySelectorAll("[data-close-dialog]"),
    ...[loginDialog]
      .filter(Boolean)
      .map((dialog) => dialog.querySelector("[data-close-dialog]"))
      .filter(Boolean),
  ];

  new Set(closeButtons).forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("dialog")?.close();
    });
  });

  [loginDialog].forEach((dialog) => {
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
      loginForm.reset();

      // Khách đăng nhập vẫn ở lại trang hiện tại, chỉ cập nhật giao diện.
      if (getCurrentRole() === "admin") {
        window.location.href = "/src/careSchedules.html";
        return;
      }

      updateAuthUI();
    });
  }

  window.addEventListener("storage", updateAuthUI);
  updateAuthUI();
}

export const initAuthUI = initAdminUI;
