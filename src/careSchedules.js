import {
    CARE_TYPES,
    CARE_TYPE_OTHER,
    SCHEDULE_STORAGE_KEY,
    SCHEDULE_STATUS,
    formatCurrency,
    getCareTypePrice,
    getNextScheduleId,
    getScheduleStatusClass,
    mergeScheduleUpdate,
    getTimeOptions,
    isKnownCareType,
    loadSchedules,
    resolveScheduleStatus,
    saveSchedules,
} from "./careScheduleData.js";
import { isAdminLoggedIn, logout } from "./auth.js";
import {
    ADDRESS_STORAGE_KEY,
    SHIPMENT_STATUS,
    SHIPMENT_STORAGE_KEY,
    getAddressStorage,
    getShipmentNextStatuses,
    getShipmentStorage,
    saveShipmentStorage,
    updateShipmentStatus,
} from "./shippingData.js";

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
const statusInput = document.getElementById("status");
const noteInput = document.getElementById("note");
const careStats = document.getElementById("careStats");
const shipmentList = document.getElementById("shipmentList");
const shipmentEmpty = document.getElementById("shipmentEmpty");
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
        completeSchedule(id);
    } else if (button.dataset.action === "cancel") {
        cancelSchedule(id);
    } else if (button.dataset.action === "delete") {
        deleteSchedule(id);
    } else if (button.dataset.action === "restore") {
        restoreSchedule(id);
    } else if (button.dataset.action === "shipment-status") {
        setAdminShipmentStatus(button.dataset.shipmentId, button.dataset.status);
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
syncCareTypeOther();
populateCareTypes();
populateTimeOptions();
window.addEventListener("storage", (event) => {
    if (event.key === SCHEDULE_STORAGE_KEY) {
        schedules = loadSchedules();
        render();
    }
    if (event.key === SHIPMENT_STORAGE_KEY || event.key === ADDRESS_STORAGE_KEY) renderShipments();
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

function createCareTypeCell(schedule) {
    const cell = document.createElement("td");
    cell.className = "care-type-cell";

    if (!Array.isArray(schedule.petServices) || !schedule.petServices.length) {
        cell.textContent = schedule.careType || "";
        return cell;
    }

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
        const customer = schedule.customerName || schedule.customerUsername || "Dữ liệu mẫu";
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
            createCell(schedule.petName),
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
            editButton.hidden = isCompleted || status === STATUS_CANCELLED;

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
            completeButton.textContent = "✔ Hoàn thành";
            completeButton.title = "Đánh dấu lịch đã hoàn thành";
            completeButton.hidden = status !== STATUS_CONFIRMED;

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "care-btn-delete";
            cancelButton.dataset.action = "cancel";
            cancelButton.dataset.id = String(schedule.id);
            cancelButton.textContent = "Hủy lịch";
            cancelButton.hidden = ![STATUS_PENDING, STATUS_CONFIRMED].includes(status);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "care-btn-delete";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = String(schedule.id);
            deleteButton.textContent = "Xóa";

            actionGroup.append(editButton, confirmButton, completeButton, cancelButton, deleteButton);
        }
        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);
        careList.appendChild(row);
    });

    emptyMsg.textContent = showDeleted ? "Thùng rác chưa có lịch nào." : "Không có lịch chăm sóc nào.";
    emptyMsg.hidden = rows.length > 0;
    renderShipments();
}

