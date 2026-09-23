const SAMPLE_SCHEDULES = [
    {
        id: 1,
        petId: 1,
        petName: "Milu",
        careType: "Cho ăn",
        date: "2026-09-23",
        time: "08:00",
        note: "Cho ăn buổi sáng"
    },
    {
        id: 2,
        petId: 2,
        petName: "Misa",
        careType: "Tắm",
        date: "2026-09-23",
        time: "10:00",
        note: "Tắm và vệ sinh tai"
    },
    {
        id: 3,
        petId: 3,
        petName: "Lucky",
        careType: "Đi dạo",
        date: "2026-09-23",
        time: "17:00",
        note: "Đi dạo công viên 30 phút"
    },
    {
        id: 4,
        petId: 1,
        petName: "Milu",
        careType: "Tiêm phòng",
        date: "2026-09-25",
        time: "09:30",
        note: "Tiêm vaccine định kỳ"
    },
    {
        id: 5,
        petId: 2,
        petName: "Misa",
        careType: "Cắt móng",
        date: "2026-09-26",
        time: "14:00",
        note: "Cắt móng chân"
    }
];

const STORAGE_KEY = "careSchedules";

function clone(data) {
    return data.map(item => ({ ...item }));
}

export function getSampleSchedules() {
    return clone(SAMPLE_SCHEDULES);
}

export function loadSchedules() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (error) {
            console.warn("Không đọc được dữ liệu localStorage, dùng dữ liệu mẫu.", error);
        }
    }

    return getSampleSchedules();
}

export function saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

export function clearSchedules() {
    localStorage.removeItem(STORAGE_KEY);
}

export default SAMPLE_SCHEDULES;