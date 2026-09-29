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
let schedules = loadSchedules();
let searchKeyword = "";

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
    } else if (button.dataset.action === "delete") {
        deleteSchedule(id);
    }
});

searchInput?.addEventListener("input", () => {
    searchKeyword = searchInput.value;
    render();
});

cancelBtn?.addEventListener("click", resetForm);
window.addEventListener("storage", (event) => {
    if (event.key !== SCHEDULE_STORAGE_KEY) return;
    schedules = loadSchedules();
    render();
});

render();

function getFiltered() {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return schedules;

    return schedules.filter((schedule) => {
        const values = [
            schedule.petName,
            schedule.customerName,
            schedule.customerUsername,
            schedule.customerPhone,
            schedule.careType,
            schedule.status,
        ];
        return values.some((value) => String(value || "").toLowerCase().includes(keyword));
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

    rows.forEach((schedule) => {
        const row = document.createElement("tr");
        const customer = schedule.customerName || schedule.customerUsername || "Dữ liệu mẫu";
        const phone = schedule.customerPhone || "—";
        const status = schedule.status || (schedule.customerUsername ? "Chờ xác nhận" : "Đã xác nhận");

        row.append(
            createCell(schedule.id),
            createCell(customer),
            createCell(phone),
            createCell(schedule.petName),
            createCell(schedule.careType),
            createCell(schedule.date),
            createCell(schedule.time),
            createCell(schedule.note),
            createCell(status),
        );

        const actionCell = document.createElement("td");
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "care-btn-edit";
        editButton.dataset.action = "edit";
        editButton.dataset.id = String(schedule.id);
        editButton.textContent = "Sửa";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "care-btn-delete";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = String(schedule.id);
        deleteButton.textContent = "Xóa";

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        careList.appendChild(row);
    });

    emptyMsg.hidden = rows.length > 0;
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
    statusInput.value = schedule.status || "Chờ xác nhận";
    noteInput.value = schedule.note || "";
    saveBtn.textContent = "Cập nhật lịch";
    showMessage("Đang chỉnh sửa lịch đã chọn.", "");

    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (statusInput) statusInput.value = "Đã xác nhận";
    if (saveBtn) saveBtn.textContent = "Lưu lịch";
    showMessage("", "");
}

function showMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = `user-form-message ${type}`;
}
