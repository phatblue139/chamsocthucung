import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  CARE_TYPE_OTHER,
  CLOSE_TIME,
  OPEN_TIME,
  SCHEDULE_STORAGE_KEY,
  formatCurrency,
  getCareTypePrice,
  getNextScheduleId,
  getScheduleStatusClass,
  getTimeOptions,
  loadSchedules,
  resolveScheduleStatus,
  saveSchedules,
} from "./careScheduleData.js";

initSiteHeader();

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
  const careTypeInput = form?.elements.namedItem("careType");
  const careTypeOtherInput = form?.elements.namedItem("careTypeOther");
  const careTypeOtherGroup = document.getElementById("userCareTypeOtherGroup");
  populateTimeOptions();
  applyScheduleLimits();
  syncCareTypeOther();

  careTypeInput?.addEventListener("change", syncCareTypeOther);

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

  function populateTimeOptions() {
    if (!timeInput) return;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    const options = getTimeOptions().map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      return option;
    });
    timeInput.replaceChildren(placeholder, ...options);
  }

  function applyTimeLimits() {
    if (!timeInput) return;
    const isToday = dateInput?.value === dateInput.min;
    const minTime = isToday ? currentTime() : OPEN_TIME;
    Array.from(timeInput.options).forEach((option) => {
      if (!option.value) return;
      option.disabled = isToday && option.value < minTime;
    });
    if (timeInput.selectedOptions[0]?.disabled) timeInput.value = "";
  }

  function applyScheduleLimits() {
    if (dateInput) dateInput.min = currentDate();
    applyTimeLimits();
  }

  function syncCareTypeOther() {
    const isOther = careTypeInput?.value === CARE_TYPE_OTHER;
    if (careTypeOtherGroup) careTypeOtherGroup.hidden = !isOther;
    if (careTypeOtherInput) {
      careTypeOtherInput.required = isOther;
      careTypeOtherInput.value = isOther ? careTypeOtherInput.value : "";
    }
  }

  function resolveCareType() {
    const selected = String(careTypeInput?.value || "").trim();
    if (selected === CARE_TYPE_OTHER) {
      return String(careTypeOtherInput?.value || "").trim();
    }
    return selected;
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
    const careType = resolveCareType();
    const schedule = {
      id: getNextScheduleId(latestSchedules),
      petName: String(formData.get("petName") || "").trim(),
      careType,
      price: getCareTypePrice(careType),
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
    syncCareTypeOther();
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
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-expanded", "false");

      const heading = document.createElement("div");
      heading.className = "user-schedule-card-heading";

      const price = formatCurrency(schedule.price);

      const title = document.createElement("div");
      title.className = "user-schedule-card-title";

      const petName = document.createElement("h3");
      petName.textContent = schedule.petName || "Thú cưng";
      title.appendChild(petName);

      const timeTag = document.createElement("span");
      timeTag.className = "user-schedule-time";
      timeTag.textContent = schedule.time || "Chưa chọn giờ";
      title.appendChild(timeTag);

      heading.appendChild(title);

      const status = document.createElement("span");
      const statusValue = resolveScheduleStatus(schedule);
      status.className = `user-schedule-status ${getScheduleStatusClass(statusValue)}`;
      status.textContent = statusValue;
      heading.appendChild(status);

      const details = document.createElement("div");
      details.className = "user-schedule-details";
      details.textContent = `${formatDate(schedule.date)} · ${schedule.time || ""} · ${schedule.careType || "Chăm sóc"}${price ? ` · ${price}` : ""}`;
      card.appendChild(heading, details);

      const hint = document.createElement("span");
      hint.className = "user-schedule-hint";
      hint.textContent = "Xem chi tiết lịch";
      card.appendChild(hint);

      const more = document.createElement("div");
      more.className = "user-schedule-more";
      more.hidden = true;
      more.append(
        createScheduleRow("Ngày", formatDate(schedule.date)),
        createScheduleRow("Giờ đặt lịch", schedule.time || "Chưa chọn"),
        createScheduleRow("Loại chăm sóc", schedule.careType || "Chăm sóc"),
        createScheduleRow("Giá dịch vụ", price || "Theo yêu cầu"),
        createScheduleRow("Trạng thái", statusValue),
        createScheduleRow("Ghi chú", schedule.note || "Không có"),
      );
      card.appendChild(more);

      function toggle() {
        const isOpen = card.classList.toggle("is-open");
        card.setAttribute("aria-expanded", String(isOpen));
        more.hidden = !isOpen;
        hint.textContent = isOpen ? "Thu gọn" : "Xem chi tiết lịch";
      }

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });

      list.appendChild(card);
    });
  }

  function createScheduleRow(label, value) {
    const row = document.createElement("div");
    row.className = "user-schedule-detail-row";

    const term = document.createElement("span");
    term.className = "user-schedule-detail-label";
    term.textContent = label;

    const desc = document.createElement("span");
    desc.className = "user-schedule-detail-value";
    desc.textContent = value;

    row.append(term, desc);
    return row;
  }

  render();
}

function formatDate(value) {
  if (!value) return "Chưa chọn ngày";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}
