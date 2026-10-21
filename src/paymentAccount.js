import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import { formatCurrency } from "./careScheduleData.js";
import {
  DEFAULT_PAYMENT_METHOD,
  loadPaymentPreference,
  loadWallet,
  requestWalletWithdrawal,
  savePaymentPreference,
  topUpWallet,
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
  const topUpForm = document.getElementById("userWalletTopUpForm");
  const withdrawForm = document.getElementById("userWalletWithdrawForm");
  const walletMessage = document.getElementById("userWalletMessage");
  const withdrawMessage = document.getElementById("userWalletWithdrawMessage");
  const walletBalance = document.getElementById("userWalletBalance");
  const walletTransactions = document.getElementById("userWalletTransactions");
  const walletEmpty = document.getElementById("userWalletEmpty");

  preferenceForm?.querySelectorAll('input[name="paymentPreference"]').forEach((input) => {
    input.checked = input.value === loadPaymentPreference(user.username);
  });
  renderWallet();

  preferenceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const method = String(new FormData(preferenceForm).get("paymentPreference") || DEFAULT_PAYMENT_METHOD);
    if (!savePaymentPreference(user.username, method)) {
      if (preferenceMessage) preferenceMessage.textContent = "Không thể lưu phương thức thanh toán. Vui lòng thử lại.";
      return;
    }
    if (preferenceMessage) preferenceMessage.textContent = "Đã lưu phương thức mặc định cho các lần đặt lịch tiếp theo.";
  });

  topUpForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(new FormData(topUpForm).get("amount"));
    if (!topUpWallet(user.username, amount)) {
      if (walletMessage) walletMessage.textContent = "Số tiền nạp không hợp lệ hoặc không thể lưu ví.";
      return;
    }

    topUpForm.reset();
    if (walletMessage) walletMessage.textContent = `Đã nạp thử ${formatCurrency(amount)} vào ví mẫu.`;
    renderWallet();
    window.dispatchEvent(new Event("neko:wallet-updated"));
  });

  withdrawForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(withdrawForm);
    const amount = Number(formData.get("amount"));
    const destination = {
      bank: formData.get("bank"),
      accountNumber: formData.get("accountNumber"),
      accountName: formData.get("accountName"),
    };
    if (!requestWalletWithdrawal(user.username, amount, destination)) {
      if (withdrawMessage) withdrawMessage.textContent = "Vui lòng kiểm tra thông tin ngân hàng, số tài khoản, tên chủ tài khoản và số dư khả dụng.";
      return;
    }

    withdrawForm.reset();
    if (withdrawMessage) {
      withdrawMessage.textContent = `Đã ghi nhận yêu cầu rút ${formatCurrency(amount)} về ${destination.bank}, tài khoản ${destination.accountNumber} (${destination.accountName}), đang chờ xử lý (mô phỏng).`;
    }
    renderWallet();
    window.dispatchEvent(new Event("neko:wallet-updated"));
  });

  function renderWallet() {
    const wallet = loadWallet(user.username);
    if (walletBalance) walletBalance.textContent = formatCurrency(wallet.balance) || "0đ";
    if (!walletTransactions) return;

    walletTransactions.replaceChildren();
    wallet.transactions.slice(-5).reverse().forEach((transaction) => {
      const row = document.createElement("li");
      const description = document.createElement("span");
      description.textContent = transaction.description ||
        (transaction.type === "payment" ? "Thanh toán" : transaction.type === "withdrawal" ? "Rút tiền" : "Nạp ví");
      if (transaction.type === "withdrawal" && transaction.destination) {
        const { bank, accountNumber, accountName } = transaction.destination;
        description.textContent = `Rút tiền · ${bank} · ${accountNumber} · ${accountName}`;
      }
      const date = document.createElement("small");
      const dateLabel = new Date(transaction.createdAt).toLocaleDateString("vi-VN");
      date.textContent = transaction.type === "withdrawal" && transaction.status === "pending"
        ? `${dateLabel} · Chờ xử lý`
        : dateLabel;
      const amount = document.createElement("strong");
      amount.textContent = `${transaction.type === "top-up" ? "+" : "−"}${formatCurrency(transaction.amount)}`;
      row.append(description, date, amount);
      walletTransactions.appendChild(row);
    });
    if (walletEmpty) walletEmpty.hidden = wallet.transactions.length > 0;
  }
}