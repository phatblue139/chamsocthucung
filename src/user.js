import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  chargeWallet,
  loadPaymentPreference,
  loadWallet,
} from "./paymentData.js";
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
  hasScheduleConflict,
  isKnownCareType,
  loadSchedules,
  resolveScheduleStatus,
  saveSchedules,
} from "./careScheduleData.js";
import {
  canReviewSchedule,
  createReviewRecord,
  getNextReviewId,
  getReviewForSchedule,
  loadReviews,
  REVIEW_STORAGE_KEY,
  saveReviews,
  validateReview,
} from "./reviewData.js";
import {
  SHIPMENT_STATUS,
  SHIPMENT_STORAGE_KEY,
  SHIPMENT_CENTERS,
  calculateShipmentFee,
  getAddressAreaCode,
  getAddressStorage,
  getDistanceForLocation,
  getShipmentNextStatuses,
  getNextShipmentId,
  getShipmentStorage,
  saveShipmentStorage,
  updateShipmentStatus,
  validateShippingPet,
} from "./shippingData.js";

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
  const scheduleTotal = document.getElementById("userScheduleTotal");
  const list = document.getElementById("userScheduleList");
  const empty = document.getElementById("userScheduleEmpty");
  const count = document.getElementById("userScheduleCount");
  const historyList = document.getElementById("userScheduleHistoryList");
  const historyEmpty = document.getElementById("userScheduleHistoryEmpty");
  const historyCount = document.getElementById("userScheduleHistoryCount");
  const petStat = document.getElementById("userStatPetCount");
  const pendingStat = document.getElementById("userStatPendingCount");
  const completedStat = document.getElementById("userStatCompletedCount");
  let defaultPaymentMethod = loadPaymentPreference(user.username);
  let schedules = loadSchedules();
  let reviews = loadReviews();
  setBookingPaymentMethod(defaultPaymentMethod);

  function setBookingPaymentMethod(method) {
    form?.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
      input.checked = input.value === method;
    });
  }

  const petForm = document.getElementById("userPetForm");
  const petSpeciesInput = petForm?.elements.namedItem("species");
  const petSpeciesOtherGroup = document.getElementById("userPetSpeciesOtherGroup");
  const petSpeciesOtherInput = petForm?.elements.namedItem("speciesOther");
  const petMessage = document.getElementById("userPetMessage");
  const petList = document.getElementById("userPetList");
  const petEmpty = document.getElementById("userPetEmpty");
  const petCount = document.getElementById("userPetCount");
  let pets = loadPets().filter((pet) => String(pet.ownerUsername) === String(user.username));

  const petSelect = document.getElementById("userPetSelect");
  const petServicesContainer = document.getElementById("userPetServices");
  const shipToggle = document.getElementById("userShipToggle");
  const shipPanel = document.getElementById("userShipPanel");
  const shipQuoteText = document.getElementById("userShipQuoteText");
  const shipmentPetSelect = document.getElementById("userShipmentPet");
  const pickupAddressSelect = document.getElementById("userPickupAddress");
  const returnAddressSelect = document.getElementById("userReturnAddress");
  const shipCenterSelect = document.getElementById("userShipCenter");
  const shipTypeSelect = document.getElementById("userShipType");
  const returnAddressGroup = document.getElementById("userReturnAddressGroup");
  let currentShippingFee = 0;
  let activePetId = "";

  renderPets();
  renderPetSelect();
  populateShipControls();
  petSelect?.addEventListener("change", handlePetSelectionChange);
  shipToggle?.addEventListener("change", () => {
    if (shipPanel) shipPanel.hidden = !shipToggle.checked;
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect?.value !== "round-trip";
    syncShippingRequirements();
    updateShipQuote();
  });
  shipTypeSelect?.addEventListener("change", () => {
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect.value !== "round-trip";
    syncShippingRequirements();
    updateShipQuote();
  });
  shipmentPetSelect?.addEventListener("change", updateShipQuote);
  pickupAddressSelect?.addEventListener("change", updateShipQuote);
  shipCenterSelect?.addEventListener("change", updateShipQuote);
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
    updateScheduleTotal();
  });
  applyTimeLimits();
  timeInput?.addEventListener("change", updateScheduleTotal);
  returnDateInput?.addEventListener("change", updateScheduleTotal);
  returnTimeInput?.addEventListener("change", updateScheduleTotal);
  petSelect?.addEventListener("change", syncPetSittingFields);
  petServicesContainer?.addEventListener("change", (event) => {
    if (event.target.matches('input[name="careTypes"]')) syncPetSittingFields();
  });

  function populateShipControls() {
    const addresses = getAddressStorage().filter((address) => String(address.ownerUsername) === String(user.username));
    const emptyAddressMessage = document.getElementById("userShipAddressEmpty");
    if (emptyAddressMessage) emptyAddressMessage.hidden = addresses.length > 0;
    const populate = (select, options, placeholderText) => {
      if (!select) return;
      const previous = select.value;
      select.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = placeholderText;
      select.appendChild(placeholder);
      options.forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = label;
        select.appendChild(option);
      });
      if (options.some(({ value }) => String(value) === previous)) select.value = previous;
    };

    populate(shipmentPetSelect, pets.map((pet) => ({
      value: pet.id,
      label: `${pet.name || `Thú cưng #${pet.id}`} · ${pet.species || "Khác"}`,
    })), "-- Chọn thú cưng --");
    const addressOptions = addresses.map((address) => ({
      value: address.id,
      label: `${address.contactName || "Người liên hệ"} · ${[address.city, address.district].filter(Boolean).join(" ")}`.trim(),
    }));
    populate(pickupAddressSelect, addressOptions, "-- Chọn địa chỉ đón --");
    populate(returnAddressSelect, addressOptions, "-- Chọn địa chỉ trả --");
    populate(shipCenterSelect, SHIPMENT_CENTERS.map((center) => ({ value: center.code, label: center.name })), "-- Chọn trung tâm --");
    if (shipPanel) shipPanel.hidden = !shipToggle?.checked;
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect?.value !== "round-trip";
    syncShippingRequirements();
    updateShipQuote();
  }

  function syncShippingRequirements() {
    const shippingEnabled = Boolean(shipToggle?.checked);
    if (shipmentPetSelect) shipmentPetSelect.required = shippingEnabled;
    if (pickupAddressSelect) pickupAddressSelect.required = shippingEnabled;
    if (shipCenterSelect) shipCenterSelect.required = true;
    if (returnAddressSelect) returnAddressSelect.required = shippingEnabled && shipTypeSelect?.value === "round-trip";
  }

  function updateShipQuote() {
    currentShippingFee = 0;
    updateScheduleTotal();
    if (!shipToggle?.checked) {
      if (shipQuoteText) shipQuoteText.textContent = "Vui lòng chọn thú cưng, địa chỉ và trung tâm để xem phí ship.";
      return;
    }

    const hasSavedAddress = getAddressStorage().some((address) => String(address.ownerUsername) === String(user.username));
    if (!hasSavedAddress) {
      if (shipQuoteText) shipQuoteText.textContent = "Tài khoản chưa có địa chỉ. Hãy thêm địa chỉ để tiếp tục đặt ship.";
      return;
    }

    const pet = pets.find((item) => String(item.id) === String(shipmentPetSelect?.value || ""));
    const address = getAddressStorage().find((item) => String(item.id) === String(pickupAddressSelect?.value || "") && String(item.ownerUsername) === String(user.username));
    const center = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    if (!pet || !address || !center) {
      if (shipQuoteText) shipQuoteText.textContent = "Vui lòng chọn thú cưng, địa chỉ và trung tâm để xem phí ship.";
      return;
    }

    const petValidation = validateShippingPet(pet);
    if (!petValidation.valid) {
      if (shipQuoteText) shipQuoteText.textContent = petValidation.message;
      return;
    }

    const areaCode = getAddressAreaCode(address.city, address.district) || address.areaCode;
    const route = getDistanceForLocation(areaCode, center.code);
    if (!route) {
      if (shipQuoteText) shipQuoteText.textContent = "Không tìm thấy khoảng cách mô phỏng cho khu vực đã chọn.";
      return;
    }
    const quote = calculateShipmentFee({
      distanceKm: route.distanceKm,
      petSize: pet.size,
      transportType: shipTypeSelect?.value || "one-way",
    });
    if (shipQuoteText) {
      shipQuoteText.textContent = quote.valid
        ? `Khoảng cách mô phỏng: ${route.distanceKm} km · ${quote.message} Tổng: ${formatCurrency(quote.total)}.`
        : quote.message;
    }
    if (quote.valid) {
      currentShippingFee = quote.total;
      updateScheduleTotal();
    }
  }

  function createShippingRecord(scheduledPetIds, scheduleId) {
    if (!shipToggle?.checked) return null;

    const pet = pets.find((item) => String(item.id) === String(shipmentPetSelect?.value || ""));
    const addresses = getAddressStorage().filter((item) => String(item.ownerUsername) === String(user.username));
    const pickupAddress = addresses.find((item) => String(item.id) === String(pickupAddressSelect?.value || ""));
    const center = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    const transportType = shipTypeSelect?.value || "one-way";
    const returnAddress = addresses.find((item) => String(item.id) === String(returnAddressSelect?.value || ""));

    if (!pet || !pickupAddress || !center) {
      showMessage("Vui lòng chọn thú cưng, địa chỉ đón và trung tâm ship.", "error");
      return false;
    }
    if (!scheduledPetIds.includes(String(pet.id))) {
      showMessage("Thú cưng được vận chuyển phải nằm trong yêu cầu chăm sóc này.", "error");
      return false;
    }
    if (transportType === "round-trip" && !returnAddress) {
      showMessage("Vui lòng chọn địa chỉ trả cho hình thức vận chuyển hai chiều.", "error");
      return false;
    }
    const validation = validateShippingPet(pet);
    if (!validation.valid) {
      showMessage(validation.message, "error");
      return false;
    }

    const areaCode = getAddressAreaCode(pickupAddress.city, pickupAddress.district) || pickupAddress.areaCode;
    const route = getDistanceForLocation(areaCode, center.code);
    if (!route) {
      showMessage("Không tìm được khoảng cách mô phỏng cho địa chỉ đã chọn.", "error");
      return false;
    }
    const quote = calculateShipmentFee({
      distanceKm: route.distanceKm,
      petSize: pet.size,
      transportType,
    });
    if (!quote.valid) {
      showMessage(quote.message, "error");
      return false;
    }

    return {
      id: getNextShipmentId(getShipmentStorage()),
      scheduleId,
      customerUsername: user.username,
      customerName: user.fullName || user.username,
      customerPhone: user.phone || "",
      petId: Number(pet.id),
      petName: pet.name || "Thú cưng",
      pickupAddressId: String(pickupAddress.id),
      returnAddressId: transportType === "round-trip" ? String(returnAddress.id) : "",
      centerCode: center.code,
      centerName: center.name,
      areaCode,
      transportType,
      distanceKm: route.distanceKm,
      totalFee: quote.total,
      status: SHIPMENT_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      statusHistory: [{
        status: SHIPMENT_STATUS.PENDING,
        changedAt: new Date().toISOString(),
        changedBy: user.username,
      }],
    };
  }

  function currentDate() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function currentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function isValidDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, year, month, day] = match.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;
  }

  function isValidTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    return Boolean(match);
  }

  function populateTimeOptions() {
    if (!timeInput) return;
    const previous = timeInput.value;
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
    if (previous) timeInput.value = previous;
  }

  function populateReturnTimeOptions() {
    if (!returnTimeInput) return;
    const previous = returnTimeInput.value;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    const options = getTimeOptions().map((value) => {
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
    const openingTime = OPEN_TIME;
    const closingTime = CLOSE_TIME;
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
    updateScheduleTotal();
  }

  function updateScheduleTotal() {
    if (!scheduleTotal) return;
    const selectedPetIds = getSelectedPetIds();
    const selectedGroups = Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
      .filter((group) => selectedPetIds.has(group.dataset.petId));
    let total = 0;
    let hasSelectedService = false;
    let hasUnpricedPetSitting = false;

    selectedGroups.forEach((group) => {
      const services = Array.from(group.querySelectorAll('input[name="careTypes"]:checked'), (input) => input.value);
      if (!services.length) return;
      hasSelectedService = true;
      total += getCareTypePrice(services);
      if (services.includes(CARE_TYPE_PET_SITTING)) {
        const sittingPrice = getPetSittingPrice(
          dateInput?.value,
          timeInput?.value,
          returnDateInput?.value,
          returnTimeInput?.value,
        );
        if (sittingPrice) total += sittingPrice;
        else hasUnpricedPetSitting = true;
      }
    });

    scheduleTotal.hidden = !hasSelectedService;
    if (!hasSelectedService) return;
    if (hasUnpricedPetSitting) {
      scheduleTotal.textContent = total
        ? `Dịch vụ: ${formatCurrency(total)} · Chưa gồm phí trông giữ; chọn ngày giờ nhận và trả để tính đủ.`
        : "Chọn ngày giờ nhận và trả để xem tổng tiền dịch vụ.";
      return;
    }
    if (shipToggle?.checked && !currentShippingFee) {
      scheduleTotal.textContent = `Dịch vụ: ${formatCurrency(total) || "0đ"} · Phí vận chuyển đang chờ báo giá.`;
      return;
    }
    const shippingLabel = currentShippingFee ? ` · Vận chuyển: ${formatCurrency(currentShippingFee)}` : "";
    scheduleTotal.textContent = `Dịch vụ: ${formatCurrency(total) || "0đ"}${shippingLabel} · Tổng thanh toán: ${formatCurrency(total + currentShippingFee) || "0đ"}.`;
  }

  let isSubmitting = false;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      submitSchedule();
    } finally {
      isSubmitting = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  function submitSchedule() {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const paymentMethod = String(formData.get("paymentMethod") || "");
    if (!["at-center", "bank-transfer", "wallet"].includes(paymentMethod)) {
      showMessage("Phương thức thanh toán không hợp lệ. Vui lòng chọn lại.", "error");
      return;
    }

    const isPetSitting = isPetSittingSelected();
    const today = currentDate();
    if (String(formData.get("date") || "") < today) {
      showMessage("Bạn không thể chọn ngày đã qua. Vui lòng chọn từ hôm nay trở đi.", "error");
      return;
    }

    const time = String(formData.get("time") || "").trim();
    const selectedCenter = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    if (!selectedCenter) {
      showMessage("Vui lòng chọn trung tâm chăm sóc.", "error");
      return;
    }
    if (!isValidDate(String(formData.get("date") || ""))) {
      showMessage("Ngày đặt lịch không hợp lệ. Vui lòng chọn lại ngày.", "error");
      return;
    }
    if (!isValidTime(time)) {
      showMessage("Giờ đặt lịch không hợp lệ. Vui lòng chọn lại giờ.", "error");
      return;
    }
    const earliestTime = OPEN_TIME;
    const latestTime = CLOSE_TIME;
    if (time && (time < earliestTime || time > latestTime)) {
      showMessage(`Giờ nhận thú cưng phải trong giờ làm việc (${OPEN_TIME} đến ${CLOSE_TIME}).`, "error");
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
    if (isPetSitting && endTime && (endTime < OPEN_TIME || endTime > CLOSE_TIME)) {
      showMessage(`Giờ trả thú cưng phải trong giờ làm việc (${OPEN_TIME} đến ${CLOSE_TIME}).`, "error");
      return;
    }
    if (isPetSitting && (!isValidDate(endDate) || !isValidTime(endTime))) {
      showMessage("Ngày hoặc giờ trả thú cưng không hợp lệ.", "error");
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

    if (!petServiceSelections.length) {
      showMessage("Vui lòng chọn ít nhất một thú cưng để đặt lịch.", "error");
      return;
    }
    if (selectedPetIds.size !== petServiceSelections.length) {
      showMessage("Danh sách thú cưng đã chọn không hợp lệ. Vui lòng chọn lại.", "error");
      return;
    }

    const missingServices = petServiceSelections.filter(({ services }) => services.length === 0);
    if (missingServices.length) {
      const names = missingServices.map(({ pet }) => pet.name || `Thú cưng #${pet.id}`).join(", ");
      showMessage(`Vui lòng chọn ít nhất một dịch vụ cho: ${names}.`, "error");
      return;
    }
    const invalidServices = petServiceSelections.filter(({ services }) =>
      services.some((service) => service !== CARE_TYPE_PET_SITTING && !isKnownCareType(service)),
    );
    if (invalidServices.length) {
      showMessage("Có dịch vụ không còn được cung cấp. Vui lòng chọn lại dịch vụ.", "error");
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
      centerCode: selectedCenter.code,
      centerName: selectedCenter.name,
      endDate: isPetSitting ? endDate : "",
      endTime: isPetSitting ? endTime : "",
      note: String(formData.get("note") || "").trim(),
      customerUsername: user.username,
      customerName: user.fullName || user.username,
      customerPhone: user.phone || "",
      payment: {
        method: paymentMethod,
        status: "Chưa thanh toán",
        amount: 0,
      },
      status: "Chờ xác nhận",
      source: "user",
      createdAt: new Date().toISOString(),
    };

    if (hasScheduleConflict(latestSchedules, schedule)) {
      showMessage("Thú cưng đã có lịch trùng thời gian. Vui lòng chọn giờ khác.", "error");
      return;
    }

    if (schedule.note.length > 500) {
      showMessage("Ghi chú không được vượt quá 500 ký tự.", "error");
      return;
    }

    const shippingRecord = createShippingRecord(
      selectedPets.map((pet) => String(pet.id)),
      schedule.id,
    );
    if (shippingRecord === false) return;
    if (shippingRecord) {
      schedule.shipping = {
        id: shippingRecord.id,
        centerName: shippingRecord.centerName,
        transportType: shippingRecord.transportType,
        totalFee: shippingRecord.totalFee,
        distanceKm: shippingRecord.distanceKm,
      };
    }
    schedule.payment.amount = schedule.price + (shippingRecord?.totalFee || 0);

    if (schedule.payment.method === "wallet") {
      const wallet = loadWallet(user.username);
      if (wallet.balance < schedule.payment.amount) {
        showMessage(`Số dư ví ${formatCurrency(wallet.balance) || "0đ"} chưa đủ. Cần ${formatCurrency(schedule.payment.amount)} để thanh toán lịch này.`, "error");
        return;
      }
      schedule.payment.status = "Đã thanh toán";
    }

    const nextSchedules = [...latestSchedules, schedule];
    if (!saveSchedules(nextSchedules)) {
      showMessage("Không thể lưu lịch. Vui lòng thử lại.", "error");
      return;
    }

    const shipmentsBeforeBooking = getShipmentStorage();
    if (shippingRecord && !saveShipmentStorage([...shipmentsBeforeBooking, shippingRecord])) {
      saveSchedules(latestSchedules);
      showMessage("Không thể lưu đơn ship. Lịch chưa được tạo; vui lòng thử lại.", "error");
      return;
    }

    if (schedule.payment.method === "wallet" && !chargeWallet(user.username, schedule.payment.amount, `Thanh toán lịch #${schedule.id}`)) {
      saveSchedules(latestSchedules);
      if (shippingRecord) saveShipmentStorage(shipmentsBeforeBooking);
      showMessage("Không thể trừ số dư ví. Lịch chưa được tạo; vui lòng kiểm tra lại số dư.", "error");
      return;
    }
    if (schedule.payment.method === "wallet") window.dispatchEvent(new Event("neko:wallet-updated"));

    schedules = nextSchedules;
    form.reset();
    setBookingPaymentMethod(defaultPaymentMethod);
    renderPetServiceChoices();
    if (shipToggle) shipToggle.checked = false;
    if (shipPanel) shipPanel.hidden = true;
    populateShipControls();
    syncPetSittingFields();
    applyScheduleLimits();
    render();
    showMessage("Đã gửi lịch chăm sóc tới NEKO. Chúng tôi sẽ liên hệ xác nhận sớm nhất.", "success");
  }

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  petForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!petForm.reportValidity()) return;

    const editId = document.getElementById("userPetEditId")?.value || "";
    const petName = String(petForm.elements.namedItem("name")?.value || "").trim();
    const size = petForm.querySelector('input[name="size"]:checked')?.value || "";
    if (!petName) {
      showPetMessage("Vui lòng nhập tên thú cưng.", "error");
      return;
    }
    if (!size) {
      showPetMessage("Vui lòng chọn nhóm kích thước thú cưng.", "error");
      return;
    }

    const previousPet = editId ? pets.find((item) => Number(item.id) === Number(editId)) : null;
    if (editId && !previousPet) {
      showPetMessage("Không tìm thấy hồ sơ thú cưng thuộc tài khoản của bạn.", "error");
      return;
    }
    const pet = {
      ...(previousPet || {}),
      id: editId ? Number(editId) : getNextPetId(),
      name: petName,
      species: petSpeciesInput?.value === "Khác"
        ? String(petSpeciesOtherInput?.value || "").trim()
        : petSpeciesInput?.value || "Chó",
      breed: String(petForm.elements.namedItem("breed")?.value || "").trim(),
      size,
      owner: String(petForm.elements.namedItem("owner")?.value || "").trim() || user.fullName || user.username,
      ownerPhone: String(petForm.elements.namedItem("ownerPhone")?.value || "").trim(),
      ownerUsername: user.username,
      status: "Chờ lịch",
    };

    const allPets = loadPets();
    const nextPets = editId
      ? allPets.map((item) => String(item.ownerUsername) === String(user.username) && Number(item.id) === Number(editId) ? pet : item)
      : [...allPets, pet];
    if (!savePets(nextPets)) {
      showPetMessage("Không thể lưu thú cưng. Vui lòng thử lại.", "error");
      return;
    }

    pets = nextPets.filter((item) => String(item.ownerUsername) === String(user.username));
    petForm.reset();
    const editInput = document.getElementById("userPetEditId");
    if (editInput) editInput.value = "";
    const submitButton = petForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = "Đăng ký thú cưng";
    syncPetSpeciesOther();
    renderPets();
    renderPetSelect();
    populateShipControls();
    showPetMessage(editId ? `Đã cập nhật hồ sơ thú cưng ${pet.name}.` : `Đã đăng ký thú cưng ${pet.name}. Bạn có thể đặt lịch ngay.`, "success");
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

  function editPetProfile(pet) {
    const editId = document.getElementById("userPetEditId");
    if (!editId || !petForm) return;
    editId.value = String(pet.id);
    petForm.elements.namedItem("name").value = pet.name || "";
    petForm.elements.namedItem("species").value = ["Chó", "Mèo"].includes(pet.species) ? pet.species : "Khác";
    petSpeciesOtherInput.value = ["Chó", "Mèo", "Khác"].includes(pet.species) ? "" : pet.species || "";
    petForm.elements.namedItem("breed").value = pet.breed || "";
    petForm.elements.namedItem("owner").value = pet.owner || user.fullName || user.username;
    petForm.elements.namedItem("ownerPhone").value = pet.ownerPhone || user.phone || "";
    petForm.querySelectorAll('input[name="size"]').forEach((input) => {
      input.checked = input.value === String(pet.size || "").toLowerCase();
    });
    const submitButton = petForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.textContent = "Lưu thay đổi";
    syncPetSpeciesOther();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPets() {
    if (!petList || !petEmpty || !petCount) return;
    petList.replaceChildren();
    petCount.textContent = `${pets.length} thú cưng`;
    petEmpty.hidden = pets.length > 0;
    if (petStat) petStat.textContent = String(pets.length);

    pets.forEach((pet) => {
      const card = document.createElement("article");
      card.className = "user-pet-card";

      const info = document.createElement("div");
      info.className = "user-pet-card-info";

      const primary = document.createElement("div");
      primary.className = "user-pet-card-primary";
      const name = document.createElement("h3");
      name.textContent = pet.name || "Thú cưng";
      primary.appendChild(name);

      const ownerDetails = document.createElement("span");
      ownerDetails.className = "user-pet-card-owner";
      const ownerName = document.createElement("span");
      ownerName.className = "user-pet-card-owner-name";
      ownerName.textContent = `Chủ nuôi: ${pet.owner || user.fullName || user.username}`;
      const ownerPhone = document.createElement("span");
      ownerPhone.className = "user-pet-card-phone";
      ownerPhone.textContent = `SĐT: ${pet.ownerPhone || user.phone || "Chưa cập nhật"}`;
      ownerDetails.append(ownerName, ownerPhone);
      primary.appendChild(ownerDetails);

      const title = document.createElement("div");
      title.className = "user-pet-card-title";

      const speciesTag = document.createElement("span");
      speciesTag.className = "user-pet-species";
      speciesTag.textContent = pet.species || "Khác";
      title.appendChild(speciesTag);

      if (pet.breed) {
        const breed = document.createElement("span");
        breed.className = "user-pet-card-breed";
        breed.textContent = pet.breed;
        title.appendChild(breed);
      }
      info.append(primary, title);

      const facts = document.createElement("span");
      facts.className = "user-pet-card-facts";
      const sizeLabel = pet.size === "small" ? "Nhỏ" : pet.size === "medium" ? "Vừa" : pet.size === "large" ? "Lớn" : "";
      facts.textContent = sizeLabel || pet.status || "";
      if (facts.textContent) info.appendChild(facts);

      card.appendChild(info);

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "care-btn care-btn-edit";
      edit.textContent = "Sửa";
      edit.addEventListener("click", () => editPetProfile(pet));

      const actions = document.createElement("div");
      actions.className = "user-pet-card-actions";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "care-btn care-btn-delete user-pet-remove";
      remove.textContent = "Xóa";
      remove.setAttribute("data-remove-pet", "true");
      remove.addEventListener("click", () => {
        const linkedSchedule = loadSchedules().some((schedule) =>
          (schedule.customerUsername || schedule.ownerUsername) === user.username &&
          (
            String(schedule.petId) === String(pet.id) ||
            (Array.isArray(schedule.petIds) && schedule.petIds.some((id) => String(id) === String(pet.id))) ||
            (Array.isArray(schedule.petServices) && schedule.petServices.some((item) => String(item.petId) === String(pet.id)))
          ),
        );
        if (linkedSchedule) {
          showPetMessage("Thú cưng đã liên kết với lịch chăm sóc nên không thể xóa. Bạn có thể giữ hồ sơ để xem lại lịch sử.", "error");
          return;
        }
        if (!confirm(`Xóa hồ sơ thú cưng ${pet.name}?`)) return;
        const nextPets = pets.filter((item) => Number(item.id) !== Number(pet.id));
        if (!savePets(loadPets().filter((item) => !(item.ownerUsername === user.username && Number(item.id) === Number(pet.id))))) {
          showPetMessage("Không thể xóa hồ sơ. Vui lòng thử lại.", "error");
          return;
        }
        pets = nextPets;
        renderPets();
        renderPetSelect();
        populateShipControls();
        syncPetSittingFields();
        showPetMessage(`Đã xóa hồ sơ thú cưng ${pet.name}.`, "success");
      });
      actions.append(edit, remove);
      card.appendChild(actions);

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

    const shipmentsBefore = getShipmentStorage();
    const linkedShipment = schedule.shipping?.id
      ? shipmentsBefore.find((item) =>
        String(item.id) === String(schedule.shipping.id) &&
        String(item.customerUsername) === String(user.username),
      )
      : null;
    if (schedule.shipping && !linkedShipment) {
      showMessage("Không tìm thấy đơn vận chuyển liên kết. Lịch chưa được hủy.", "error");
      return;
    }
    let shipmentsAfter = shipmentsBefore;
    if (linkedShipment && linkedShipment.status !== SHIPMENT_STATUS.CANCELLED) {
      const updatedShipment = updateShipmentStatus(
        linkedShipment,
        SHIPMENT_STATUS.CANCELLED,
        user.username,
      );
      if (!updatedShipment) {
        showMessage("Đơn vận chuyển đã bắt đầu hoặc kết thúc nên lịch không thể bị hủy.", "error");
        return;
      }
      shipmentsAfter = shipmentsBefore.map((item) =>
        String(item.id) === String(linkedShipment.id) ? updatedShipment : item,
      );
      if (!saveShipmentStorage(shipmentsAfter)) {
        showMessage("Không thể hủy đơn vận chuyển. Lịch chưa được hủy.", "error");
        return;
      }
    }

    const nextSchedules = latestSchedules.map((item) =>
      Number(item.id) === Number(id) &&
      (item.customerUsername || item.ownerUsername) === user.username
        ? { ...item, status: SCHEDULE_STATUS.CANCELLED, cancelledAt: new Date().toISOString() }
        : item,
    );

    if (!saveSchedules(nextSchedules)) {
      if (shipmentsAfter !== shipmentsBefore) saveShipmentStorage(shipmentsBefore);
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
    if (event.key !== REVIEW_STORAGE_KEY) return;
    reviews = loadReviews();
    render();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === SHIPMENT_STORAGE_KEY) render();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== "neko:addresses") return;
    populateShipControls();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== PET_STORAGE_KEY) return;
    pets = loadPets().filter((pet) => String(pet.ownerUsername) === String(user.username));
    renderPets();
    renderPetSelect();
    populateShipControls();
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
    if (pendingStat) {
      pendingStat.textContent = String(userSchedules.filter(
        (schedule) => resolveScheduleStatus(schedule) === SCHEDULE_STATUS.PENDING,
      ).length);
    }
    if (completedStat) {
      completedStat.textContent = String(userSchedules.filter(
        (schedule) => resolveScheduleStatus(schedule) === SCHEDULE_STATUS.COMPLETED,
      ).length);
    }
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

      const paymentAmount = Number(schedule.payment?.amount ?? (Number(schedule.price) + Number(schedule.shipping?.totalFee || 0)));
      const price = formatCurrency(paymentAmount);

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
      const scheduleShipment = schedule.shipping
        ? getShipmentStorage().find((item) =>
          String(item.id) === String(schedule.shipping.id) &&
          String(item.customerUsername) === String(user.username),
        )
        : null;
      status.className = `user-schedule-status ${getScheduleStatusClass(statusValue)}`;
      status.textContent = statusValue;
      heading.appendChild(status);

      const details = document.createElement("div");
      details.className = "user-schedule-details";
      details.textContent = `${formatDate(schedule.date)} · ${schedule.time || ""}${schedule.endDate ? ` → ${formatDate(schedule.endDate)} ${schedule.endTime || ""}` : ""} · ${schedule.careType || "Chăm sóc"}${price ? ` · ${price}` : ""}`;
      card.append(heading, details);

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

      if (schedule.shipping) {
        more.append(
          createScheduleRow("Vận chuyển", `${schedule.shipping.centerName || "Trung tâm NEKO"} · ${schedule.shipping.transportType === "round-trip" ? "Hai chiều" : "Một chiều"}`),
          createScheduleRow("Phí vận chuyển", formatCurrency(schedule.shipping.totalFee) || "Theo yêu cầu"),
          createScheduleRow("Khoảng cách mô phỏng", `${schedule.shipping.distanceKm} km`),
          createScheduleRow("Trạng thái vận chuyển", scheduleShipment?.status || "Không tìm thấy đơn vận chuyển"),
        );
        (scheduleShipment?.statusHistory || []).forEach((history) => {
          more.appendChild(createScheduleRow(
            "Lịch sử vận chuyển",
            `${history.status} · ${formatDateTime(history.changedAt)}`,
          ));
        });
      }

      more.append(
        createScheduleRow("Tổng thanh toán", price || "Theo yêu cầu"),
        createScheduleRow("Phương thức thanh toán", schedule.payment?.method === "bank-transfer" ? "Chuyển khoản sau khi xác nhận" : "Thanh toán tại trung tâm"),
        createScheduleRow("Trạng thái thanh toán", schedule.payment?.status || "Chưa thanh toán"),
        createScheduleRow("Trạng thái", statusValue),
        createScheduleRow("Ghi chú", schedule.note || "Không có"),
      );

      if (statusValue === SCHEDULE_STATUS.COMPLETED) {
        more.appendChild(createReviewEditor(schedule));
      }

      const canCancelShipment = !schedule.shipping || (
        scheduleShipment &&
        (
          scheduleShipment.status === SHIPMENT_STATUS.CANCELLED ||
          getShipmentNextStatuses(scheduleShipment.status).includes(SHIPMENT_STATUS.CANCELLED)
        )
      );
      if ([SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(statusValue) && canCancelShipment) {
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

  function createReviewEditor(schedule) {
    const section = document.createElement("section");
    section.className = "user-review-editor";

    const heading = document.createElement("h4");
    heading.textContent = "Đánh giá dịch vụ";
    section.appendChild(heading);

    const existingReview = getReviewForSchedule(reviews, schedule.id, user.username);
    const anyReview = getReviewForSchedule(reviews, schedule.id);
    if (anyReview && !existingReview) {
      const notice = document.createElement("p");
      notice.className = "user-review-notice";
      notice.textContent = "Lịch này đã có đánh giá.";
      section.appendChild(notice);
      return section;
    }

    const reviewForm = document.createElement("form");
    reviewForm.className = "user-review-form";

    const ratingGroup = document.createElement("div");
    ratingGroup.className = "care-form-group";
    const ratingLabel = document.createElement("label");
    ratingLabel.htmlFor = `reviewRating-${schedule.id}`;
    ratingLabel.textContent = "Mức đánh giá";
    const ratingSelect = document.createElement("select");
    ratingSelect.id = `reviewRating-${schedule.id}`;
    ratingSelect.required = true;
    [
      ["5", "5 sao - Rất hài lòng"],
      ["4", "4 sao - Hài lòng"],
      ["3", "3 sao - Bình thường"],
      ["2", "2 sao - Chưa hài lòng"],
      ["1", "1 sao - Không hài lòng"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      ratingSelect.appendChild(option);
    });
    if (existingReview) ratingSelect.value = String(existingReview.rating);
    ratingGroup.append(ratingLabel, ratingSelect);

    const commentGroup = document.createElement("div");
    commentGroup.className = "care-form-group";
    const commentLabel = document.createElement("label");
    commentLabel.htmlFor = `reviewComment-${schedule.id}`;
    commentLabel.textContent = "Bình luận";
    const commentInput = document.createElement("textarea");
    commentInput.id = `reviewComment-${schedule.id}`;
    commentInput.required = true;
    commentInput.maxLength = 1000;
    commentInput.rows = 3;
    commentInput.placeholder = "Chia sẻ trải nghiệm chăm sóc thú cưng của bạn";
    commentInput.value = existingReview?.comment || "";
    commentGroup.append(commentLabel, commentInput);

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "care-btn care-btn-add";
    saveButton.textContent = existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá";
    reviewForm.append(ratingGroup, commentGroup, saveButton);
    reviewForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const validationError = validateReview({
        schedule,
        username: user.username,
        rating: ratingSelect.value,
        comment: commentInput.value,
      });
      if (validationError) {
        showMessage(validationError, "error");
        return;
      }

      if (existingReview) {
        const nextReviews = reviews.map((review) =>
          String(review.id) === String(existingReview.id)
            ? { ...review, rating: Number(ratingSelect.value), comment: commentInput.value.trim(), updatedAt: new Date().toISOString() }
            : review,
        );
        if (!saveReviews(nextReviews)) {
          showMessage("Không thể cập nhật đánh giá. Vui lòng thử lại.", "error");
          return;
        }
        reviews = nextReviews;
      } else {
        if (getReviewForSchedule(reviews, schedule.id)) {
          showMessage("Lịch này đã có đánh giá.", "error");
          render();
          return;
        }
        if (!canReviewSchedule(schedule, user.username)) {
          showMessage("Chỉ có thể đánh giá lịch đã hoàn thành của bạn.", "error");
          return;
        }
        const review = createReviewRecord({
          id: getNextReviewId(reviews),
          schedule,
          user,
          rating: Number(ratingSelect.value),
          comment: commentInput.value,
        });
        const nextReviews = [...reviews, review];
        if (!saveReviews(nextReviews)) {
          showMessage("Không thể gửi đánh giá. Vui lòng thử lại.", "error");
          return;
        }
        reviews = nextReviews;
      }

      render();
      showMessage(existingReview ? "Đã cập nhật đánh giá." : "Cảm ơn bạn đã gửi đánh giá.", "success");
    });

    if (existingReview) {
      const status = document.createElement("p");
      status.className = "user-review-notice";
      status.textContent = `Đánh giá hiện tại: ${existingReview.rating}/5 sao`;
      section.appendChild(status);
    }
    section.appendChild(reviewForm);
    return section;
  }

  render();
}

function formatDate(value) {
  if (!value) return "Chưa chọn ngày";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "thời điểm không rõ" : date.toLocaleString("vi-VN");
}
