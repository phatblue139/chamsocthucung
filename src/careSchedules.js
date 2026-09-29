import {
    SCHEDULE_STORAGE_KEY,
    getNextScheduleId,
    loadSchedules,
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
const careCount = document.getElementById("careCount");
const formMessage = document.getElementById("careFormMessage");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const idInput = document.getElementById("id");
const petNameInput = document.getElementById("petName");
const careTypeInput = document.getElementById("careType");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const statusInput = document.getElementById("status");
const noteInput = document.getElementById("note");
const careStats = document.getElementById("careStats");
let schedules = loadSchedules();
let searchKeyword = "";
let statusFilter = "";
const STATUS_PENDING = "Chờ xác nhận";
const STATUS_CONFIRMED = "Đã xác nhận";
const STATUS_COMPLETED = "Đã hoàn thành";
const STATUS_CANCELLED = "Đã hủy";

logoutBtn?.addEventListener("click", () => {
    logout();
    location.replace("/");
});

form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = idInput.value;
    const saved = id ? updateSchedule(Number(id)) : addSchedule();
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
    }
});

searchInput?.addEventListener("input", () => {
    searchKeyword = searchInput.value;
    render();
});

careStats?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    statusFilter = button.dataset.status || "";
    render();
});

cancelBtn?.addEventListener("click", resetForm);
window.addEventListener("storage", (event) => {
    if (event.key !== SCHEDULE_STORAGE_KEY) return;
    schedules = loadSchedules();
    render();
});

render();

function getScheduleStatus(schedule) {
    return schedule.status || (schedule.customerUsername ? STATUS_PENDING : STATUS_CONFIRMED);
}

function getStatusClass(status) {
    if (status === STATUS_CONFIRMED) return "confirmed";
    if (status === STATUS_COMPLETED) return "completed";
    if (status === STATUS_CANCELLED) return "cancelled";
    return "pending";
}

function getFiltered() {
    const keyword = searchKeyword.trim().toLowerCase();

    return schedules.filter((schedule) => {
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
    schedules.forEach((schedule) => {
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
    });
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined ? "" : String(value);
    return cell;
}

function render() {
    if (!careList || !emptyMsg || !careCount) return;

    careList.replaceChildren();
    const rows = getFiltered();
    careCount.textContent = `Tổng: ${schedules.length} lịch | Đang hiển thị: ${rows.length}`;
    renderStats();

    rows.forEach((schedule) => {
        const row = document.createElement("tr");
        const customer = schedule.customerName || schedule.customerUsername || "Dữ liệu mẫu";
        const phone = schedule.customerPhone || "—";
        const status = getScheduleStatus(schedule);
        const isCompleted = status === STATUS_COMPLETED;
        const isPending = status === STATUS_PENDING;

        row.classList.toggle("care-row-completed", isCompleted);
        row.append(
            createCell(schedule.id),
            createCell(customer),
            createCell(phone),
            createCell(schedule.petName),
            createCell(schedule.careType),
            createCell(schedule.date),
            createCell(schedule.time),
            createCell(schedule.note),
            createStatusCell(status),
        );

        const actionCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "care-actions";
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
        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);
        careList.appendChild(row);
    });

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
    return {
        petName: petNameInput.value.trim(),
        careType: careTypeInput.value,
        date: dateInput.value,
        time: timeInput.value,
        note: noteInput.value.trim(),
        status: statusInput.value,
    };
}

function addSchedule() {
    const schedule = {
        id: getNextScheduleId(schedules),
        petId: schedules.length + 1,
        ...getFormData(),
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
    if (index < 0) return false;

    const nextSchedules = [...schedules];
    nextSchedules[index] = {
        ...nextSchedules[index],
        ...getFormData(),
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
    careTypeInput.value = schedule.careType || "";
    dateInput.value = schedule.date || "";
    timeInput.value = schedule.time || "";
    statusInput.value = getScheduleStatus(schedule);
    noteInput.value = schedule.note || "";
    saveBtn.textContent = "Cập nhật lịch";
    showMessage("Đang chỉnh sửa lịch đã chọn.", "");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(id, nextStatus, extra = {}) {
    const nextSchedules = schedules.map((item) =>
        Number(item.id) === id ? { ...item, status: nextStatus, ...extra } : item,
    );

    if (!saveSchedules(nextSchedules)) {
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

function toggleCompleted(id) {
    const schedule = schedules.find((item) => Number(item.id) === id);
    if (!schedule) return;

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
    if (!confirm("Bạn có chắc muốn xóa lịch chăm sóc này không?")) return;

    const nextSchedules = schedules.filter((schedule) => Number(schedule.id) !== id);
    if (!saveSchedules(nextSchedules)) {
        showMessage("Không thể xóa lịch. Vui lòng thử lại.", "error");
        return;
    }

    schedules = nextSchedules;
    showMessage("Đã xóa lịch chăm sóc.", "success");
    render();
}

function resetForm() {
    form?.reset();
    idInput.value = "";
    if (statusInput) statusInput.value = STATUS_CONFIRMED;
    if (saveBtn) saveBtn.textContent = "Lưu lịch";
    showMessage("", "");
}

function showMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = `user-form-message ${type}`;
}
