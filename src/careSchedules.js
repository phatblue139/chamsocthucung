import { loadSchedules, saveSchedules } from "./careScheduleData.js";
import { isAdminLoggedIn, logout } from "./auth.js";

if (!isAdminLoggedIn()) {
    location.replace("/");
    throw new Error("Không có quyền truy cập trang này");
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        logout();
        location.replace("/");
    });
}

let schedules = loadSchedules();
let searchKeyword = "";

const form = document.getElementById("careForm");
const careList = document.getElementById("careList");
const emptyMsg = document.getElementById("emptyMsg");
const searchInput = document.getElementById("searchInput");
const careCount = document.getElementById("careCount");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const idInput = document.getElementById("id");
const petNameInput = document.getElementById("petName");
const careTypeInput = document.getElementById("careType");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const noteInput = document.getElementById("note");


// ===== LỌC THEO TỪ KHÓA =====
function getFiltered() {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) return schedules;

    return schedules.filter(schedule =>
        schedule.petName.toLowerCase().includes(keyword) ||
        schedule.careType.toLowerCase().includes(keyword)
    );
}


// ===== HIỂN THỊ DANH SÁCH =====
function render() {
    careList.innerHTML = "";

    const rows = getFiltered();

    careCount.textContent =
        `Tổng: ${schedules.length} lịch | Đang hiển thị: ${rows.length}`;

    rows.forEach(schedule => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${schedule.id}</td>
            <td>${schedule.petName}</td>
            <td>${schedule.careType}</td>
            <td>${schedule.date}</td>
            <td>${schedule.time}</td>
            <td>${schedule.note || ""}</td>
            <td>
                <button class="care-btn-edit" data-action="edit" data-id="${schedule.id}">Sửa</button>
                <button class="care-btn-delete" data-action="delete" data-id="${schedule.id}">Xóa</button>
            </td>
        `;

        careList.appendChild(row);
    });

    emptyMsg.hidden = rows.length > 0;
}


// ===== LẤY DỮ LIỆU TỪ FORM =====
function getFormData() {
    return {
        petName: petNameInput.value.trim(),
        careType: careTypeInput.value,
        date: dateInput.value,
        time: timeInput.value,
        note: noteInput.value.trim()
    };
}


// ===== ID TIẾP THEO =====
function nextId() {
    return schedules.length > 0
        ? Math.max(...schedules.map(schedule => schedule.id)) + 1
        : 1;
}


// ===== THÊM / SỬA =====
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const id = idInput.value;

    if (id) {
        updateSchedule(Number(id));
    } else {
        addSchedule();
    }

    resetForm();
    render();
});


// ===== THÊM =====
function addSchedule() {
    const newSchedule = {
        id: nextId(),
        petId: schedules.length + 1,
        ...getFormData()
    };

    schedules.push(newSchedule);
    saveSchedules(schedules);
}


// ===== SỬA =====
function updateSchedule(id) {
    const schedule = schedules.find(item => item.id === id);

    if (!schedule) return;

    Object.assign(schedule, getFormData());
    saveSchedules(schedules);
}


// ===== SỬ LÝ NÚT SỬA / XÓA (delegation) =====
careList.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === "edit") {
        editSchedule(id);
    } else if (button.dataset.action === "delete") {
        deleteSchedule(id);
    }
});


// ===== SỬA =====
function editSchedule(id) {
    const schedule = schedules.find(item => item.id === id);

    if (!schedule) return;

    idInput.value = schedule.id;
    petNameInput.value = schedule.petName;
    careTypeInput.value = schedule.careType;
    dateInput.value = schedule.date;
    timeInput.value = schedule.time;
    noteInput.value = schedule.note;
    saveBtn.textContent = "Cập nhật lịch";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ===== XÓA =====
function deleteSchedule(id) {
    const confirmed = confirm("Bạn có chắc muốn xóa lịch chăm sóc này không?");

    if (!confirmed) return;

    schedules = schedules.filter(item => item.id !== id);
    saveSchedules(schedules);
    render();
}


// ===== HỦY / LÀM TRẮNG FORM =====
function resetForm() {
    form.reset();
    idInput.value = "";
    saveBtn.textContent = "Lưu lịch";
}

cancelBtn.addEventListener("click", resetForm);


// ===== TÌM KIẾM =====
searchInput.addEventListener("input", function() {
    searchKeyword = searchInput.value;
    render();
});


// ===== CHẠY LẦN ĐẦU =====
render();