function renderShipments() {
    if (!shipmentList || !shipmentEmpty) return;
    const shipments = getShipmentStorage();
    const addresses = getAddressStorage();
    shipmentList.replaceChildren();

    shipments.forEach((shipment) => {
        const row = document.createElement("tr");
        const customer = `${shipment.customerName || shipment.customerUsername || "Khách hàng"}${shipment.customerPhone ? ` · ${shipment.customerPhone}` : ""}`;
        const linkedSchedule = schedules.find((schedule) =>
            String(schedule.id) === String(shipment.scheduleId) ||
            String(schedule.shipping?.id) === String(shipment.id),
        );
        const pickup = addresses.find((address) =>
            String(address.id) === String(shipment.pickupAddressId) &&
            String(address.ownerUsername) === String(shipment.customerUsername),
        );
        const returnAddress = addresses.find((address) =>
            String(address.id) === String(shipment.returnAddressId) &&
            String(address.ownerUsername) === String(shipment.customerUsername),
        );
        const routeParts = [
            pickup ? [pickup.houseNumber, pickup.district, pickup.city].filter(Boolean).join(", ") : "Không tìm thấy địa chỉ đón",
            shipment.centerName || "Trung tâm",
        ];
        if (shipment.transportType === "round-trip") {
            routeParts.push(returnAddress
                ? [returnAddress.houseNumber, returnAddress.district, returnAddress.city].filter(Boolean).join(", ")
                : "Không tìm thấy địa chỉ trả");
        }
        const route = routeParts.join(" → ");
        const petLabel = Array.isArray(shipment.petNames) && shipment.petNames.length
            ? shipment.petNames.join(", ")
            : shipment.petName || "Thú cưng";
        const fields = [
            `#${shipment.id} · lịch #${shipment.scheduleId || linkedSchedule?.id || "—"}`,
            customer,
            petLabel,
            route,
            `${shipment.distanceKm ?? "—"} km (mô phỏng) · ${formatCurrency(shipment.totalFee) || "—"}`,
        ];
        fields.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "care-status-badge";
        badge.textContent = shipment.status || SHIPMENT_STATUS.PENDING;
        statusCell.appendChild(badge);
        (shipment.statusHistory || []).forEach((entry) => {
            const history = document.createElement("small");
            history.className = "shipment-history-entry";
            history.textContent = `${entry.status} · ${formatDateTime(entry.changedAt)}`;
            statusCell.appendChild(history);
        });
        row.appendChild(statusCell);

        const actions = document.createElement("td");
        getShipmentNextStatuses(shipment.status || SHIPMENT_STATUS.PENDING).forEach((status) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = status === SHIPMENT_STATUS.CANCELLED ? "care-btn-delete" : "care-btn-confirm";
            button.dataset.action = "shipment-status";
            button.dataset.shipmentId = String(shipment.id);
            button.dataset.status = status;
            button.textContent = status;
            actions.appendChild(button);
        });
        if (!actions.childElementCount) actions.textContent = "Không còn bước tiếp theo";
        row.appendChild(actions);
        shipmentList.appendChild(row);
    });

    shipmentEmpty.hidden = shipments.length > 0;
}

function setAdminShipmentStatus(shipmentId, nextStatus) {
    const shipments = getShipmentStorage();
    const shipment = shipments.find((item) => String(item.id) === String(shipmentId));
    if (!shipment) {
        showMessage("Không tìm thấy đơn vận chuyển. Hãy tải lại danh sách.", "error");
        return;
    }
    const updated = updateShipmentStatus(shipment, nextStatus, "admin");
    if (!updated) {
        showMessage("Chuyển trạng thái vận chuyển không hợp lệ. Hãy tải lại danh sách.", "error");
        return;
    }
    const nextShipments = shipments.map((item) =>
        String(item.id) === String(shipmentId) ? updated : item,
    );
    if (!saveShipmentStorage(nextShipments)) {
        showMessage("Không thể lưu trạng thái vận chuyển. Vui lòng thử lại.", "error");
        return;
    }
    if (nextStatus === SHIPMENT_STATUS.CANCELLED) {
        const linkedSchedule = schedules.find((item) =>
            String(item.id) === String(shipment.scheduleId) ||
            String(item.shipping?.id) === String(shipment.id),
        );
        if (linkedSchedule && [STATUS_PENDING, STATUS_CONFIRMED].includes(getScheduleStatus(linkedSchedule))) {
            const nextSchedules = schedules.map((item) =>
                item === linkedSchedule
                    ? { ...item, status: STATUS_CANCELLED, cancelledAt: new Date().toISOString() }
                    : item,
            );
            if (!saveSchedules(nextSchedules)) {
                saveShipmentStorage(shipments);
                showMessage("Không thể đồng bộ trạng thái lịch. Đơn vận chuyển đã được khôi phục.", "error");
                return;
            }
            schedules = nextSchedules;
        }
    }
    showMessage(`Đã cập nhật vận chuyển #${shipmentId}: ${nextStatus}.`, "success");
    render();
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
    return {
        petName: petNameInput.value.trim(),
        careType,
        price: getCareTypePrice(careType),
        date: dateInput.value,
        time: timeInput.value,
        note: noteInput.value.trim(),
    };
}

