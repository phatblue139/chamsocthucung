import {
    CARE_TYPES,
    CARE_TYPE_PET_SITTING,
    CARE_TYPE_OTHER,
    SCHEDULE_STORAGE_KEY,
    SCHEDULE_STATUS,
    formatCurrency,
    getCareTypePrice,
    getPetSittingPrice,
    getNextScheduleId,
    getScheduleStatusClass,
    mergeScheduleUpdate,
    getTimeOptions,
    isKnownCareType,
    loadSchedules,
    OPEN_TIME,
    CLOSE_TIME,
    PET_SITTING_DAILY_RATE,
    PET_SITTING_HOURLY_RATE,
    resolveScheduleStatus,
    saveSchedules,
} from "./careScheduleData.js";
import { isAdminLoggedIn, logout } from "./auth.js";

if (!isAdminLoggedIn()) {
    location.replace("/");
    throw new Error("Không có quyền truy cập trang này");
}

const logoutBtn = document.getElementById("logoutBtn");
const form = document.getElementById("careForm");
const careList = document.getElementById("careList");
const emptyMsg = document.getElementById("emptyMsg");
const searchInput = document.getElementById("searchInput");
const deletedToggle = document.getElementById("deletedToggle");
const careCount = document.getElementById("careCount");
const formMessage = document.getElementById("careFormMessage");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const idInput = document.getElementById("id");
const petNameInput = document.getElementById("petName");
const careTypeInput = document.getElementById("careType");
const careTypeOtherInput = document.getElementById("careTypeOther");
const careTypeOtherGroup = document.getElementById("careTypeOtherGroup");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const endDateInput = document.getElementById("endDate");
const endTimeInput = document.getElementById("endTime");
const endDateGroup = document.getElementById("petSittingEndDateGroup");
const endTimeGroup = document.getElementById("petSittingEndTimeGroup");
const statusInput = document.getElementById("status");
const noteInput = document.getElementById("note");
const careStats = document.getElementById("careStats");
let schedules = loadSchedules();
let searchKeyword = "";
let statusFilter = "";
let showDeleted = false;
const STATUS_PENDING = SCHEDULE_STATUS.PENDING;
const STATUS_CONFIRMED = SCHEDULE_STATUS.CONFIRMED;
const STATUS_COMPLETED = SCHEDULE_STATUS.COMPLETED;
const STATUS_CANCELLED = SCHEDULE_STATUS.CANCELLED;

logoutBtn?.addEventListener("click", () => {
    logout();
    location.replace("/");
});

form?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!dateInput?.value.trim()) {
        showMessage("Ngày chăm sóc không được để trống.", "error");
        dateInput?.focus();
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    if (careTypeInput.value === CARE_TYPE_PET_SITTING && (
        endDateInput.value < dateInput.value ||
        (endDateInput.value === dateInput.value && endTimeInput.value <= timeInput.value)
    )) {
        showMessage("Ngày/giờ trả thú cưng phải sau thời điểm nhận.", "error");
        endDateInput.focus();
        return;
    }

    const id = editingId();
    const saved = id ? updateSchedule(id) : addSchedule();
    if (!saved) return;

    resetForm();
    render();
});

careList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    if (button.dataset.action === "edit") {
        editSchedule(id);
    } else if (button.dataset.action === "confirm") {
        confirmSchedule(id);
    } else if (button.dataset.action === "complete") {
        toggleCompleted(id);
    } else if (button.dataset.action === "delete") {
        deleteSchedule(id);
    } else if (button.dataset.action === "restore") {
        restoreSchedule(id);
    }
});

searchInput?.addEventListener("input", () => {
    searchKeyword = searchInput.value;
    render();
});

deletedToggle?.addEventListener("click", () => {
    showDeleted = !showDeleted;
    statusFilter = "";
    render();
});

careStats?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    statusFilter = button.dataset.status || "";
    render();
});

cancelBtn?.addEventListener("click", () => {
    resetForm();
    showMessage("", "");
});

careTypeInput?.addEventListener("change", syncCareTypeOther);
populateCareTypeOptions();
populateEndTimeOptions();
syncCareTypeOther();
window.addEventListener("storage", (event) => {
    if (event.key !== SCHEDULE_STORAGE_KEY) return;
    schedules = loadSchedules();
    render();
});

render();

function getScheduleStatus(schedule) {
    return resolveScheduleStatus(schedule);
}

function getStatusClass(status) {
    return getScheduleStatusClass(status);
}

