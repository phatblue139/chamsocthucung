
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

import { loadMyPets, PET_STORAGE_KEY } from "./petData.js";

initSiteHeader();

const OPEN_TIME = "08:00";
const CLOSE_TIME = "19:00";

const SERVICES = [
  { id: "SERVICE001", name: "Tắm + cắt móng", price: 100000 },
  { id: "SERVICE002", name: "Tắm vệ sinh", price: 70000 },
  { id: "SERVICE003", name: "Cắt móng", price: 30000 },
  { id: "SERVICE004", name: "Tiêm phòng", price: 150000 },
  { id: "SERVICE005", name: "Tẩy giun", price: 50000 },
];

const currentUser = getCurrentUser();

if (!currentUser) {
  location.replace("/");
} else {
  initUserView(currentUser);
}

function initUserView(user) {
  const form = document.getElementById("userScheduleForm");
  const message = document.getElementById("userScheduleMessage");
  const petSittingEstimate = document.getElementById("userPetSittingEstimate");
  const list = document.getElementById("userScheduleList");
  const empty = document.getElementById("userScheduleEmpty");
  const count = document.getElementById("userScheduleCount");

  const petInput = document.getElementById("userPetId");
  const serviceInput = document.getElementById("userCareType");
  const priceInput = document.getElementById("userSchedulePrice");

  if (!form) return;

  let schedules = loadSchedules();
  let pets = getMyPets(user);

  const dateInput = form.elements.namedItem("date");
  const timeInput = form.elements.namedItem("time");

  renderPetOptions();
  updatePrice();
  applyScheduleLimits();

  dateInput?.addEventListener("change", applyTimeLimits);
  serviceInput?.addEventListener("change", updatePrice);

  applyTimeLimits();
  timeInput?.addEventListener("change", updatePetSittingEstimate);
  returnDateInput?.addEventListener("change", updatePetSittingEstimate);
  returnTimeInput?.addEventListener("change", updatePetSittingEstimate);
  petSelect?.addEventListener("change", syncPetSittingFields);
  petServicesContainer?.addEventListener("change", (event) => {
    if (event.target.matches('input[name="careTypes"]')) syncPetSittingFields();
  });

  // Lấy thú cưng thuộc tài khoản đang đăng nhập
  function getMyPets(currentUser) {
    // loadMyPets lọc bằng ID thật của tài khoản đang đăng nhập.
    return loadMyPets();
  }

  // Hiển thị danh sách thú cưng để người dùng lựa chọn
  function renderPetOptions() {
    if (!petInput) return;

    petInput.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = pets.length
      ? "-- Chọn thú cưng --"
      : "-- Bạn chưa có thú cưng --";

    petInput.appendChild(defaultOption);

    pets.forEach((pet) => {
      const option = document.createElement("option");
      option.value = String(pet.petId ?? pet.id);
      option.textContent = pet.name || pet.petName || "Thú cưng";
      petInput.appendChild(option);
    });

    petInput.disabled = pets.length === 0;
  }

  // Tìm thú cưng đang được chọn
  function getSelectedPet() {
    const petId = String(petInput?.value || "");

    return pets.find(
      (pet) => String(pet.petId ?? pet.id) === petId
    );
  }

  // Cập nhật giá dịch vụ
  function updatePrice() {
    const service = SERVICES.find(
      (item) => item.id === serviceInput?.value
    );

    if (priceInput) {
      priceInput.value = service
        ? `${service.price.toLocaleString("vi-VN")} đ`
        : "0 đ";
    }
  }

  function currentDate() {
    const now = new Date();

    return new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 10);
  }

  function currentTime() {
    const now = new Date();

    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  }

  function timeOptions() {
    const values = [];

    for (
      let minutes = 8 * 60;
      minutes <= 19 * 60;
      minutes += 5
    ) {
      values.push(
        `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
          minutes % 60
        ).padStart(2, "0")}`
      );
    }

    return values;
  }

  function ceilToFiveMinutes(value) {
    const [hour, minute] = value.split(":").map(Number);
    const rounded = Math.ceil(minute / 5) * 5;

    if (rounded < 60) {
      return `${String(hour).padStart(2, "0")}:${String(
        rounded
      ).padStart(2, "0")}`;
    }

    if (hour < 23) {
      return `${String(hour + 1).padStart(2, "0")}:00`;
    }

    return CLOSE_TIME;
  }

  function applyScheduleLimits() {
    if (dateInput) {
      dateInput.min = currentDate();
    }

    applyTimeLimits();
  }

  function applyTimeLimits() {
    if (!timeInput) return;

    const earliest =
      dateInput?.value === dateInput.min &&
      currentTime() > OPEN_TIME
        ? ceilToFiveMinutes(currentTime())
        : OPEN_TIME;

    const previous = timeInput.value;

    timeInput.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Chọn giờ --";
    timeInput.appendChild(defaultOption);

    timeOptions()
      .filter(
        (value) => value >= earliest && value <= CLOSE_TIME
      )
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        timeInput.appendChild(option);
      });

    if (previous) {
      timeInput.value = previous;
    }

    if (timeInput.value !== previous) {
      timeInput.value = "";
    }
  }

  // Đăng ký lịch chăm sóc
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    pets = getMyPets(user);
    renderPetOptions();

    const selectedPet = getSelectedPet();

    if (!selectedPet) {
      showMessage(
        "Bạn cần chọn thú cưng của mình trước khi đăng ký.",
        "error"
      );
      return;
    }

    const formData = new FormData(form);

    const date = String(formData.get("date") || "").trim();
    const time = String(formData.get("time") || "").trim();
    const note = String(formData.get("note") || "").trim();

    if (date < currentDate()) {
      showMessage(
        "Bạn không thể chọn ngày đã qua. Vui lòng chọn lại.",
        "error"
      );
      return;
    }

    if (time < OPEN_TIME || time > CLOSE_TIME) {
      showMessage(
        "Thời gian đặt lịch chỉ từ 08:00 đến 19:00.",
        "error"
      );
      return;
    }

    if (Number(time.split(":")[1]) % 5 !== 0) {
      showMessage(
        "Vui lòng chọn giờ theo các mốc 5 phút.",
        "error"
      );
      return;
    }

    if (date === currentDate() && time < currentTime()) {
      showMessage(
        "Bạn không thể đặt lịch vào thời gian đã qua.",
        "error"
      );
      return;
    }

    if (note.length > 500) {
      showMessage(
        "Ghi chú không được vượt quá 500 ký tự.",
        "error"
      );
      return;
    }

    const service = SERVICES.find(
      (item) => item.id === serviceInput.value
    );

    if (!service) {
      showMessage("Vui lòng chọn dịch vụ.", "error");
      return;
    }

    const latestSchedules = loadSchedules();

    const nextId = getNextScheduleId(latestSchedules);
    const nextBookingNumber = latestSchedules.reduce((max, item) => {
      const match = String(item.bookingId || "").match(/^BOOK(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

    const schedule = {
      id: nextId,
      bookingId: `BOOK${String(nextBookingNumber).padStart(3, "0")}`,
      userId: String(user.id ?? user.userId ?? ""),
      customerUsername: user.username || "",
      customerName: user.fullName || user.username || "",
      customerPhone: user.phone || "",

      petId: String(selectedPet.petId ?? selectedPet.id),
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,

      date,
      time,
      note,

      status: "Chờ xác nhận",
      bookingStatus: "Chờ thanh toán",
      paymentStatus: "Chưa thanh toán",

      source: "user",
      createdAt: new Date().toISOString(),
    };

    const nextSchedules = [...latestSchedules, schedule];

    if (!saveSchedules(nextSchedules)) {
      showMessage(
        "Không thể lưu lịch. Vui lòng thử lại.",
        "error"
      );
      return;
    }

    schedules = nextSchedules;

    form.reset();
    updatePrice();
    applyScheduleLimits();
    render();

    showMessage(
      "Đã đăng ký lịch thành công! NEKO sẽ liên hệ xác nhận.",
      "success"
    );
  });

  function showMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  // Cập nhật nếu lịch thay đổi ở tab khác
  window.addEventListener("storage", (event) => {
    if (event.key === SCHEDULE_STORAGE_KEY) {
      schedules = loadSchedules();
      render();
    }
    if (event.key === PET_STORAGE_KEY) {
      pets = getMyPets(user);
      renderPetOptions();
      render();
    }
  });

  // Hiển thị lịch của tài khoản hiện tại
  function render() {
    if (!list || !empty || !count || !historyList || !historyEmpty || !historyCount) return;

    const userSchedules = schedules
      .filter((schedule) => {
        return (
          schedule.customerUsername === user.username ||
          String(schedule.userId || "") ===
            String(user.id ?? user.userId ?? user.username ?? "")
        );
      })
      .sort((first, second) => {
        const firstValue = `${first.date || ""} ${first.time || ""}`;
        const secondValue = `${second.date || ""} ${second.time || ""}`;

        return firstValue.localeCompare(secondValue);
      });
    const historySchedules = userSchedules.filter((schedule) => {
      const status = resolveScheduleStatus(schedule);
      return [SCHEDULE_STATUS.CANCELLED, SCHEDULE_STATUS.COMPLETED].includes(status);
    });
    const sortByAppointment = (first, second) => {
      const firstValue = `${first.date || ""} ${first.time || ""}`;
      const secondValue = `${second.date || ""} ${second.time || ""}`;
      return firstValue.localeCompare(secondValue);
    };
    const activeSchedules = userSchedules
      .filter((schedule) => !historySchedules.includes(schedule))
      .sort(sortByAppointment);
    historySchedules.sort((first, second) => sortByAppointment(second, first));

    list.replaceChildren();

    count.textContent = `${userSchedules.length} lịch`;
    empty.hidden = userSchedules.length > 0;

    function renderScheduleCards(targetList, scheduleItems) {
      scheduleItems.forEach((schedule) => {
      const card = document.createElement("article");
      card.className = "user-schedule-card";

      const heading = document.createElement("div");
      heading.className = "user-schedule-card-heading";

      const petHeading = document.createElement("h3");

      const pet = pets.find(
        (item) =>
          String(item.petId ?? item.id) === String(schedule.petId)
      );

      petHeading.textContent = pet?.name || "Thú cưng";

      heading.appendChild(petHeading);

      const status = document.createElement("span");
      const statusValue = resolveScheduleStatus(schedule);

      status.className =
        `user-schedule-status ${getScheduleStatusClass(statusValue)}`;

      status.textContent = statusValue;
      heading.appendChild(status);

      card.appendChild(heading);

      const details = document.createElement("div");
      details.className = "user-schedule-details";

      details.textContent =
        `${formatDate(schedule.date)} · ${schedule.time || ""} · ` +
        `${schedule.serviceName || schedule.careType || "Chăm sóc"} · ` +
        `${Number(schedule.price || 0).toLocaleString("vi-VN")} đ`;

      card.appendChild(details);

      if (schedule.note) {
        const note = document.createElement("p");
        note.className = "user-schedule-note";
        note.textContent = schedule.note;
        card.appendChild(note);
      }

      targetList.appendChild(card);
      });
    }
  }

  render();
}

function formatDate(value) {
  if (!value) return "Chưa chọn ngày";

  const [year, month, day] = value.split("-");

  return day && month && year
    ? `${day}/${month}/${year}`
    : value;
}

