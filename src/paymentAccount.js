import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  DEFAULT_PAYMENT_METHOD,
  loadPaymentPreference,
  savePaymentPreference,
} from "./paymentData.js";

initSiteHeader();

const user = getCurrentUser();
if (!user) {
  location.replace("/");
} else {
  initPaymentAccount(user);
}

function initPaymentAccount(user) {
  const preferenceForm = document.getElementById("userPaymentPreferenceForm");
  const preferenceMessage = document.getElementById("userPaymentPreferenceMessage");
  const walletSection = document.querySelector(".user-wallet-section");

  if (walletSection) walletSection.remove();

  preferenceForm?.querySelectorAll('input[name="paymentPreference"]').forEach((input) => {
    if (input.value === "wallet") {
      const label = input.closest("label");
      if (label) label.remove();
      else input.remove();
      return;
    }
    input.checked = input.value === loadPaymentPreference(user.username);
  });

  preferenceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(preferenceForm);
    const method = String(formData.get("paymentPreference") || DEFAULT_PAYMENT_METHOD);
    if (method === "wallet") {
      if (preferenceMessage) preferenceMessage.textContent = "Phương thức thanh toán không còn khả dụng.";
      return;
    }
    if (!savePaymentPreference(user.username, method)) {
      if (preferenceMessage) preferenceMessage.textContent = "Không thể lưu phương thức thanh toán. Vui lòng thử lại.";
      return;
    }
    if (preferenceMessage) preferenceMessage.textContent = "Đã lưu phương thức mặc định cho các lần đặt lịch tiếp theo.";
  });
}