function getFiltered() {
    const keyword = searchKeyword.trim().toLowerCase();

    return schedules.filter((schedule) => {
        if (Boolean(schedule.deletedAt) !== showDeleted) return false;
        if (statusFilter && getStatusClass(getScheduleStatus(schedule)) !== statusFilter) {
            return false;
        }

        if (!keyword) return true;

        const values = [
            schedule.petName,
            schedule.customerName,
            schedule.customerUsername,
            schedule.customerPhone,
            schedule.careType,
            getScheduleStatus(schedule),
        ];
        return values.some((value) => String(value || "").toLowerCase().includes(keyword));
    });
}

function getCounts() {
    const counts = { all: schedules.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    const activeSchedules = schedules.filter((schedule) => !schedule.deletedAt);
    counts.all = activeSchedules.length;
    activeSchedules.forEach((schedule) => {
        counts[getStatusClass(getScheduleStatus(schedule))] += 1;
    });
    return counts;
}

function renderStats() {
    if (!careStats) return;

    const counts = getCounts();
    careStats.querySelectorAll("[data-stat]").forEach((node) => {
        const key = node.dataset.stat;
        node.textContent = String(counts[key] ?? 0);
    });
    careStats.querySelectorAll("button[data-status]").forEach((button) => {
        const isActive = (button.dataset.status || "") === statusFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
        button.hidden = showDeleted;
    });
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined ? "" : String(value);
    return cell;
}

function formatSchedulePets(schedule) {
    if (Array.isArray(schedule.petServices) && schedule.petServices.length) {
        return schedule.petServices.map((item) =>
            `${item.petName || "Thú cưng"}${item.petId ? ` (#${item.petId})` : ""}`,
        ).join(", ");
    }
    const petIds = Array.isArray(schedule.petIds) && schedule.petIds.length
        ? schedule.petIds
        : schedule.petId ? [schedule.petId] : [];
    if (!petIds.length) return schedule.petName || "";
    const petNames = Array.isArray(schedule.petNames) ? schedule.petNames : [];
    return petIds.map((id, index) => `${petNames[index] || schedule.petName || "Thú cưng"} (#${id})`).join(", ");
}

function createCareTypeCell(schedule) {
    const cell = document.createElement("td");
    cell.className = "care-type-cell";

    if (!Array.isArray(schedule.petServices) || !schedule.petServices.length) {
        cell.textContent = schedule.careType || "";
    } else {
        schedule.petServices.forEach((item) => {
            const entry = document.createElement("div");
            entry.className = "care-type-entry";
            const petName = document.createElement("strong");
            petName.textContent = item.petName || "Thú cưng";
            const services = document.createElement("span");
            services.textContent = Array.isArray(item.services) ? item.services.join(", ") : "Chăm sóc";
            entry.append(petName, document.createTextNode(": "), services);
            cell.appendChild(entry);
        });
    }

    if (schedule.shipping) {
        const shipping = document.createElement("div");
        shipping.className = "care-type-entry";
        shipping.textContent = `Phí ship (${schedule.shipping.transportType === "round-trip" ? "hai chiều" : "một chiều"}): ${formatCurrency(schedule.shipping.totalFee) || "Theo yêu cầu"}`;
        cell.appendChild(shipping);
    }

    return cell;
}

function render() {
    if (!careList || !emptyMsg || !careCount) return;

    careList.replaceChildren();
    const rows = getFiltered();
    const deletedCount = schedules.filter((schedule) => schedule.deletedAt).length;
    const activeCount = schedules.length - deletedCount;
    careCount.textContent = showDeleted
        ? `${deletedCount} lịch đã xóa · ${rows.length} đang hiển thị`
        : `${activeCount} lịch · ${rows.length} đang hiển thị`;
    if (deletedToggle) {
        deletedToggle.textContent = showDeleted
            ? "← Quay lại lịch"
            : `Đã xóa (${deletedCount})`;
        deletedToggle.setAttribute("aria-pressed", String(showDeleted));
    }
    renderStats();

    rows.forEach((schedule) => {
        const row = document.createElement("tr");
        const customer = [
            schedule.customerName || (schedule.source === "admin" ? "Admin" : ""),
            schedule.customerUsername ? `@${schedule.customerUsername}` : "",
            schedule.customerId ? `ID ${schedule.customerId}` : "",
        ].filter(Boolean).join(" · ") || "—";
        const phone = schedule.customerPhone || "—";
        const status = getScheduleStatus(schedule);
        const isDeleted = Boolean(schedule.deletedAt);
        const isCompleted = status === STATUS_COMPLETED;
        const isPending = status === STATUS_PENDING;
        const priceText = formatCurrency(schedule.price) || (schedule.careType ? "Theo yêu cầu" : "");

        row.classList.toggle("care-row-completed", isCompleted);
        row.append(
            createCell(schedule.id),
            createCell(customer),
            createCell(phone),
            createCell(formatSchedulePets(schedule)),
            createCareTypeCell(schedule),
            createCell(priceText),
            createCell(schedule.endDate ? `${schedule.date} → ${schedule.endDate}` : schedule.date),
            createCell(schedule.endDate ? `${schedule.time} → ${schedule.endTime || ""}` : schedule.time),
            createCell(schedule.note),
            createStatusCell(status),
        );

        const actionCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "care-actions";
        if (isDeleted) {
            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.className = "care-btn-restore";
            restoreButton.dataset.action = "restore";
            restoreButton.dataset.id = String(schedule.id);
            restoreButton.textContent = "Khôi phục";
            actionGroup.appendChild(restoreButton);
        } else {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "care-btn-edit";
            editButton.dataset.action = "edit";
            editButton.dataset.id = String(schedule.id);
            editButton.textContent = "Sửa";

            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = "care-btn-confirm";
            confirmButton.dataset.action = "confirm";
            confirmButton.dataset.id = String(schedule.id);
            confirmButton.textContent = "✔ Xác nhận";
            confirmButton.title = "Xác nhận đơn để người dùng biết đã được tiếp nhận";
            confirmButton.hidden = !isPending;

            const completeButton = document.createElement("button");
            completeButton.type = "button";
            completeButton.className = isCompleted ? "care-btn-undo" : "care-btn-complete";
            completeButton.dataset.action = "complete";
            completeButton.dataset.id = String(schedule.id);
            completeButton.textContent = isCompleted ? "↩ Hoàn tác" : "✔ Hoàn thành";
            completeButton.title = isCompleted
                ? "Bỏ đánh dấu hoàn thành"
                : "Đánh dấu lịch đã hoàn thành";
            completeButton.hidden = isPending || status === STATUS_CANCELLED;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "care-btn-delete";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = String(schedule.id);
            deleteButton.textContent = "Xóa";

            actionGroup.append(editButton, confirmButton, completeButton, deleteButton);
        }
        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);
        careList.appendChild(row);
    });

    emptyMsg.textContent = showDeleted ? "Thùng rác chưa có lịch nào." : "Không có lịch chăm sóc nào.";
    emptyMsg.hidden = rows.length > 0;
}

function createStatusCell(status) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `care-status-badge ${getStatusClass(status)}`;
    badge.textContent = status;
    cell.appendChild(badge);
    return cell;
}

