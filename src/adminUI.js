import { isAdminLoggedIn, login } from "./auth.js";

export function initAdminUI() {
  const loginDialog = document.getElementById("loginDialog");
  const loginBtn = document.getElementById("loginBtn");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const adminLinks = document.querySelectorAll(".admin-link");

  function updateAuthUI() {
    adminLinks.forEach((link) => {
      link.hidden = !isAdminLoggedIn();
    });
    if (loginBtn) loginBtn.hidden = isAdminLoggedIn();
  }

  if (loginBtn && loginDialog) {
    loginBtn.addEventListener("click", () => {
      loginForm?.reset();
      if (loginError) loginError.hidden = true;
      loginDialog.showModal();
    });
  }

  const cancelBtn = document.getElementById("loginCancelBtn");
  if (cancelBtn && loginDialog) {
    cancelBtn.addEventListener("click", () => loginDialog.close());
  }

  if (loginDialog) {
    loginDialog.addEventListener("click", (event) => {
      const rect = loginDialog.getBoundingClientRect();
      const inBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inBounds) loginDialog.close();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;
      const ok = login(username, password);
      if (ok) {
        loginDialog?.close();
        location.href = "/src/careSchedules.html";
      } else if (loginError) {
        loginError.hidden = false;
      }
    });
  }

  updateAuthUI();
}