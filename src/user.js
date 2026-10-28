import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  loadPaymentPreference,
  savePaymentPreference,
} from "./paymentData.js";
import { getNextPetId, getPetCode, loadPets, PET_STORAGE_KEY, savePets } from "./petData.js";
import {
  CARE_TYPES,
  CARE_TYPE_PET_SITTING,
  CLOSE_TIME,
  OPEN_TIME,
  PET_SITTING_CAGE_TYPES,
  PET_SITTING_CAPACITY,
  PET_SITTING_DAILY_RATE,
  PET_SITTING_HOURLY_RATE,
  SCHEDULE_BUFFER_MINUTES,
  SCHEDULE_CONFLICT_OVERLAP,
  SCHEDULE_STATUS,
  SCHEDULE_STORAGE_KEY,
  formatCurrency,
  getCareTypePrice,
  getCageTypeForPetSize,
  getNextScheduleId,
  getPetSittingCageType,
  getPetSittingCageUsage,
  getScheduleConflictType,
  getSchedulePetSittingIds,
  getScheduleStatusClass,
  getTimeOptions,
  getPetSittingPrice,
  findScheduleConflicts,
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

  form?.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      defaultPaymentMethod = input.value;
      savePaymentPreference(user.username, input.value);
    });
  });

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
  const shipmentPetsContainer = document.getElementById("userShipmentPets");
  const pickupAddressSelect = document.getElementById("userPickupAddress");
  const returnAddressSelect = document.getElementById("userReturnAddress");
  const shipCenterSelect = document.getElementById("userShipCenter");
  const shipTypeSelect = document.getElementById("userShipType");
  const returnAddressGroup = document.getElementById("userReturnAddressGroup");
  let currentShippingFee = 0;
  let activePetId = "";

  const dateInput = form?.elements.namedItem("date");
  const timeInput = form?.elements.namedItem("time");
  const returnDateInput = form?.elements.namedItem("endDate");
  const returnTimeInput = form?.elements.namedItem("endTime");
  const noteInput = form?.elements.namedItem("note");
  const submitButton = form?.querySelector('button[type="submit"]');
  const editBanner = document.getElementById("userScheduleEditBanner");
  const editBannerText = document.getElementById("userScheduleEditText");
  const editCancelButton = document.getElementById("userScheduleEditCancelBtn");
  const confirmDialog = document.getElementById("userScheduleConfirmDialog");
  const confirmLead = document.getElementById("userScheduleConfirmLead");
  const confirmList = document.getElementById("userScheduleConfirmList");
  const confirmSubmitButton = document.getElementById("userScheduleConfirmSubmit");
  const confirmCancelButton = document.getElementById("userScheduleConfirmCancel");
  const qrDialog = document.getElementById("userBankTransferQrDialog");
  const qrContent = document.getElementById("userBankTransferQrContent");
  const qrCloseButton = document.getElementById("userBankTransferQrClose");
  let editingScheduleId = null;
  let editingScheduleSnapshot = null;
  let pendingConfirmation = null;

  renderPets();
  renderPetSelect();
  populateShipControls();
  petSelect?.addEventListener("change", handlePetSelectionChange);
  shipToggle?.addEventListener("change", () => {
    if (shipPanel) shipPanel.hidden = !shipToggle.checked;
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect?.value !== "round-trip";
    renderShipmentPetChoices();
    syncShippingRequirements();
    updateShipQuote();
  });
  shipTypeSelect?.addEventListener("change", () => {
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect.value !== "round-trip";
    syncShippingRequirements();
    updateShipQuote();
  });
  shipmentPetsContainer?.addEventListener("change", (event) => {
    if (event.target.matches('input[name="shipmentPetIds"]')) updateShipQuote();
  });
  pickupAddressSelect?.addEventListener("change", updateShipQuote);
  returnAddressSelect?.addEventListener("change", updateShipQuote);
  shipCenterSelect?.addEventListener("change", updateShipQuote);
  syncPetSpeciesOther();
  petSpeciesInput?.addEventListener("change", syncPetSpeciesOther);

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
  editCancelButton?.addEventListener("click", () => {
    stopEditSchedule({ resetForm: true });
    showMessage("Đã huỷ chỉnh sửa lịch.", "success");
  });
  applyTimeLimits();
  timeInput?.addEventListener("change", updateScheduleTotal);
  returnDateInput?.addEventListener("change", updateScheduleTotal);
  returnTimeInput?.addEventListener("change", updateScheduleTotal);
  petSelect?.addEventListener("change", syncPetSittingFields);
  petServicesContainer?.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="careTypes"]')) return;
    syncPetSittingFields();
    renderShipmentPetChoices();
    updateShipQuote();
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

    renderShipmentPetChoices();
    const addressOptions = addresses.map((address) => {
      const addressLine = [address.houseNumber, address.street || address.detail]
        .filter(Boolean)
        .join(", ");
      const locationLine = [address.ward, address.district, address.city].filter(Boolean).join(", ");
      const label = [addressLine, locationLine].filter(Boolean).join(", ") || "Địa chỉ";
      return {
        value: address.id,
        label,
      };
    });
    populate(pickupAddressSelect, addressOptions, "-- Chọn địa chỉ đón --");
    populate(returnAddressSelect, addressOptions, "-- Chọn địa chỉ trả --");
    populate(shipCenterSelect, SHIPMENT_CENTERS.map((center) => ({ value: center.code, label: center.name })), "-- Chọn trung tâm --");
    if (shipPanel) shipPanel.hidden = !shipToggle?.checked;
    if (returnAddressGroup) returnAddressGroup.hidden = shipTypeSelect?.value !== "round-trip";
    syncShippingRequirements();
    updateShipQuote();
  }

  function renderShipmentPetChoices() {
    if (!shipmentPetsContainer) return;
    const selected = new Set(
      Array.from(shipmentPetsContainer.querySelectorAll('input[name="shipmentPetIds"]'))
        .filter((input) => input.checked)
        .map((input) => input.value),
    );
    shipmentPetsContainer.replaceChildren();

    if (!pets.length) {
      const empty = document.createElement("p");
      empty.className = "user-pet-choice-empty";
      empty.textContent = "Bạn chưa đăng ký thú cưng nào.";
      shipmentPetsContainer.appendChild(empty);
      return;
    }

    const scheduledPetIds = getSelectedPetIds();
    const scheduledPets = pets.filter((pet) => scheduledPetIds.has(String(pet.id)));
    if (!scheduledPets.length) {
      const empty = document.createElement("p");
      empty.className = "user-pet-choice-empty";
      empty.textContent = "Chọn thú cưng cho lịch chăm sóc để chọn bé cần ship.";
      shipmentPetsContainer.appendChild(empty);
      return;
    }

    const servicedPetIds = new Set(
      Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
        .filter((group) => scheduledPetIds.has(group.dataset.petId) && getCheckedCareTypes(group).length > 0)
        .map((group) => group.dataset.petId),
    );
    const shippablePets = scheduledPets.filter((pet) => servicedPetIds.has(String(pet.id)));
    if (!shippablePets.length) {
      const empty = document.createElement("p");
      empty.className = "user-pet-choice-empty";
      empty.textContent = "Chọn dịch vụ cho thú cưng để chọn bé cần ship.";
      shipmentPetsContainer.appendChild(empty);
      return;
    }

    shippablePets.forEach((pet) => {
      const choice = document.createElement("label");
      choice.className = "user-pet-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "shipmentPetIds";
      checkbox.value = String(pet.id);
      checkbox.checked = selected.has(String(pet.id));
      const name = document.createElement("span");
      name.textContent = `${pet.name || `Thú cưng #${pet.id}`} · ${pet.species || "Khác"}`;
      const select = document.createElement("span");
      select.className = "user-pet-choice-select";
      select.append(checkbox, name);
      choice.appendChild(select);
      shipmentPetsContainer.appendChild(choice);
    });
  }

  function getSelectedShipmentPets() {
    if (!shipmentPetsContainer) return [];
    const ids = Array.from(
      shipmentPetsContainer.querySelectorAll('input[name="shipmentPetIds"]'),
    )
      .filter((input) => input.checked)
      .map((input) => input.value);
    return pets.filter((pet) => ids.includes(String(pet.id)));
  }

  function syncShippingRequirements() {
    const shippingEnabled = Boolean(shipToggle?.checked);
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

    const shipmentPets = getSelectedShipmentPets();
    const addresses = getAddressStorage().filter((item) => String(item.ownerUsername) === String(user.username));
    const address = addresses.find((item) => String(item.id) === String(pickupAddressSelect?.value || ""));
    const center = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    if (!shipmentPets.length || !address || !center) {
      if (shipQuoteText) shipQuoteText.textContent = "Vui lòng chọn thú cưng, địa chỉ và trung tâm để xem phí ship.";
      return;
    }

    for (const pet of shipmentPets) {
      const petValidation = validateShippingPet(pet);
      if (!petValidation.valid) {
        if (shipQuoteText) shipQuoteText.textContent = petValidation.message;
        return;
      }
    }

    const transportType = shipTypeSelect?.value || "one-way";
    const returnAddress = transportType === "round-trip"
      ? addresses.find((item) => String(item.id) === String(returnAddressSelect?.value || ""))
      : null;
    if (transportType === "round-trip" && !returnAddress) {
      if (shipQuoteText) shipQuoteText.textContent = "Vui lòng chọn địa chỉ trả cho hình thức vận chuyển hai chiều.";
      return;
    }

    const route = resolveShipmentRoute(address, returnAddress, center);
    if (!route) {
      if (shipQuoteText) shipQuoteText.textContent = "Không tìm thấy khoảng cách mô phỏng cho khu vực đã chọn.";
      return;
    }

    let total = 0;
    let lastMessage = "";
    for (const pet of shipmentPets) {
      const quote = calculateShipmentFee({
        distanceKm: route.distanceKm,
        petSize: pet.size,
        transportType,
      });
      if (!quote.valid) {
        if (shipQuoteText) shipQuoteText.textContent = quote.message;
        return;
      }
      total += quote.total;
      lastMessage = quote.message;
    }

    if (shipQuoteText) {
      const petLabel = shipmentPets.length > 1 ? `${shipmentPets.length} thú cưng` : "1 thú cưng";
      shipQuoteText.textContent = `Khoảng cách mô phỏng: ${route.distanceKm} km · ${lastMessage} ${petLabel}: Tổng ${formatCurrency(total)}.`;
    }
    currentShippingFee = total;
    updateScheduleTotal();
  }

  function resolveShipmentRoute(pickupAddress, returnAddress, center) {
    const pickupRoute = resolveAddressRoute(pickupAddress, center);
    if (!pickupRoute) return null;
    if (!returnAddress) return pickupRoute;

    const returnRoute = resolveAddressRoute(returnAddress, center);
    if (!returnRoute) return null;

    return {
      ...pickupRoute,
      distanceKm: pickupRoute.distanceKm + returnRoute.distanceKm,
    };
  }

  function resolveAddressRoute(address, center) {
    const areaCode = getAddressAreaCode(address?.city, address?.district) || address?.areaCode;
    return getDistanceForLocation(areaCode, center.code);
  }

  function createShippingRecord(scheduledPetIds, scheduleId) {
    if (!shipToggle?.checked) return null;

    const shipmentPets = getSelectedShipmentPets();
    const addresses = getAddressStorage().filter((item) => String(item.ownerUsername) === String(user.username));
    const pickupAddress = addresses.find((item) => String(item.id) === String(pickupAddressSelect?.value || ""));
    const center = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    const transportType = shipTypeSelect?.value || "one-way";
    const returnAddress = addresses.find((item) => String(item.id) === String(returnAddressSelect?.value || ""));

    if (!shipmentPets.length || !pickupAddress || !center) {
      showMessage("Vui lòng chọn thú cưng, địa chỉ đón và trung tâm ship.", "error");
      return false;
    }
    const outsideSchedule = shipmentPets.find((pet) => !scheduledPetIds.includes(String(pet.id)));
    if (outsideSchedule) {
      showMessage("Thú cưng được vận chuyển phải nằm trong yêu cầu chăm sóc này.", "error");
      return false;
    }
    if (transportType === "round-trip" && !returnAddress) {
      showMessage("Vui lòng chọn địa chỉ trả cho hình thức vận chuyển hai chiều.", "error");
      return false;
    }
    for (const pet of shipmentPets) {
      const validation = validateShippingPet(pet);
      if (!validation.valid) {
        showMessage(validation.message, "error");
        return false;
      }
    }

    const route = resolveShipmentRoute(pickupAddress, transportType === "round-trip" ? returnAddress : null, center);
    if (!route) {
      showMessage("Không tìm được khoảng cách mô phỏng cho địa chỉ đã chọn.", "error");
      return false;
    }

    let totalFee = 0;
    for (const pet of shipmentPets) {
      const quote = calculateShipmentFee({
        distanceKm: route.distanceKm,
        petSize: pet.size,
        transportType,
      });
      if (!quote.valid) {
        showMessage(quote.message, "error");
        return false;
      }
      totalFee += quote.total;
    }

    return {
      id: getNextShipmentId(getShipmentStorage()),
      scheduleId,
      customerUsername: user.username,
      customerName: user.fullName || user.username,
      customerPhone: user.phone || "",
      petId: Number(shipmentPets[0].id),
      petName: shipmentPets.map((pet) => pet.name || `Thú cưng #${pet.id}`).join(", "),
      petIds: shipmentPets.map((pet) => Number(pet.id)),
      petNames: shipmentPets.map((pet) => pet.name || `Thú cưng #${pet.id}`),
      pickupAddressId: String(pickupAddress.id),
      returnAddressId: transportType === "round-trip" ? String(returnAddress.id) : "",
      centerCode: center.code,
      centerName: center.name,
      areaCode: getAddressAreaCode(pickupAddress.city, pickupAddress.district) || pickupAddress.areaCode,
      transportType,
      distanceKm: route.distanceKm,
      totalFee,
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

  /* Keeps a stored time visible even when it is outside the usual slots. */
  function ensureTimeOption(select, value) {
    const time = String(value || "").trim();
    if (!select || !time) return;
    if (Array.from(select.options).some((option) => option.value === time)) return;
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    select.appendChild(option);
  }

  function startEditSchedule(schedule) {
    editingScheduleId = schedule.id;
    editingScheduleSnapshot = schedule;
    const petIds = new Set(
      [...(Array.isArray(schedule.petIds) ? schedule.petIds : []), schedule.petId]
        .filter((value) => value !== "" && value !== null && value !== undefined)
        .map(String),
    );
    petSelect?.querySelectorAll('input[name="petIds"]').forEach((input) => {
      input.checked = petIds.has(input.value);
    });
    if (petIds.size) activePetId = String([...petIds][0]);
    setBookingPaymentMethod(schedule.payment?.method || defaultPaymentMethod);
    renderPetServiceChoices();

    const servicesByPet = new Map(
      (Array.isArray(schedule.petServices) ? schedule.petServices : []).map((item) => [
        String(item.petId),
        Array.isArray(item.services) ? item.services : [],
      ]),
    );
    petServicesContainer?.querySelectorAll(".user-pet-service-group").forEach((group) => {
      const wanted = servicesByPet.get(String(group.dataset.petId)) || [];
      group.querySelectorAll('input[name="careTypes"]').forEach((input) => {
        input.checked = wanted.includes(input.value);
      });
    });
    renderShipmentPetChoices();

    if (dateInput) dateInput.value = schedule.date || "";
    if (returnDateInput) returnDateInput.value = schedule.endDate || "";
    if (noteInput) noteInput.value = schedule.note || "";

    syncPetSittingFields();
    ensureTimeOption(timeInput, schedule.time);
    if (timeInput) timeInput.value = schedule.time || "";
    ensureTimeOption(returnTimeInput, schedule.endTime);
    if (returnTimeInput) returnTimeInput.value = schedule.endTime || "";
    applyScheduleLimits();
    updateScheduleTotal();

    if (editBannerText) {
      editBannerText.textContent = `Đang sửa lịch #${schedule.id} (${schedule.petName || "thú cưng"}). ` +
        "Đổi thời gian hoặc thêm thú cưng vào lần trông giữ này rồi bấm Cập nhật lịch.";
    }
    editBanner?.removeAttribute("hidden");
    if (submitButton) submitButton.textContent = `Cập nhật lịch #${schedule.id}`;
    form?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    dateInput?.focus?.();
  }

  function stopEditSchedule({ resetForm = false } = {}) {
    editingScheduleId = null;
    editingScheduleSnapshot = null;
    editBanner?.setAttribute("hidden", "");
    if (submitButton) submitButton.textContent = "Đăng ký lịch";
    if (resetForm) {
      if (typeof form?.reset === "function") form.reset();
      setBookingPaymentMethod(defaultPaymentMethod);
      renderPetServiceChoices();
      renderShipmentPetChoices();
      syncPetSittingFields();
      applyScheduleLimits();
      updateShipQuote();
    }
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
    if (previous && !Array.from(timeInput.options).some((option) => option.value === previous)) {
      const option = document.createElement("option");
      option.value = previous;
      option.textContent = previous;
      timeInput.appendChild(option);
    }
    if (previous) timeInput.value = previous;
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
    const minDate = editingScheduleSnapshot?.date || currentDate();
    if (dateInput) dateInput.min = minDate;
    if (returnDateInput) returnDateInput.min = dateInput?.value || minDate;
    applyTimeLimits();
  }

  function isPetSittingSelected() {
    const selectedPetIds = getSelectedPetIds();
    return Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
      .some((group) => selectedPetIds.has(group.dataset.petId) && getCheckedCareTypes(group)
        .includes(CARE_TYPE_PET_SITTING));
  }

  function getCheckedCareTypes(group) {
    return Array.from(group?.querySelectorAll('input[name="careTypes"]') || [])
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function getSelectedPetIds() {
    return new Set(Array.from(
      petSelect?.querySelectorAll('input[name="petIds"]') || [],
    )
      .filter((input) => input.checked)
      .map((input) => input.value));
  }

  function syncPetSittingFields() {
    const isPetSitting = isPetSittingSelected();
    if (returnDateGroup) returnDateGroup.hidden = !isPetSitting;
    if (returnTimeGroup) returnTimeGroup.hidden = !isPetSitting;
    // While editing a schedule the stay window of the booking must survive
    // a change of the selected pets.
    const keepStayWindow = Boolean(editingScheduleId);
    if (returnDateInput) {
      returnDateInput.required = isPetSitting;
      returnDateInput.min = dateInput?.value || currentDate();
      if (!isPetSitting && !keepStayWindow) returnDateInput.value = "";
    }
    if (returnTimeInput) {
      returnTimeInput.required = isPetSitting;
      if (!isPetSitting && !keepStayWindow) returnTimeInput.value = "";
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
    const petServices = [];

    selectedGroups.forEach((group) => {
      const services = getCheckedCareTypes(group);
      if (!services.length) return;
      hasSelectedService = true;
      total += getCareTypePrice(services);
      const petId = Number(group.dataset.petId);
      const cageType = getPetCageType(petId);
      petServices.push({ petId, services, cageType });
      if (services.includes(CARE_TYPE_PET_SITTING)) {
        const sittingPrice = getPetSittingPrice(
          dateInput?.value,
          timeInput?.value,
          returnDateInput?.value,
          returnTimeInput?.value,
          cageType,
        );
        if (sittingPrice) total += sittingPrice;
        else hasUnpricedPetSitting = true;
      }
    });

    scheduleTotal.hidden = !hasSelectedService;
    if (!hasSelectedService) return;
    const cageLabel = getCageLabel(petServices);
    if (hasUnpricedPetSitting) {
      scheduleTotal.textContent = total
        ? `Dịch vụ: ${formatCurrency(total)} · Chưa gồm phí trông giữ; chọn ngày giờ nhận và trả để tính đủ.${cageLabel}`
        : "Chọn ngày giờ nhận và trả để xem tổng tiền dịch vụ.";
      return;
    }
    if (shipToggle?.checked && !currentShippingFee) {
      scheduleTotal.textContent = `Dịch vụ: ${formatCurrency(total) || "0đ"} · Phí vận chuyển đang chờ báo giá.${cageLabel}`;
      return;
    }
    const shippingLabel = currentShippingFee ? ` · Vận chuyển: ${formatCurrency(currentShippingFee)}` : "";
    scheduleTotal.textContent = `Dịch vụ: ${formatCurrency(total) || "0đ"}${shippingLabel} · Tổng thanh toán: ${formatCurrency(total + currentShippingFee) || "0đ"}.${cageLabel}`;
  }

  /* Cage type of a pet, based on its size. */
  function getPetCageType(petId) {
    const pet = pets.find((item) => Number(item.id) === Number(petId));
    return getCageTypeForPetSize(pet?.size);
  }

  /* Shows how many of the centre's pet sitting cages are still free. */
  function getCageLabel(petServices) {
    const hasSitting = petServices.some((item) => item.services.includes(CARE_TYPE_PET_SITTING));
    if (!hasSitting) return "";
    const usage = getPetSittingCageUsage(
      loadSchedules(),
      {
        date: dateInput?.value || "",
        time: timeInput?.value || "",
        endDate: returnDateInput?.value || "",
        endTime: returnTimeInput?.value || "",
        petServices,
      },
      { excludeScheduleId: editingScheduleId, pets },
    );
    const detail = PET_SITTING_CAGE_TYPES
      .map((cage) => {
        const info = usage.byType[cage.code];
        return `${cage.label.replace("Chuồng ", "")} ${info.used}/${info.capacity}`;
      })
      .join(" · ");
    return ` · Chuồng trông giữ: ${detail} — còn ${usage.free}/${usage.capacity} chỗ trống.`;
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
      if (!pendingConfirmation) {
        isSubmitting = false;
        if (submitButton) submitButton.disabled = false;
      }
    }
  });

  confirmSubmitButton?.addEventListener("click", () => {
    const payload = pendingConfirmation;
    closeScheduleConfirm();
    pendingConfirmation = null;
    if (payload) commitSchedule(payload);
  });

  qrCloseButton?.addEventListener("click", () => {
    if (qrDialog?.open) qrDialog.close();
    else qrDialog?.removeAttribute("open");
  });
  qrDialog?.addEventListener("click", (event) => {
    if (event.target === qrDialog) {
      if (qrDialog.open) qrDialog.close();
      else qrDialog.removeAttribute("open");
    }
  });
  confirmCancelButton?.addEventListener("click", () => {
    closeScheduleConfirm();
    pendingConfirmation = null;
    setSubmittingState(false);
  });
  confirmDialog?.addEventListener("close", () => {
    pendingConfirmation = null;
    setSubmittingState(false);
  });
  confirmDialog?.addEventListener("click", (event) => {
    if (event.target !== confirmDialog) return;
    closeScheduleConfirm();
    pendingConfirmation = null;
    setSubmittingState(false);
  });

  function setSubmittingState(value) {
    isSubmitting = value;
    const button = form?.querySelector('button[type="submit"]');
    if (button) button.disabled = value;
  }

  function closeScheduleConfirm() {
    if (confirmDialog?.open && typeof confirmDialog.close === "function") confirmDialog.close();
  }

  /* Summary of the booking, shown before the schedule is sent to NEKO. */
  function buildScheduleSummary(schedule) {
    const rows = [];
    const petDetails = (Array.isArray(schedule.petServices) ? schedule.petServices : [])
      .map((item) => {
        const services = Array.isArray(item.services) ? item.services.join(", ") : "Chăm sóc";
        const cage = item.cageType ? ` · ${getPetSittingCageType(item.cageType).label}` : "";
        return `${item.petName || "Thú cưng"} (${services}${cage})`;
      });
    rows.push({ label: "Thú cưng", value: petDetails.join(", ") || schedule.petName || "—" });
    rows.push({
      label: "Thời gian",
      value: `${formatDate(schedule.date)} · ${schedule.time || ""}${schedule.endDate ? ` → ${formatDate(schedule.endDate)} ${schedule.endTime || ""}` : ""}`.trim(),
    });
    rows.push({ label: "Trung tâm", value: schedule.centerName || "—" });
    if (schedule.endDate) {
      const cageUsage = getPetSittingCageUsage(
        loadSchedules(),
        schedule,
        { excludeScheduleId: editingScheduleId, pets },
      );
      rows.push({
        label: "Chuồng trông giữ",
        value: PET_SITTING_CAGE_TYPES
          .map((cage) => `${cage.label.replace("Chuồng ", "")} ${cageUsage.byType[cage.code].used}/${cageUsage.byType[cage.code].capacity}`)
          .join(" · "),
      });
    }
    rows.push({ label: "Dịch vụ", value: formatCurrency(schedule.price) || "0đ" });
    if (currentShippingFee) {
      rows.push({ label: "Phí vận chuyển", value: formatCurrency(currentShippingFee) });
      rows.push({ label: "Tổng thanh toán", value: formatCurrency(schedule.price + currentShippingFee) });
    }
    return rows;
  }

  function requestScheduleConfirmation(payload) {
    const summary = buildScheduleSummary(payload.schedule);
    pendingConfirmation = payload;

    if (confirmList) {
      confirmList.replaceChildren();
      summary.forEach(({ label, value }) => {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        confirmList.append(term, description);
      });
    }
    if (confirmLead) {
      confirmLead.textContent = payload.editingSchedule
        ? `Kiểm tra lại thông tin trước khi cập nhật lịch #${payload.schedule.id}.`
        : "Kiểm tra lại thông tin lịch trước khi gửi tới NEKO.";
    }
    if (confirmSubmitButton) {
      confirmSubmitButton.textContent = payload.editingSchedule ? "Xác nhận cập nhật" : "Xác nhận đăng ký";
    }

    if (confirmDialog && typeof confirmDialog.showModal === "function") {
      confirmDialog.showModal();
      return;
    }

    // Fallback for browsers without the <dialog> element.
    const summaryText = summary.map(({ label, value }) => `${label}: ${value}`).join("\n");
    if (typeof window.confirm === "function" && !window.confirm(summaryText)) {
      pendingConfirmation = null;
      setSubmittingState(false);
      return;
    }
    pendingConfirmation = null;
    commitSchedule(payload);
  }

  function submitSchedule() {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const paymentMethod = String(formData.get("paymentMethod") || "");
    if (!["at-center", "bank-transfer"].includes(paymentMethod)) {
      showMessage("Phương thức thanh toán không hợp lệ. Vui lòng chọn lại.", "error");
      return;
    }

    const isPetSitting = isPetSittingSelected();
    const today = currentDate();
    const date = String(formData.get("date") || "").trim();
    const time = String(formData.get("time") || "").trim();
    const endDate = String(formData.get("endDate") || "").trim();
    const endTime = String(formData.get("endTime") || "").trim();
    const latestSchedules = loadSchedules();
    const editingSchedule = editingScheduleId
      ? latestSchedules.find((item) =>
        Number(item.id) === Number(editingScheduleId) &&
        (item.customerUsername || item.ownerUsername) === user.username &&
        !item.deletedAt,
      )
      : null;
    if (editingScheduleId && !editingSchedule) {
      stopEditSchedule({ resetForm: true });
      showMessage("Không tìm thấy lịch để sửa. Vui lòng tải lại trang.", "error");
      return;
    }
    if (editingSchedule && ![SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(resolveScheduleStatus(editingSchedule))) {
      stopEditSchedule({ resetForm: true });
      showMessage("Lịch này không thể sửa vì đã được xác nhận hoàn thành hoặc hủy.", "error");
      return;
    }
    if (editingSchedule?.shipping) {
      stopEditSchedule({ resetForm: true });
      showMessage("Lịch đã kèm vận chuyển nên không thể sửa. Vui lòng hủy lịch và đặt lại.", "error");
      return;
    }

    /* Lịch cũ đã bắt đầu từ trước (hoặc có giờ trả ngoài giờ làm việc) vẫn được sửa
       khi khung giờ được giữ nguyên; chỉ yêu cầu hợp lệ khi khách đổi khung giờ. */
    const keepStart = Boolean(editingSchedule) && date === editingSchedule.date && time === editingSchedule.time;
    const keepEnd = Boolean(editingSchedule) && endDate === editingSchedule.endDate && endTime === editingSchedule.endTime;

    if (date < today && !keepStart) {
      showMessage("Bạn không thể chọn ngày đã qua. Vui lòng chọn từ hôm nay trở đi.", "error");
      return;
    }

    const selectedCenter = SHIPMENT_CENTERS.find((item) => item.code === String(shipCenterSelect?.value || ""));
    if (!selectedCenter) {
      showMessage("Vui lòng chọn trung tâm chăm sóc.", "error");
      return;
    }
    if (!isValidDate(date)) {
      showMessage("Ngày đặt lịch không hợp lệ. Vui lòng chọn lại ngày.", "error");
      return;
    }
    if (!isValidTime(time)) {
      showMessage("Giờ đặt lịch không hợp lệ. Vui lòng chọn lại giờ.", "error");
      return;
    }
    const earliestTime = OPEN_TIME;
    const latestTime = CLOSE_TIME;
    if (time && (time < earliestTime || time > latestTime) && !keepStart) {
      showMessage(`Giờ nhận thú cưng phải trong giờ làm việc (${OPEN_TIME} đến ${CLOSE_TIME}).`, "error");
      return;
    }
    if (time && Number(time.split(":")[1]) % 5 !== 0) {
      showMessage("Giờ đặt lịch chỉ chọn các mốc 00, 05, 10... phút.", "error");
      return;
    }
    if (date === today && time && time < currentTime() && !keepStart) {
      showMessage("Thời gian nhận không được ở quá khứ.", "error");
      return;
    }

    if (isPetSitting && endDate < date) {
      showMessage("Ngày trả thú cưng phải từ ngày nhận trở đi.", "error");
      return;
    }
    if (isPetSitting && endDate === date && endTime <= time) {
      showMessage("Giờ trả thú cưng phải sau giờ nhận.", "error");
      return;
    }
    if (isPetSitting && endDate === today && endTime < currentTime() && !keepEnd) {
      showMessage("Giờ trả không được ở quá khứ.", "error");
      return;
    }
    if (isPetSitting && endTime && (endTime < OPEN_TIME || endTime > CLOSE_TIME) && !keepEnd) {
      showMessage(`Giờ trả thú cưng phải trong giờ làm việc (${OPEN_TIME} đến ${CLOSE_TIME}).`, "error");
      return;
    }
    if (isPetSitting && (!isValidDate(endDate) || !isValidTime(endTime))) {
      showMessage("Ngày hoặc giờ trả thú cưng không hợp lệ.", "error");
      return;
    }

    const selectedPetIds = getSelectedPetIds();
    const petServiceSelections = pets.filter((pet) => selectedPetIds.has(String(pet.id))).map((pet) => {
      const group = Array.from(petServicesContainer?.querySelectorAll(".user-pet-service-group") || [])
        .find((item) => item.dataset.petId === String(pet.id));
      const services = getCheckedCareTypes(group);
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
    const petServices = billedPetServices.map(({ pet, services }, index) => {
      const cageType = getCageTypeForPetSize(pet.size);
      const sittingPrice = services.includes(CARE_TYPE_PET_SITTING)
        ? getPetSittingPrice(formData.get("date"), time, endDate, endTime, cageType)
        : 0;
      return {
        petId: Number(pet.id),
        petName: petNames[index],
        services,
        cageType,
        petSittingPrice: sittingPrice,
        price: services.reduce((total, service) => total + getCareTypePrice(service), 0) + sittingPrice,
      };
    });
    const careType = petServices
      .map(({ petName, services, cageType }) => {
        const cages = services.includes(CARE_TYPE_PET_SITTING)
          ? ` (${getPetSittingCageType(cageType).label})`
          : "";
        return `${petName}: ${services.join(", ")}${cages}`;
      })
      .join(" | ");

    const schedule = {
      id: editingSchedule ? editingSchedule.id : getNextScheduleId(latestSchedules),
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
        ...(editingSchedule?.payment || {}),
        method: paymentMethod,
        status: editingSchedule?.payment?.status || "Chưa thanh toán",
        amount: editingSchedule?.payment?.amount || 0,
      },
      status: editingSchedule?.status || "Chờ xác nhận",
      source: editingSchedule?.source || "user",
      createdAt: editingSchedule?.createdAt || new Date().toISOString(),
    };

    const conflicts = findScheduleConflicts(
      editingSchedule
        ? latestSchedules.filter((item) => Number(item.id) !== Number(editingSchedule.id))
        : latestSchedules,
      schedule,
    );
    if (conflicts.length) {
      showMessage(describeScheduleConflicts(conflicts, schedule), "error");
      return;
    }

    const cageUsage = getPetSittingCageUsage(
      latestSchedules,
      schedule,
      { excludeScheduleId: editingSchedule?.id ?? null, pets },
    );
    const fullCages = PET_SITTING_CAGE_TYPES.filter(
      (cage) => cageUsage.byType[cage.code].used > cage.capacity,
    );
    if (fullCages.length) {
      const detail = fullCages
        .map((cage) => `${cage.label} (${cageUsage.byType[cage.code].used}/${cage.capacity})`)
        .join(", ");
      showMessage(
        `Trung tâm đã hết ${detail} trong khoảng trông giữ này. ` +
        "Vui lòng rút ngắn thời gian trông giữ hoặc chọn thời gian khác.",
        "error",
      );
      return;
    }
    if (cageUsage.used > cageUsage.capacity) {
      showMessage(
        `Trung tâm chỉ có ${cageUsage.capacity} chuồng trông giữ và đã có ${cageUsage.used} thú cưng trong khoảng này. ` +
        "Vui lòng rút ngắn thời gian trông giữ hoặc chọn thời gian khác.",
        "error",
      );
      return;
    }

    if (schedule.note.length > 500) {
      showMessage("Ghi chú không được vượt quá 500 ký tự.", "error");
      return;
    }

    requestScheduleConfirmation({ schedule, editingSchedule, latestSchedules });
  }

  function commitSchedule({ schedule, editingSchedule, latestSchedules }) {
    let shippingRecord = null;
    if (editingSchedule) {
      const methodChanged = editingSchedule.payment?.method !== schedule.payment.method;
      schedule.payment.amount = schedule.price;
      if (methodChanged) {
        schedule.payment.status = "Chưa thanh toán";
        delete schedule.payment.paidAt;
        delete schedule.payment.receivedBy;
      } else if (schedule.payment.status === "Đã thanh toán" &&
        Number(editingSchedule.payment?.amount) !== schedule.price) {
        schedule.payment.status = "Chưa thanh toán";
      }
    } else {
      shippingRecord = createShippingRecord(
        (Array.isArray(schedule.petIds) ? schedule.petIds : []).map((petId) => String(petId)),
        schedule.id,
      );
      if (shippingRecord === false) {
        setSubmittingState(false);
        return;
      }
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

      if (schedule.payment.method === "bank-transfer") {
        schedule.payment.status = "Chưa thanh toán";
      } else {
        schedule.payment.status = "Đã thanh toán";
      }
    }

    const nextSchedules = editingSchedule
      ? latestSchedules.map((item) =>
        Number(item.id) === Number(editingSchedule.id) ? schedule : item,
      )
      : [...latestSchedules, schedule];
    if (!saveSchedules(nextSchedules)) {
      showMessage("Không thể lưu lịch. Vui lòng thử lại.", "error");
      setSubmittingState(false);
      return;
    }

    const shipmentsBeforeBooking = getShipmentStorage();
    if (shippingRecord && !saveShipmentStorage([...shipmentsBeforeBooking, shippingRecord])) {
      saveSchedules(latestSchedules);
      showMessage("Không thể lưu đơn ship. Lịch chưa được tạo; vui lòng thử lại.", "error");
      setSubmittingState(false);
      return;
    }

    if (!editingSchedule && schedule.payment.method === "wallet") {
      saveSchedules(latestSchedules);
      if (shippingRecord) saveShipmentStorage(shipmentsBeforeBooking);
      showMessage("Phương thức thanh toán bằng ví không còn khả dụng.", "error");
      setSubmittingState(false);
      return;
    }

    schedules = nextSchedules;
    const wasEditing = Boolean(editingSchedule);
    defaultPaymentMethod = schedule.payment.method;
    stopEditSchedule({ resetForm: true });
    if (shipToggle) shipToggle.checked = false;
    if (shipPanel) shipPanel.hidden = true;
    populateShipControls();
    syncPetSittingFields();
    applyScheduleLimits();
    render();
    setSubmittingState(false);
    showMessage(
      wasEditing
        ? `Đã cập nhật lịch #${schedule.id}.`
        : "Đã gửi lịch chăm sóc tới NEKO. Chúng tôi sẽ liên hệ xác nhận sớm nhất.",
      "success",
    );

    if (!wasEditing && schedule.payment?.method === "bank-transfer" && qrDialog && qrContent) {
      qrContent.innerHTML = "";
      const tempSchedule = { ...schedule, payment: { ...schedule.payment, status: "Chưa thanh toán" } };
      const block = createQrPaymentBlock(tempSchedule, SCHEDULE_STATUS.PENDING);
      if (block) {
        qrContent.appendChild(block);
      }
      if (!qrDialog.open) {
        try {
          qrDialog.showModal();
        } catch (error) {
          qrDialog.setAttribute("open", "");
        }
      }
    }
  }

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  function describeScheduleConflicts(conflicts, candidate) {
    const isOverlap = (conflict) =>
      getScheduleConflictType(conflict, candidate) === SCHEDULE_CONFLICT_OVERLAP;
    const hasSitting = (conflict) => getSchedulePetSittingIds(conflict).size > 0;

    const details = conflicts.slice(0, 2).map((conflict) => {
      const petName = conflict.petName || "Thú cưng";
      const service = conflict.petServices?.length
        ? conflict.petServices.map((item) => item.services?.join(", ")).filter(Boolean).join(" / ")
        : conflict.careType || "";
      const slot = conflict.endDate && conflict.endTime
        ? `${formatDate(conflict.date)} ${conflict.time} → ${formatDate(conflict.endDate)} ${conflict.endTime}`
        : `${formatDate(conflict.date)} ${conflict.time || ""}`.trim();
      const label = [petName, service].filter(Boolean).join(" · ");
      return isOverlap(conflict)
        ? `lịch #${conflict.id} (${label}) đang chiếm ${slot}`
        : `lịch #${conflict.id} (${label}) ${slot}`;
    });

    const suffix = conflicts.length > 2 ? ` và ${conflicts.length - 2} lịch khác` : "";
    const ids = conflicts.map((conflict) => `#${conflict.id}`).join(", ");
    const head = `Thú cưng đã có lịch trùng thời gian: ${details.join(", ")}${suffix}. `;
    if (conflicts.some(isOverlap)) {
      const cageSummary = PET_SITTING_CAGE_TYPES
        .map((cage) => `${cage.capacity} ${cage.label.replace("Chuồng ", "")}`)
        .join(", ");
      const expandHint = conflicts.some(hasSitting)
        ? ` Nếu bạn muốn trông giữ thêm thú cưng trong khoảng này, hãy mở rộng lịch ${ids} ` +
          `(tối đa ${PET_SITTING_CAPACITY} chuồng trông giữ: ${cageSummary}) thay vì đặt lịch mới.`
        : "";
      return `${head}Vui lòng chọn thời gian ngoài khoảng đang có lịch, hoặc sửa/hủy lịch ${ids}.${expandHint}`;
    }
    return `${head}Hai lịch cần cách nhau tối thiểu ${SCHEDULE_BUFFER_MINUTES} phút. Vui lòng chọn giờ khác.`;
  }

  petForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!petForm.reportValidity()) return;

    const editId = document.getElementById("userPetEditId")?.value || "";
    const petName = String(petForm.elements.namedItem("name")?.value || "").trim();
    const size = Array.from(petForm.querySelectorAll('input[name="size"]'))
      .find((input) => input.checked)?.value || "";
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
    const petId = editId ? Number(editId) : getNextPetId();
    const pet = {
      ...(previousPet || {}),
      id: petId,
      petCode: previousPet?.petCode || getPetCode(petId),
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
      createdAt: previousPet ? previousPet.createdAt || "" : new Date().toISOString(),
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
        const remainingPets = loadPets().filter((item) =>
          !(String(item.ownerUsername) === String(user.username) && Number(item.id) === Number(pet.id)));
        if (!savePets(remainingPets)) {
          showPetMessage("Không thể xóa hồ sơ. Vui lòng thử lại.", "error");
          return;
        }
        pets = remainingPets.filter((item) => String(item.ownerUsername) === String(user.username));
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
      Array.from(petSelect.querySelectorAll('input[name="petIds"]'))
        .filter((input) => input.checked)
        .map((input) => input.value),
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
    renderShipmentPetChoices();
    updateShipQuote();
  }

  function renderPetServiceChoices() {
    if (!petServicesContainer) return;
    const selectedIds = new Set(
      Array.from(petSelect?.querySelectorAll('input[name="petIds"]') || [])
        .filter((input) => input.checked)
        .map((input) => input.value),
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

    const cage = getPetSittingCageType(getCageTypeForPetSize(pet.size));
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
        ? `${value.replace(/(thú)\s+(cưng)/i, "$1\u00A0$2")} (${cage.label}) - ${formatCurrency(PET_SITTING_HOURLY_RATE)}/giờ, ${formatCurrency(PET_SITTING_DAILY_RATE)}/ngày + ${formatCurrency(cage.fee)} phí chuồng`
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
          const cageLabel = item.cageType
            ? ` · ${getPetSittingCageType(item.cageType).label}`
            : "";
          more.appendChild(createScheduleRow(item.petName || "Thú cưng", `${serviceNames}${cageLabel} · ${servicePrice}`));
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

      const paymentMethodLabel = schedule.payment?.method === "bank-transfer"
        ? "Thanh toán bằng mã QR"
        : "Thanh toán tại trung tâm";
      more.append(
        createScheduleRow("Tổng thanh toán", price || "Theo yêu cầu"),
        createScheduleRow("Phương thức thanh toán", paymentMethodLabel),
        createScheduleRow("Trạng thái thanh toán", schedule.payment?.status || "Chưa thanh toán"),
        createScheduleRow("Trạng thái lịch", statusValue),
        createScheduleRow("Mã lịch", schedule.id || "-"),
        createScheduleRow("Trung tâm", schedule.shipCenter || schedule.shipping?.centerName || "-"),
        createScheduleRow("Ghi chú", schedule.note || "Không có"),
      );

      const qrPayment = schedule.payment?.method === "bank-transfer"
        ? createQrPaymentBlock(schedule, statusValue)
        : null;
      if (qrPayment) more.appendChild(qrPayment);

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
        cancelButton.addEventListener("click", () => {
        if (confirm("Bạn có chắc muốn hủy lịch này?")) {
          cancelUserSchedule(schedule.id);
        }
      });
        more.appendChild(cancelButton);
      }

      if ([SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.CONFIRMED].includes(statusValue) && !schedule.shipping) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "user-schedule-edit";
        editButton.textContent = "Sửa lịch";
        editButton.addEventListener("click", () => {
          startEditSchedule(schedule);
          showMessage(
            `Đang sửa lịch #${schedule.id}. Đổi thời gian hoặc thêm thú cưng (tối đa ${PET_SITTING_CAPACITY} chuồng) rồi bấm "Cập nhật lịch".`,
            "success",
          );
          toggle();
        });
        more.appendChild(editButton);
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

  function createQrPaymentBlock(schedule, statusValue) {
    if (statusValue === SCHEDULE_STATUS.CANCELLED) return null;

    const section = document.createElement("section");
    section.className = "user-schedule-qr";

    const heading = document.createElement("strong");
    heading.textContent = "Quét mã QR để thanh toán";
    section.appendChild(heading);

    if (schedule.payment?.status === "Đã thanh toán") {
      const paidNote = document.createElement("p");
      paidNote.className = "user-schedule-qr-note";
      paidNote.textContent = "Khoản thanh toán cho lịch này đã được xác nhận.";
      section.appendChild(paidNote);
    } else if (statusValue === SCHEDULE_STATUS.CANCELLED) {
      return null;
    }
    // Hiển thị mã QR ngay cả khi đang chờ xác nhận

    const info = getQrPaymentInfo(schedule);

    const image = document.createElement("img");
    image.className = "user-schedule-qr-image";
    image.src = buildQrPaymentUrl(schedule);
    image.alt = `Mã QR thanh toán cho lịch #${schedule.id ?? ""}`.trim();
    image.loading = "lazy";
    image.width = 220;
    image.height = 220;
    section.appendChild(image);

    const details = document.createElement("dl");
    details.className = "user-schedule-qr-info";
    [
      ["Ngân hàng", info.bankId],
      ["Số tài khoản", info.accountNumber],
      ["Chủ tài khoản", info.accountName],
      ["Số tiền", formatCurrency(info.amount) || "Theo yêu cầu"],
      ["Nội dung", info.transferContent],
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      row.append(term, description);
      details.appendChild(row);
    });
    section.appendChild(details);

    const note = document.createElement("p");
    note.className = "user-schedule-qr-note";
    note.textContent = "Mở ứng dụng ngân hàng và quét mã để chuyển khoản đúng số tiền. NEKO sẽ xác nhận sau khi nhận được tiền.";
    section.appendChild(note);

    return section;
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