function getFormData() {
    const careType = resolveCareType();
    const isPetSitting = careType === CARE_TYPE_PET_SITTING;
    return {
        petName: petNameInput.value.trim(),
        careType,
        price: isPetSitting
            ? getPetSittingPrice(dateInput.value, timeInput.value, endDateInput.value, endTimeInput.value)
            : getCareTypePrice(careType),
        date: dateInput.value,
        time: timeInput.value,
        ...(isPetSitting ? { endDate: endDateInput.value, endTime: endTimeInput.value } : {}),
        note: noteInput.value.trim(),
        status: statusInput.value,
    };
}

function syncCareTypeOther() {
    const isOther = careTypeInput?.value === CARE_TYPE_OTHER;
    const isPetSitting = careTypeInput?.value === CARE_TYPE_PET_SITTING;
    if (careTypeOtherGroup) careTypeOtherGroup.hidden = !isOther;
    if (careTypeOtherInput) {
        careTypeOtherInput.required = isOther;
        careTypeOtherInput.value = isOther ? careTypeOtherInput.value : "";
    }
    if (endDateGroup) endDateGroup.hidden = !isPetSitting;
    if (endTimeGroup) endTimeGroup.hidden = !isPetSitting;
    if (endDateInput) endDateInput.required = isPetSitting;
    if (endTimeInput) endTimeInput.required = isPetSitting;
    if (!isPetSitting) {
        if (endDateInput) endDateInput.value = "";
        if (endTimeInput) endTimeInput.value = "";
    }
    populateTimeOptions();
}