function populateCareTypes() {
    if (!careTypeInput) return;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn loại chăm sóc --";
    const options = CARE_TYPES.map(({ value, price }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = `${value} - ${formatCurrency(price)}`;
        return option;
    });
    const other = document.createElement("option");
    other.value = CARE_TYPE_OTHER;
    other.textContent = "Khác - theo yêu cầu";
    careTypeInput.replaceChildren(placeholder, ...options, other);
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

function addSchedule() {
    const schedule = {
        id: getNextScheduleId(schedules),
        ...getFormData(),
        status: SCHEDULE_STATUS.PENDING,
        source: "admin",
        createdAt: new Date().toISOString(),
    };
    const nextSchedules = [...schedules, schedule];

    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể lưu lịch. Vui lòng thử lại.", "error");
        return false;
    }

    schedules = nextSchedules;
    showMessage("Đã lưu lịch chăm sóc.", "success");
    return true;
}

function updateSchedule(id) {
    const index = schedules.findIndex((schedule) => Number(schedule.id) === id);
    if (index < 0) {
        resetForm();
        showMessage(`Lịch #${id} không còn tồn tại. Vui lòng chọn lại lịch cần sửa.`, "error");
        render();
        return false;
    }

    const nextSchedules = [...schedules];
    nextSchedules[index] = mergeScheduleUpdate(nextSchedules[index], getFormData());

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
    if ([STATUS_COMPLETED, STATUS_CANCELLED].includes(getScheduleStatus(schedule))) {
        showMessage("Lịch đã hoàn thành hoặc đã hủy không thể chỉnh sửa.", "error");
        return;
    }

    idInput.value = schedule.id;
    petNameInput.value = schedule.petName || "";
    const hasDetailedServices = Array.isArray(schedule.petServices) && schedule.petServices.length > 0;
    petNameInput.disabled = hasDetailedServices;
    careTypeInput.disabled = hasDetailedServices;
    if (careTypeOtherInput) careTypeOtherInput.disabled = hasDetailedServices;
    setCareType(schedule.careType);
    dateInput.value = schedule.date || "";
    setTime(schedule.time);
    statusInput.value = getScheduleStatus(schedule);
    statusInput.disabled = true;
    noteInput.value = schedule.note || "";
    saveBtn.textContent = "Cập nhật lịch";
    showMessage(hasDetailedServices
        ? "Lịch có nhiều dịch vụ do khách chọn; dịch vụ và giá được giữ nguyên khi cập nhật."
        : "Đang chỉnh sửa lịch đã chọn.", "");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(id, nextStatus, extra = {}) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    const currentStatus = schedule ? getScheduleStatus(schedule) : "";
    const allowedNextStatuses = {
        [STATUS_PENDING]: [STATUS_CONFIRMED, STATUS_CANCELLED],
        [STATUS_CONFIRMED]: [STATUS_COMPLETED, STATUS_CANCELLED],
    };
    if (!schedule || !allowedNextStatuses[currentStatus]?.includes(nextStatus)) {
        showMessage("Chuyển trạng thái lịch không hợp lệ.", "error");
        return false;
    }

    let shipmentsBefore = null;
    let shipmentsAfter = null;
    if (schedule.shipping) {
        shipmentsBefore = getShipmentStorage();
        const linkedShipment = shipmentsBefore.find((item) =>
            String(item.id) === String(schedule.shipping.id) &&
            String(item.customerUsername) === String(schedule.customerUsername || schedule.ownerUsername),
        );
        if (!linkedShipment) {
            showMessage("Không tìm thấy đơn vận chuyển liên kết. Lịch chưa được cập nhật.", "error");
            return false;
        }

        let updatedShipment = linkedShipment;
        if (nextStatus === STATUS_CONFIRMED && linkedShipment.status === SHIPMENT_STATUS.PENDING) {
            updatedShipment = updateShipmentStatus(linkedShipment, SHIPMENT_STATUS.CONFIRMED, "admin");
        } else if (nextStatus === STATUS_CONFIRMED && linkedShipment.status !== SHIPMENT_STATUS.CONFIRMED) {
            showMessage("Trạng thái vận chuyển không phù hợp để xác nhận lịch.", "error");
            return false;
        } else if (nextStatus === STATUS_CANCELLED && linkedShipment.status !== SHIPMENT_STATUS.CANCELLED) {
            updatedShipment = updateShipmentStatus(linkedShipment, SHIPMENT_STATUS.CANCELLED, "admin");
        } else if (nextStatus === STATUS_COMPLETED && linkedShipment.status !== SHIPMENT_STATUS.COMPLETED) {
            showMessage("Hãy hoàn tất đơn vận chuyển trước khi hoàn thành lịch chăm sóc.", "error");
            return false;
        }

        if (!updatedShipment) {
            showMessage("Đơn vận chuyển đã bắt đầu hoặc kết thúc nên không thể chuyển trạng thái lịch này.", "error");
            return false;
        }
        if (updatedShipment !== linkedShipment) {
            shipmentsAfter = shipmentsBefore.map((item) =>
                String(item.id) === String(linkedShipment.id) ? updatedShipment : item,
            );
            if (!saveShipmentStorage(shipmentsAfter)) {
                showMessage("Không thể đồng bộ đơn vận chuyển. Lịch chưa được cập nhật.", "error");
                return false;
            }
        }
    }

    const nextSchedules = schedules.map((item) =>
        Number(item.id) === id ? { ...item, status: nextStatus, ...extra } : item,
    );

    if (!saveSchedules(nextSchedules)) {
        if (shipmentsAfter) saveShipmentStorage(shipmentsBefore);
        showMessage("Không thể cập nhật trạng thái lịch. Vui lòng thử lại.", "error");
        return false;
    }

    schedules = nextSchedules;
    if (idInput && Number(idInput.value) === id) statusInput.value = nextStatus;
    return true;
}

