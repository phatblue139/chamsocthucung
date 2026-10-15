import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import { getNextPetId, loadPets, PET_STORAGE_KEY, savePets } from "./petData.js";
import {
  CARE_TYPES,
  CARE_TYPE_PET_SITTING,
  CLOSE_TIME,
  OPEN_TIME,
  PET_SITTING_DAILY_RATE,
  PET_SITTING_HOURLY_RATE,
  SCHEDULE_STATUS,
  SCHEDULE_STORAGE_KEY,
  formatCurrency,
  getCareTypePrice,
  getNextScheduleId,
  getScheduleStatusClass,
  getTimeOptions,
  getPetSittingPrice,
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
  const petSittingEstimate = document.getElementById("userPetSittingEstimate");
  const list = document.getElementById("userScheduleList");
  const empty = document.getElementById("userScheduleEmpty");
  const count = document.getElementById("userScheduleCount");
  const historyList = document.getElementById("userScheduleHistoryList");
  const historyEmpty = document.getElementById("userScheduleHistoryEmpty");
  const historyCount = document.getElementById("userScheduleHistoryCount");
  let schedules = loadSchedules();

  const petForm = document.getElementById("userPetForm");
  const petSpeciesInput = petForm?.elements.namedItem("species");
  const petSpeciesOtherGroup = document.getElementById("userPetSpeciesOtherGroup");
  const petSpeciesOtherInput = petForm?.elements.namedItem("speciesOther");
  const petMessage = document.getElementById("userPetMessage");
  const petList = document.getElementById("userPetList");
  const petEmpty = document.getElementById("userPetEmpty");
  const petCount = document.getElementById("userPetCount");
  let pets = loadPets().filter((pet) => pet.ownerUsername === user.username);

  const petSelect = document.getElementById("userPetSelect");
  const petServicesContainer = document.getElementById("userPetServices");
  let activePetId = "";

  renderPets();
  renderPetSelect();
  petSelect?.addEventListener("change", handlePetSelectionChange);
  syncPetSpeciesOther();
  petSpeciesInput?.addEventListener("change", syncPetSpeciesOther);

  const dateInput = form?.elements.namedItem("date");
  const timeInput = form?.elements.namedItem("time");
  const returnDateInput = form?.elements.namedItem("endDate");
  const returnTimeInput = form?.elements.namedItem("endTime");
  const returnDateGroup = document.getElementById("userScheduleReturnDateGroup");
  const returnTimeGroup = document.getElementById("userScheduleReturnTimeGroup");
  const scheduleDateLabel = form?.querySelector('label[for="userScheduleDate"]');
  const scheduleTimeLabel = form?.querySelector('label[for="userScheduleTime"]');
  populateTimeOptions();
  populateReturnTimeOptions();
  applyScheduleLimits();
  syncPetSittingFields();

  dateInput?.addEventListener("change", () => {
    if (returnDateInput) returnDateInput.min = dateInput.value || currentDate();
    applyTimeLimits();
    updatePetSittingEstimate();
  });
  applyTimeLimits();
  timeInput?.addEventListener("change", updatePetSittingEstimate);
  returnDateInput?.addEventListener("change", updatePetSittingEstimate);
  returnTimeInput?.addEventListener("change", updatePetSittingEstimate);
  petSelect?.addEventListener("change", syncPetSittingFields);
  petServicesContainer?.addEventListener("change", (event) => {
    if (event.target.matches('input[name="careTypes"]')) syncPetSittingFields();
  });

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
    const previous = timeInput.value;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    const options = getTimeOptions({ open: "00:00", close: "23:55" }).map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      return option;
    });
    timeInput.replaceChildren(placeholder, ...options);
    if (previous) timeInput.value = previous;
  }

  function populateReturnTimeOptions() {
    if (!returnTimeInput) return;
    const previous = returnTimeInput.value;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    const options = getTimeOptions({ open: "00:00", close: "23:55" }).map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      return option;
    });
    returnTimeInput.replaceChildren(placeholder, ...options);
    if (previous) returnTimeInput.value = previous;
  }

  function applyTimeLimits() {
    if (!timeInput) return;
    const isPetSitting = isPetSittingSelected();
    const openingTime = isPetSitting ? "00:00" : OPEN_TIME;
    const closingTime = isPetSitting ? "23:55" : CLOSE_TIME;
    const earliest =
      dateInput?.value === dateInput.min && currentTime() > openingTime
        ? ceilToFiveMinutes(currentTime())
        : openingTime;
    const previous = timeInput.value;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    timeInput.replaceChildren(placeholder);
    timeOptions()
      .filter((value) => value >= earliest && value <= closingTime)
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        timeInput.appendChild(option);
      });
    if (previous && timeInput.value !== previous) timeInput.value = previous;
    if (!timeInput.value) timeInput.selectedIndex = 0;
  }

  function timeOptions() {
    const values = [];
    for (let minutes = 0; minutes <= 23 * 60 + 55; minutes += 5) {
      values.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
    }
    return values;
  }

  function ceilToFiveMinutes(value) {
    const [hour, minute] = value.split(":").map(Number);
    const rounded = Math.ceil(minute / 5) * 5;
    if (rounded < 60) return `${String(hour).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
    if (hour < 23) return `${String(hour + 1).padStart(2, "0")}:00`;
    if (rounded <= 55) return `23:${String(rounded).padStart(2, "0")}`;
    return "24:00";
  }

  function applyScheduleLimits() {
    if (dateInput) dateInput.min = currentDate();
    if (returnDateInput) returnDateInput.min = dateInput?.value || currentDate();
    applyTimeLimits();
  }

  function isPetSittingSelected() {
    const selectedPetIds = getSelectedPetIds();
    return Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
      .some((group) => selectedPetIds.has(group.dataset.petId) && group.querySelector(
        `input[name="careTypes"][value="${CARE_TYPE_PET_SITTING}"]:checked`,
      ));
  }

  function getSelectedPetIds() {
    return new Set(Array.from(
      petSelect?.querySelectorAll('input[name="petIds"]:checked') || [],
      (input) => input.value,
    ));
  }

  function syncPetSittingFields() {
    const isPetSitting = isPetSittingSelected();
    if (returnDateGroup) returnDateGroup.hidden = !isPetSitting;
    if (returnTimeGroup) returnTimeGroup.hidden = !isPetSitting;
    if (returnDateInput) {
      returnDateInput.required = isPetSitting;
      returnDateInput.min = dateInput?.value || currentDate();
      if (!isPetSitting) returnDateInput.value = "";
    }
    if (returnTimeInput) {
      returnTimeInput.required = isPetSitting;
      if (!isPetSitting) returnTimeInput.value = "";
    }
    if (scheduleDateLabel) scheduleDateLabel.textContent = isPetSitting ? "Ngày nhận thú cưng" : "Ngày";
    if (scheduleTimeLabel) scheduleTimeLabel.textContent = isPetSitting ? "Giờ nhận thú cưng" : "Giờ";
    populateTimeOptions();
    applyTimeLimits();
    updatePetSittingEstimate();
  }

  function updatePetSittingEstimate() {
    if (!petSittingEstimate) return;
    const selectedPetIds = getSelectedPetIds();
    const selectedGroups = Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
      .filter((group) => selectedPetIds.has(group.dataset.petId) && group.querySelector(
        `input[name="careTypes"][value="${CARE_TYPE_PET_SITTING}"]:checked`,
      ));
    petSittingEstimate.hidden = selectedGroups.length === 0;
    if (!selectedGroups.length) return;

    const startDate = String(dateInput?.value || "");
    const startTime = String(timeInput?.value || "");
    const endDate = String(returnDateInput?.value || "");
    const endTime = String(returnTimeInput?.value || "");
    const pricePerPet = getPetSittingPrice(startDate, startTime, endDate, endTime);
    if (!pricePerPet) {
      petSittingEstimate.textContent = "Chọn ngày giờ nhận và trả để xem phí trông coi.";
      return;
    }

    petSittingEstimate.textContent = `Phí trông coi: ${formatCurrency(pricePerPet)}/bé · ${selectedGroups.length} bé · Tổng ${formatCurrency(pricePerPet * selectedGroups.length)}.`;
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const isPetSitting = isPetSittingSelected();
    const today = currentDate();
    if (String(formData.get("date") || "") < today) {
      showMessage("Bạn không thể chọn ngày đã qua. Vui lòng chọn từ hôm nay trở đi.", "error");
      return;
    }

    const time = String(formData.get("time") || "").trim();
    const earliestTime = isPetSitting ? "00:00" : OPEN_TIME;
    const latestTime = isPetSitting ? "23:55" : CLOSE_TIME;
    if (time && (time < earliestTime || time > latestTime)) {
      showMessage(isPetSitting
        ? "Giờ nhận thú cưng phải trong khoảng 00:00 đến 23:55."
        : "Thời gian đặt lịch chỉ từ 08:00 đến 19:00.", "error");
      return;
    }
    if (time && Number(time.split(":")[1]) % 5 !== 0) {
      showMessage("Giờ đặt lịch chỉ chọn các mốc 00, 05, 10... phút.", "error");
      return;
    }
    if (formData.get("date") === today && time && time < currentTime()) {
      showMessage("Thời gian nhận không được ở quá khứ.", "error");
      return;
    }

    const endDate = String(formData.get("endDate") || "").trim();
    const endTime = String(formData.get("endTime") || "").trim();
    if (isPetSitting && endDate < String(formData.get("date") || "")) {
      showMessage("Ngày trả thú cưng phải từ ngày nhận trở đi.", "error");
      return;
    }
    if (isPetSitting && endDate === String(formData.get("date") || "") && endTime <= time) {
      showMessage("Giờ trả thú cưng phải sau giờ nhận.", "error");
      return;
    }
    if (isPetSitting && endDate === today && endTime < currentTime()) {
      showMessage("Giờ trả không được ở quá khứ.", "error");
      return;
    }

    const latestSchedules = loadSchedules();
    const selectedPetIds = getSelectedPetIds();
    const petServiceSelections = pets.filter((pet) => selectedPetIds.has(String(pet.id))).map((pet) => {
      const group = Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
        .find((item) => item.dataset.petId === String(pet.id));
      const services = Array.from(group?.querySelectorAll('input[name="careTypes"]:checked') || [])
        .map((input) => input.value);
      return { pet, services };
    });

    const missingServices = petServiceSelections.filter(({ services }) => services.length === 0);
    if (missingServices.length) {
      const names = missingServices.map(({ pet }) => pet.name || `Thú cưng #${pet.id}`).join(", ");
      showMessage(`Vui lòng chọn ít nhất một dịch vụ cho: ${names}.`, "error");
      return;
    }
    const billedPetServices = petServiceSelections;

    const selectedPets = billedPetServices.map(({ pet }) => pet);
    const petNames = selectedPets.map((pet) => pet.name || `Thú cưng #${pet.id}`);
    const petServices = billedPetServices.map(({ pet, services }, index) => ({
      petId: Number(pet.id),
      petName: petNames[index],
      services,
      petSittingPrice: services.includes(CARE_TYPE_PET_SITTING)
        ? getPetSittingPrice(formData.get("date"), time, endDate, endTime)
        : 0,
      price: services.reduce((total, service) => total + getCareTypePrice(service), 0) +
        (services.includes(CARE_TYPE_PET_SITTING)
          ? getPetSittingPrice(formData.get("date"), time, endDate, endTime)
          : 0),
    }));
    const careType = petServices.map(({ petName, services }) => `${petName}: ${services.join(", ")}`).join(" | ");

    const schedule = {
      id: getNextScheduleId(latestSchedules),
      petId: selectedPets.length === 1 ? Number(selectedPets[0].id) : "",
      petIds: selectedPets.map((pet) => Number(pet.id)),
      petNames,
      petServices,
      petName: petNames.join(", "),
      careType,
      price: petServices.reduce((total, item) => total + item.price, 0),
      date: String(formData.get("date") || "").trim(),
      time: String(formData.get("time") || "").trim(),
      endDate: isPetSitting ? endDate : "",
      endTime: isPetSitting ? endTime : "",
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
    renderPetServiceChoices();
    syncPetSittingFields();
    applyScheduleLimits();
    render();
    showMessage("Đã gửi lịch chăm sóc tới NEKO. Chúng tôi sẽ liên hệ xác nhận sớm nhất.", "success");
  });

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  petForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!petForm.reportValidity()) return;

    const petName = String(petForm.name?.value || "").trim();
    if (!petName) {
      showPetMessage("Vui lòng nhập tên thú cưng.", "error");
      return;
    }

    const pet = {
      id: getNextPetId(),
      name: petName,
      species: petSpeciesInput?.value === "Khác"
        ? String(petSpeciesOtherInput?.value || "").trim()
        : petSpeciesInput?.value || "Chó",
      breed: String(petForm.breed?.value || "").trim(),
      age: Number(petForm.age?.value || 0),
      owner: String(petForm.owner?.value || "").trim() || user.fullName || user.username,
      ownerUsername: user.username,
      status: "Chờ lịch",
    };

    const nextPets = [...pets, pet];
    if (!savePets([...loadPets().filter((item) => !(item.ownerUsername === user.username && Number(item.id) === Number(pet.id))), pet])) {
      showPetMessage("Không thể lưu thú cưng. Vui lòng thử lại.", "error");
      return;
    }

    pets = nextPets;
    petForm.reset();
    syncPetSpeciesOther();
    renderPets();
    renderPetSelect();
    showPetMessage(`Đã đăng ký thú cưng ${pet.name}. Bạn có thể đặt lịch ngay.`, "success");
  });

  function showPetMessage(text, type) {
    if (!petMessage) return;
    petMessage.textContent = text;
    petMessage.className = `user-form-message ${type}`;
  }

  function syncPetSpeciesOther() {
    const isOtherSpecies = petSpeciesInput?.value === "Khác";
    if (petSpeciesOtherGroup) petSpeciesOtherGroup.hidden = !isOtherSpecies;
    if (petSpeciesOtherInput) {
      petSpeciesOtherInput.required = isOtherSpecies;
      if (!isOtherSpecies) petSpeciesOtherInput.value = "";
    }
  }

  function renderPets() {
    if (!petList || !petEmpty || !petCount) return;
    petList.replaceChildren();
    petCount.textContent = `${pets.length} thú cưng`;
    petEmpty.hidden = pets.length > 0;

    pets.forEach((pet) => {
      const card = document.createElement("article");
      card.className = "user-pet-card";

      const info = document.createElement("div");
      info.className = "user-pet-card-info";

      const title = document.createElement("div");
      title.className = "user-pet-card-title";
      const name = document.createElement("h3");
      name.textContent = pet.name || "Thú cưng";
      title.appendChild(name);

      const speciesTag = document.createElement("span");
      speciesTag.className = "user-pet-species";
      speciesTag.textContent = pet.species || "Khác";
      title.appendChild(speciesTag);
      info.appendChild(title);

      const facts = document.createElement("span");
      facts.className = "user-pet-card-facts";
      facts.textContent = [pet.breed, pet.age !== undefined && pet.age !== null ? `${pet.age} tuổi` : ""]
        .filter(Boolean)
        .join(" · ") || pet.status || "";
      if (facts.textContent) title.appendChild(facts);

      const ownerDetails = document.createElement("p");
      ownerDetails.className = "user-pet-card-owner";
      ownerDetails.textContent = `Chủ nuôi: ${pet.owner || user.fullName || user.username} · SĐT: ${user.phone || "Chưa cập nhật"}`;
      info.appendChild(ownerDetails);

      card.appendChild(info);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "care-btn care-btn-delete user-pet-remove";
      remove.textContent = "Xóa";
      remove.setAttribute("data-remove-pet", "true");
      remove.addEventListener("click", () => {
        if (!confirm(`Xóa hồ sơ thú cưng ${pet.name}?`)) return;
        const nextPets = pets.filter((item) => Number(item.id) !== Number(pet.id));
        if (!savePets(loadPets().filter((item) => !(item.ownerUsername === user.username && Number(item.id) === Number(pet.id))))) {
          showPetMessage("Không thể xóa hồ sơ. Vui lòng thử lại.", "error");
          return;
        }
        pets = nextPets;
        renderPets();
        renderPetSelect();
        syncPetSittingFields();
        showPetMessage(`Đã xóa hồ sơ thú cưng ${pet.name}.`, "success");
      });
      card.appendChild(remove);

      petList.appendChild(card);
    });
  }

  function renderPetSelect() {
    if (!petSelect) return;
    const selectedIds = new Set(
      Array.from(petSelect.querySelectorAll('input[name="petIds"]:checked'), (input) => input.value),
    );
    petSelect.replaceChildren();

    if (!pets.length) {
      const emptyOption = document.createElement("p");
      emptyOption.className = "user-pet-choice-empty";
      emptyOption.textContent = "Bạn chưa đăng ký thú cưng nào.";
      petSelect.appendChild(emptyOption);
      activePetId = "";
      renderPetServiceChoices();
      return;
    }

    pets.forEach((pet) => {
      const choice = document.createElement("div");
      choice.className = "user-pet-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "petIds";
      checkbox.value = String(pet.id);
      checkbox.id = `userPetChoice-${pet.id}`;
      checkbox.checked = selectedIds.has(checkbox.value);
      const label = document.createElement("label");
      label.className = "user-pet-choice-select";
      label.htmlFor = checkbox.id;
      const name = document.createElement("span");
      name.textContent = `${pet.name || `Thú cưng #${pet.id}`} · ${pet.species || "Khác"}`;
      label.append(checkbox, name);

      const serviceButton = document.createElement("button");
      serviceButton.type = "button";
      serviceButton.className = "user-pet-choice-service";
      serviceButton.textContent = activePetId === checkbox.value ? "Đang xem" : "Dịch vụ";
      serviceButton.setAttribute("aria-pressed", String(activePetId === checkbox.value));
      serviceButton.addEventListener("click", () => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      });

      choice.append(label, serviceButton);
      petSelect.appendChild(choice);
    });
    renderPetServiceChoices();
  }

  function handlePetSelectionChange(event) {
    const checkbox = event.target;
    if (checkbox?.name !== "petIds") return;

    if (checkbox.checked) {
      activePetId = checkbox.value;
    }
    renderPetServiceChoices();
  }

  function renderPetServiceChoices() {
    if (!petServicesContainer) return;
    const selectedIds = new Set(
      Array.from(petSelect?.querySelectorAll('input[name="petIds"]:checked') || [], (input) => input.value),
    );
    const selectedPets = pets.filter((pet) => selectedIds.has(String(pet.id)));
    const existingGroups = new Map(
      Array.from(petServicesContainer.querySelectorAll(".user-pet-service-group"), (group) => [group.dataset.petId, group]),
    );
    const petIds = new Set(pets.map((pet) => String(pet.id)));

    existingGroups.forEach((group, petId) => {
      if (!petIds.has(petId)) group.remove();
    });

    petSelect?.querySelectorAll(".user-pet-choice").forEach((choice) => {
      const checkbox = choice.querySelector('input[name="petIds"]');
      const serviceButton = choice.querySelector(".user-pet-choice-service");
      const isActive = checkbox?.value === activePetId;
      if (serviceButton) {
        serviceButton.textContent = isActive ? "Đang xem" : "Dịch vụ";
        serviceButton.setAttribute("aria-pressed", String(isActive));
      }
    });

    if (!selectedPets.length) {
      activePetId = "";
      let hint = petServicesContainer.querySelector(".user-pet-choice-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.className = "user-pet-choice-hint";
        hint.textContent = "Chọn thú cưng để chọn dịch vụ riêng cho bé.";
        petServicesContainer.prepend(hint);
      }
    } else {
      if (!selectedPets.some((pet) => String(pet.id) === activePetId)) {
        activePetId = String(selectedPets[0].id);
      }
      petServicesContainer.querySelector(".user-pet-choice-hint")?.remove();
    }

    pets.forEach((pet) => {
      const petId = String(pet.id);
      let group = existingGroups.get(petId);
      if (!group) {
        group = createPetServiceGroup(pet);
        petServicesContainer.appendChild(group);
      }
      group.hidden = !selectedPets.length || petId !== activePetId;
    });
  }

  function createPetServiceGroup(pet) {
    const group = document.createElement("fieldset");
    group.className = "user-pet-service-group";
    group.dataset.petId = String(pet.id);

    const legend = document.createElement("legend");
    legend.textContent = `Dịch vụ cho ${pet.name || `Thú cưng #${pet.id}`}`;

    const options = document.createElement("div");
    options.className = "user-care-option-list";
    [...CARE_TYPES, { value: CARE_TYPE_PET_SITTING, petSitting: true }].forEach(({ value, price, petSitting }) => {
      const label = document.createElement("label");
      label.className = "user-care-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "careTypes";
      checkbox.value = value;
      const text = document.createElement("span");
      text.textContent = petSitting
        ? `${value.replace(/(thú)\s+(cưng)/i, "$1\u00A0$2")} - ${formatCurrency(PET_SITTING_HOURLY_RATE)}/giờ, ${formatCurrency(PET_SITTING_DAILY_RATE)}/ngày`
        : `${value} - ${formatCurrency(price)}`;
      label.append(checkbox, text);
      options.appendChild(label);
    });

    group.append(legend, options);
    return group;
  }

  function cancelUserSchedule(id) {
    const latestSchedules = loadSchedules();
    const schedule = latestSchedules.find((item) =>
      Number(item.id) === Number(id) &&
      (item.customerUsername || item.ownerUsername) === user.username &&
      !item.deletedAt,
    );

    if (!schedule) {
      schedules = latestSchedules;
      render();
      showMessage("Không tìm thấy lịch để hủy. Vui lòng tải lại trang.", "error");
      return;
    }

    const status = resolveScheduleStatus(schedule);
    if (![SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(status)) {
      schedules = latestSchedules;
      render();
      showMessage("Lịch này không thể hủy.", "error");
      return;
    }

    if (!confirm("Bạn có chắc muốn hủy lịch chăm sóc này không?")) return;

    const nextSchedules = latestSchedules.map((item) =>
      Number(item.id) === Number(id) &&
      (item.customerUsername || item.ownerUsername) === user.username
        ? { ...item, status: SCHEDULE_STATUS.CANCELLED, cancelledAt: new Date().toISOString() }
        : item,
    );

    if (!saveSchedules(nextSchedules)) {
      showMessage("Không thể hủy lịch. Vui lòng thử lại.", "error");
      return;
    }

    schedules = nextSchedules;
    render();
    showMessage("Đã hủy lịch chăm sóc.", "success");
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== SCHEDULE_STORAGE_KEY) return;
    schedules = loadSchedules();
    render();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== PET_STORAGE_KEY) return;
    pets = loadPets().filter((pet) => pet.ownerUsername === user.username);
    renderPets();
    renderPetSelect();
    syncPetSittingFields();
  });

  function render() {
    if (!list || !empty || !count || !historyList || !historyEmpty || !historyCount) return;

    const userSchedules = schedules
      .filter((schedule) => !schedule.deletedAt && (schedule.customerUsername || schedule.ownerUsername) === user.username)
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
    historyList.replaceChildren();
    count.textContent = `${activeSchedules.length} lịch`;
    empty.hidden = activeSchedules.length > 0;
    historyCount.textContent = `${historySchedules.length} lịch`;
    historyEmpty.hidden = historySchedules.length > 0;

    renderScheduleCards(list, activeSchedules);
    renderScheduleCards(historyList, historySchedules);

    function renderScheduleCards(targetList, scheduleItems) {
      scheduleItems.forEach((schedule) => {
      const card = document.createElement("article");
      card.className = "user-schedule-card";

      const heading = document.createElement("div");
      heading.className = "user-schedule-card-heading";

      const price = formatCurrency(schedule.price);

      const title = document.createElement("div");
      title.className = "user-schedule-card-title";

      const petName = document.createElement("h3");
      petName.textContent = schedule.petName || "Thú cưng";
      title.appendChild(petName);

      const dateTag = document.createElement("span");
      dateTag.className = "user-schedule-date";
      dateTag.textContent = formatDate(schedule.date);
      title.appendChild(dateTag);

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
      details.textContent = `${formatDate(schedule.date)} · ${schedule.time || ""}${schedule.endDate ? ` → ${formatDate(schedule.endDate)} ${schedule.endTime || ""}` : ""} · ${schedule.careType || "Chăm sóc"}${price ? ` · ${price}` : ""}`;
      card.appendChild(heading, details);

      const hint = document.createElement("span");
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "user-schedule-hint";
      toggleButton.setAttribute("aria-expanded", "false");
      toggleButton.setAttribute("aria-controls", `userScheduleDetails-${schedule.id}`);
      toggleButton.textContent = "Xem chi tiết lịch";
      card.appendChild(toggleButton);

      const more = document.createElement("div");
      more.className = "user-schedule-more";
      more.id = `userScheduleDetails-${schedule.id}`;
      more.hidden = true;
      more.append(
        createScheduleRow(schedule.endDate ? "Ngày nhận" : "Ngày", formatDate(schedule.date)),
        createScheduleRow(schedule.endDate ? "Giờ nhận" : "Giờ đặt lịch", schedule.time || "Chưa chọn"),
      );
      if (schedule.endDate) {
        more.appendChild(createScheduleRow("Ngày/giờ trả", `${formatDate(schedule.endDate)} · ${schedule.endTime || "Chưa chọn"}`));
      }

      if (Array.isArray(schedule.petServices) && schedule.petServices.length) {
        schedule.petServices.forEach((item) => {
          const serviceNames = Array.isArray(item.services) ? item.services.join(", ") : "Chăm sóc";
          const servicePrice = formatCurrency(item.price) || "Theo yêu cầu";
          more.appendChild(createScheduleRow(item.petName || "Thú cưng", `${serviceNames} · ${servicePrice}`));
        });
      } else {
        more.append(
          createScheduleRow("Thú cưng", schedule.petName || "Thú cưng"),
          createScheduleRow("Loại chăm sóc", schedule.careType || "Chăm sóc"),
        );
      }

      more.append(
        createScheduleRow("Tổng tiền", price || "Theo yêu cầu"),
        createScheduleRow("Trạng thái", statusValue),
        createScheduleRow("Ghi chú", schedule.note || "Không có"),
      );

      if ([SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(statusValue)) {
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "user-schedule-cancel";
        cancelButton.textContent = "Hủy lịch";
        cancelButton.addEventListener("click", () => cancelUserSchedule(schedule.id));
        more.appendChild(cancelButton);
      }
      card.appendChild(more);

      function toggle() {
        const isOpen = card.classList.toggle("is-open");
        toggleButton.setAttribute("aria-expanded", String(isOpen));
        more.hidden = !isOpen;
        toggleButton.textContent = isOpen ? "Thu gọn" : "Xem chi tiết lịch";
      }

      toggleButton.addEventListener("click", toggle);

      targetList.appendChild(card);
      });
    }
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