function populateCareTypeOptions() {
    if (!careTypeInput) return;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn loại chăm sóc --";
    const options = CARE_TYPES.map((service) => {
        const option = document.createElement("option");
        option.value = service.value;
        option.textContent = `${service.value} - ${formatCurrency(service.price)}`;
        return option;
    });
    const petSittingOption = document.createElement("option");
    petSittingOption.value = CARE_TYPE_PET_SITTING;
    petSittingOption.textContent = `${CARE_TYPE_PET_SITTING} - ${formatCurrency(PET_SITTING_HOURLY_RATE)}/giờ, ${formatCurrency(PET_SITTING_DAILY_RATE)}/ngày`;
    const otherOption = document.createElement("option");
    otherOption.value = CARE_TYPE_OTHER;
    otherOption.textContent = `${CARE_TYPE_OTHER} - theo yêu cầu`;
    careTypeInput.replaceChildren(placeholder, ...options, petSittingOption, otherOption);
}

function resolveCareType() {
    const selected = String(careTypeInput?.value || "").trim();
    if (selected === CARE_TYPE_OTHER) {
        return String(careTypeOtherInput?.value || "").trim() || CARE_TYPE_OTHER;
    }
    return selected;
}

function setCareType(value) {
    const careType = String(value || "").trim();
    const isCustom = careType && !isKnownCareType(careType);
    careTypeInput.value = isCustom ? CARE_TYPE_OTHER : careType;
    if (careTypeOtherInput) careTypeOtherInput.value = isCustom ? careType : "";
    syncCareTypeOther();
}

function populateTimeOptions({ open = OPEN_TIME, close = CLOSE_TIME } = {}) {
    if (!timeInput) return;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ --";
    const options = getTimeOptions({ open, close }).map((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        return option;
    });
    timeInput.replaceChildren(placeholder, ...options);
}

function populateEndTimeOptions() {
    if (!endTimeInput) return;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn giờ trả --";
    const options = getTimeOptions().map((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        return option;
    });
    endTimeInput.replaceChildren(placeholder, ...options);
}

function setTime(value) {
    const time = String(value || "").trim();
    if (time && timeInput && !Array.from(timeInput.options).some((option) => option.value === time)) {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = time;
        timeInput.appendChild(option);
    }
    timeInput.value = time;
}

function setEndTime(value) {
    const time = String(value || "").trim();
    if (time && endTimeInput && !Array.from(endTimeInput.options).some((option) => option.value === time)) {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = time;
        endTimeInput.appendChild(option);
    }
    if (endTimeInput) endTimeInput.value = time;
}

function addSchedule() {
    const latestSchedules = loadSchedules();
    const now = new Date().toISOString();
    const schedule = {
        id: getNextScheduleId(latestSchedules),
        ...getFormData(),
        source: "admin",
        createdAt: now,
        updatedAt: now,
    };
    const nextSchedules = [...latestSchedules, schedule];

    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể lưu lịch. Vui lòng thử lại.", "error");
        return false;
    }

    schedules = nextSchedules;
    showMessage("Đã lưu lịch chăm sóc.", "success");
    return true;
}

function updateSchedule(id) {
    const latestSchedules = loadSchedules();
    const index = latestSchedules.findIndex((schedule) => Number(schedule.id) === id);
    if (index < 0) {
        schedules = latestSchedules;
        resetForm();
        showMessage(`Lịch #${id} không còn tồn tại. Vui lòng chọn lại lịch cần sửa.`, "error");
        render();
        return false;
    }

    const nextSchedules = [...latestSchedules];
    nextSchedules[index] = {
        ...mergeScheduleUpdate(nextSchedules[index], getFormData()),
        updatedAt: new Date().toISOString(),
    };

    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể cập nhật lịch. Vui lòng thử lại.", "error");
        return false;
    }

    schedules = nextSchedules;
    showMessage("Đã cập nhật lịch chăm sóc.", "success");
    return true;
}

function editSchedule(id) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    if (!schedule) return;

    idInput.value = schedule.id;
    petNameInput.value = schedule.petName || "";
    const hasDetailedServices = Array.isArray(schedule.petServices) && schedule.petServices.length > 0;
    petNameInput.disabled = hasDetailedServices;
    careTypeInput.disabled = hasDetailedServices;
    if (careTypeOtherInput) careTypeOtherInput.disabled = hasDetailedServices;
    setCareType(schedule.careType);
    dateInput.value = schedule.date || "";
    setTime(schedule.time);
    if (endDateInput) endDateInput.value = schedule.endDate || "";
    setEndTime(schedule.endTime || "");
    statusInput.value = getScheduleStatus(schedule);
    noteInput.value = schedule.note || "";
    saveBtn.textContent = "Cập nhật lịch";
    showMessage(hasDetailedServices
        ? "Lịch có nhiều dịch vụ do khách chọn; dịch vụ và giá được giữ nguyên khi cập nhật."
        : "Đang chỉnh sửa lịch đã chọn.", "");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(id, nextStatus, extra = {}) {
    const latestSchedules = loadSchedules();
    if (!latestSchedules.some((item) => Number(item.id) === id)) {
        schedules = latestSchedules;
        render();
        showMessage(`Lịch #${id} không còn tồn tại. Danh sách đã được cập nhật.`, "error");
        return false;
    }
    const nextSchedules = latestSchedules.map((item) => Number(item.id) === id
        ? { ...item, status: nextStatus, ...extra, updatedAt: new Date().toISOString() }
        : item);

    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể cập nhật trạng thái lịch. Vui lòng thử lại.", "error");
        return false;
    }

    schedules = nextSchedules;
    if (idInput && Number(idInput.value) === id) statusInput.value = nextStatus;
    return true;
}

