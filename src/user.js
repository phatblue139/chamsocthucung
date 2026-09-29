import "./style.css";
import { getCurrentUser, logoutUser } from "./auth.js";
import {
  SCHEDULE_STORAGE_KEY,
  getNextScheduleId,
  loadSchedules,
  saveSchedules,
} from "./careScheduleData.js";

const currentUser = getCurrentUser();

if (!currentUser) {
  location.replace("/");
} else {
  initUserView(currentUser);
}

function initUserView(user) {
  const logoutBtn = document.getElementById("userLogoutBtn");
  const greeting = document.getElementById("userGreeting");
  const form = document.getElementById("userScheduleForm");
  const message = document.getElementById("userScheduleMessage");
  const list = document.getElementById("userScheduleList");
  const empty = document.getElementById("userScheduleEmpty");
  const count = document.getElementById("userScheduleCount");
  let schedules = loadSchedules();

  if (greeting) greeting.textContent = user.fullName || user.username;

  logoutBtn?.addEventListener("click", () => {
    logoutUser();
    location.replace("/");
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const latestSchedules = loadSchedules();
    const schedule = {
      id: getNextScheduleId(latestSchedules),
      petName: String(formData.get("petName") || "").trim(),
      careType: String(formData.get("careType") || "").trim(),
      date: String(formData.get("date") || "").trim(),
      time: String(formData.get("time") || "").trim(),
      note: String(formData.get("note") || "").trim(),
      customerUsername: user.username,
      customerName: user.fullName || user.username,
      customerPhone: user.phone || "",
      status: "Chờ xác nhận",
      source: "user",
      createdAt: new Date().toISOString(),
    };

    if (schedule.note.length > 500) {
      showMessage("Ghi chú không được vượt quá 500 ký tự.", "error");
      return;
    }

    const nextSchedules = [...latestSchedules, schedule];
    if (!saveSchedules(nextSchedules)) {
      showMessage("Không thể lưu lịch. Vui lòng thử lại.", "error");
      return;
    }

    schedules = nextSchedules;
    form.reset();
    render();
    showMessage("Đã gửi lịch chăm sóc tới NEKO. Chúng tôi sẽ liên hệ xác nhận sớm nhất.", "success");
  });

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== SCHEDULE_STORAGE_KEY) return;
    schedules = loadSchedules();
    render();
  });

  function render() {
    if (!list || !empty || !count) return;

    const userSchedules = schedules
      .filter((schedule) => (schedule.customerUsername || schedule.ownerUsername) === user.username)
      .sort((first, second) => {
        const firstValue = `${first.date || ""} ${first.time || ""}`;
        const secondValue = `${second.date || ""} ${second.time || ""}`;
        return firstValue.localeCompare(secondValue);
      });

    list.replaceChildren();
    count.textContent = `${userSchedules.length} lịch`;
    empty.hidden = userSchedules.length > 0;

    userSchedules.forEach((schedule) => {
      const card = document.createElement("article");
      card.className = "user-schedule-card";

      const heading = document.createElement("div");
      heading.className = "user-schedule-card-heading";

      const petName = document.createElement("h3");
      petName.textContent = schedule.petName || "Thú cưng";
      heading.appendChild(petName);

      const status = document.createElement("span");
      status.className = `user-schedule-status ${statusClass(schedule.status)}`;
      status.textContent = schedule.status || "Chờ xác nhận";
      heading.appendChild(status);

      const details = document.createElement("div");
      details.className = "user-schedule-details";
      details.textContent = `${formatDate(schedule.date)} · ${schedule.time || ""} · ${schedule.careType || "Chăm sóc"}`;
      card.appendChild(heading, details);

      if (schedule.note) {
        const note = document.createElement("p");
        note.className = "user-schedule-note";
        note.textContent = schedule.note;
        card.appendChild(note);
      }

      list.appendChild(card);
    });
  }

  render();
}

function formatDate(value) {
  if (!value) return "Chưa chọn ngày";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function statusClass(status) {
  if (status === "Đã xác nhận") return "confirmed";
  if (status === "Đã hoàn thành") return "completed";
  if (status === "Đã hủy") return "cancelled";
  return "pending";
}
