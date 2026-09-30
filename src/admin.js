import { isAdminLoggedIn, logout } from "./auth.js";
import { getAdminStatistics } from "./adminData.js";
import { loadPets, PET_STORAGE_KEY } from "./petData.js";
import { loadSchedules, SCHEDULE_STORAGE_KEY } from "./careScheduleData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
} else {
  const logoutButton = document.getElementById("logoutBtn");

  function render() {
    const stats = getAdminStatistics(loadPets(), loadSchedules());
    document.getElementById("totalPets").textContent = String(stats.totalPets);
    document.getElementById("unfinishedSchedules").textContent = String(stats.unfinishedSchedules);
    document.getElementById("completedSchedules").textContent = String(stats.completedSchedules);
  }

  logoutButton?.addEventListener("click", () => {
    logout();
    location.replace("/");
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PET_STORAGE_KEY || event.key === SCHEDULE_STORAGE_KEY) render();
  });

  render();
}