function confirmSchedule(id) {
    const latestSchedules = loadSchedules();
    const schedule = latestSchedules.find((item) => Number(item.id) === id);
    if (!schedule) return;
    schedules = latestSchedules;

    const status = getScheduleStatus(schedule);
    if (status !== STATUS_PENDING) {
        showMessage("Chỉ xác nhận được đơn đang chờ xác nhận.", "error");
        return;
    }

    if (!setStatus(id, STATUS_CONFIRMED, { confirmedAt: new Date().toISOString() })) return;

    showMessage(`Đã xác nhận lịch #${id}. Người dùng sẽ thấy trạng thái mới.`, "success");
    render();
}

function toggleCompleted(id) {
    const latestSchedules = loadSchedules();
    const schedule = latestSchedules.find((item) => Number(item.id) === id);
    if (!schedule) return;
    schedules = latestSchedules;

    const status = getScheduleStatus(schedule);
    const isCompleted = status === STATUS_COMPLETED;
    if (!isCompleted && status === STATUS_CANCELLED) {
        showMessage("Lịch đã hủy không thể đánh dấu hoàn thành.", "error");
        return;
    }

    const saved = setStatus(id, isCompleted ? STATUS_CONFIRMED : STATUS_COMPLETED, {
        completedAt: isCompleted ? "" : new Date().toISOString(),
    });
    if (!saved) return;

    showMessage(
        isCompleted ? `Đã bỏ đánh dấu hoàn thành lịch #${id}.` : `Đã đánh dấu lịch #${id} hoàn thành.`,
        "success",
    );
    render();
}

function deleteSchedule(id) {
    if (!confirm("Chuyển lịch chăm sóc này vào danh sách đã xóa? Bạn có thể khôi phục sau.")) return;

    const latestSchedules = loadSchedules();
    if (!latestSchedules.some((schedule) => Number(schedule.id) === id)) {
        schedules = latestSchedules;
        render();
        showMessage(`Lịch #${id} không còn tồn tại. Danh sách đã được cập nhật.`, "error");
        return;
    }
    const deletedAt = new Date().toISOString();
    const nextSchedules = latestSchedules.map((schedule) => Number(schedule.id) === id
        ? { ...schedule, deletedAt, updatedAt: deletedAt }
        : schedule);
    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể xóa lịch. Vui lòng thử lại.", "error");
        return;
    }

    schedules = nextSchedules;
    if (editingId() === id) resetForm();
    showMessage("Đã chuyển lịch vào danh sách đã xóa.", "success");
    render();
}

function restoreSchedule(id) {
    const latestSchedules = loadSchedules();
    if (!latestSchedules.some((schedule) => Number(schedule.id) === id)) {
        schedules = latestSchedules;
        render();
        showMessage(`Lịch #${id} không còn tồn tại. Danh sách đã được cập nhật.`, "error");
        return;
    }
    const restoredAt = new Date().toISOString();
    const nextSchedules = latestSchedules.map((schedule) => Number(schedule.id) === id
        ? { ...schedule, deletedAt: "", updatedAt: restoredAt }
        : schedule);

    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể khôi phục lịch. Vui lòng thử lại.", "error");
        return;
    }

    schedules = nextSchedules;
    showMessage(`Đã khôi phục lịch #${id}.`, "success");
    render();
}

function resetForm() {
    form?.reset();
    idInput.value = "";
    if (petNameInput) petNameInput.disabled = false;
    if (careTypeInput) careTypeInput.disabled = false;
    if (careTypeOtherInput) careTypeOtherInput.disabled = false;
    if (saveBtn) saveBtn.textContent = "Lưu lịch";
    syncCareTypeOther();
}

function editingId() {
    return idInput.value ? Number(idInput.value) : null;
}

function showMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = `user-form-message ${type}`;
}
