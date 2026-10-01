import { getScheduleStatusClass, resolveScheduleStatus } from "./careScheduleData.js";

export function filterPets(pets, keyword = "", species = "") {
  const list = Array.isArray(pets) ? pets : [];
  const normalizedKeyword = String(keyword).trim().toLocaleLowerCase("vi");

  return list.filter((pet) => {
    const matchesName = !normalizedKeyword || String(pet.name || "").toLocaleLowerCase("vi").includes(normalizedKeyword);
    const matchesSpecies = !species || String(pet.species || "").toLocaleLowerCase("vi") === String(species).toLocaleLowerCase("vi");
    return matchesName && matchesSpecies;
  });
}

export function getAdminStatistics(pets, schedules) {
  const list = Array.isArray(schedules) ? schedules : [];
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

  list.forEach((schedule) => {
    counts[getScheduleStatusClass(resolveScheduleStatus(schedule))] += 1;
  });

  return {
    totalPets: Array.isArray(pets) ? pets.length : 0,
    unfinishedSchedules: list.length - counts.completed - counts.cancelled,
    completedSchedules: counts.completed,
  };
}