function confirmSchedule(id) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    if (!schedule) return;

    const status = getScheduleStatus(schedule);
    if (status !== STATUS_PENDING) {
        showMessage("Chỉ xác nhận được đơn đang chờ xác nhận.", "error");
        return;
    }

    if (!setStatus(id, STATUS_CONFIRMED, { confirmedAt: new Date().toISOString() })) return;

    showMessage(`Đã xác nhận lịch #${id}. Người dùng sẽ thấy trạng thái mới.`, "success");
    render();
}

function completeSchedule(id) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    if (!schedule) return;

    const status = getScheduleStatus(schedule);
    if (status !== STATUS_CONFIRMED) {
        showMessage("Chỉ lịch đã xác nhận mới có thể hoàn thành.", "error");
        return;
    }

    const saved = setStatus(id, STATUS_COMPLETED, { completedAt: new Date().toISOString() });
    if (!saved) return;

    showMessage(`Đã đánh dấu lịch #${id} hoàn thành.`, "success");
    render();
}

function cancelSchedule(id) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    if (!schedule || ![STATUS_PENDING, STATUS_CONFIRMED].includes(getScheduleStatus(schedule))) {
        showMessage("Chỉ có thể hủy lịch đang chờ hoặc đã xác nhận.", "error");
        return;
    }
    if (!confirm(`Hủy lịch chăm sóc #${id}?`)) return;
    if (!setStatus(id, STATUS_CANCELLED, { cancelledAt: new Date().toISOString() })) return;
    showMessage(`Đã hủy lịch #${id}.`, "success");
    render();
}

function deleteSchedule(id) {
    if (!confirm("Chuyển lịch chăm sóc này vào danh sách đã xóa? Bạn có thể khôi phục sau.")) return;

    const nextSchedules = schedules.map((schedule) =>
        Number(schedule.id) === id ? { ...schedule, deletedAt: new Date().toISOString() } : schedule,
    );
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
    const nextSchedules = schedules.map((schedule) =>
        Number(schedule.id) === id ? { ...schedule, deletedAt: "" } : schedule,
    );

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
    if (statusInput) {
        statusInput.value = STATUS_PENDING;
        statusInput.disabled = true;
    }
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
