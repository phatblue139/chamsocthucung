import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  SCHEDULE_STORAGE_KEY,
  getNextScheduleId,
  getScheduleStatusClass,
  loadSchedules,
  resolveScheduleStatus,
  saveSchedules,
} from "./careScheduleData.js";

initSiteHeader();

const OPEN_TIME = "08:00";
const CLOSE_TIME = "19:00";

const currentUser = getCurrentUser();

if (!currentUser) {
  location.replace("/");
} else {
  initUserView(currentUser);
}

function initUserView(user) {
  const form = document.getElementById("userScheduleForm");
  const message = document.getElementById("userScheduleMessage");
  const list = document.getElementById("userScheduleList");
  const empty = document.getElementById("userScheduleEmpty");
  const count = document.getElementById("userScheduleCount");
  let schedules = loadSchedules();

  const dateInput = form?.elements.namedItem("date");
  const timeInput = form?.elements.namedItem("time");
  applyScheduleLimits();

  dateInput?.addEventListener("change", applyTimeLimits);
  applyTimeLimits();

  function currentDate() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function currentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function applyTimeLimits() {
    if (!timeInput) return;
    timeInput.min = OPEN_TIME;
    timeInput.max = CLOSE_TIME;
    if (dateInput?.value === dateInput.min && currentTime() > OPEN_TIME) {
      timeInput.min = currentTime();
    }
  }

  function applyScheduleLimits() {
    if (dateInput) dateInput.min = currentDate();
    applyTimeLimits();
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const today = currentDate();
    if (String(formData.get("date") || "") < today) {
      showMessage("Bạn không thể chọn ngày đã qua. Vui lòng chọn từ hôm nay trở đi.", "error");
      return;
    }

    const time = String(formData.get("time") || "").trim();
    if (time && (time < OPEN_TIME || time > CLOSE_TIME)) {
      showMessage("Thời gian đặt lịch chỉ từ 08:00 đến 19:00.", "error");
      return;
    }
    if (formData.get("date") === today && time && time < currentTime()) {
      showMessage("Thời gian phải từ 08:00 đến 19:00 và không được ở quá khứ.", "error");
      return;
    }

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
    applyScheduleLimits();
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
      const statusValue = resolveScheduleStatus(schedule);
      status.className = `user-schedule-status ${getScheduleStatusClass(statusValue)}`;
      status.textContent = statusValue;
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
