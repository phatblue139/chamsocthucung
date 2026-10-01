export function filterPets(pets, keyword = "", species = "") {
  const normalizedKeyword = String(keyword).trim().toLocaleLowerCase("vi");

  return pets.filter((pet) => {
    const matchesName = !normalizedKeyword || String(pet.name || "").toLocaleLowerCase("vi").includes(normalizedKeyword);
    const matchesSpecies = !species || String(pet.species || "").toLocaleLowerCase("vi") === String(species).toLocaleLowerCase("vi");
    return matchesName && matchesSpecies;
  });
}

export function getAdminStatistics(pets, schedules) {
  const completedSchedules = schedules.filter((schedule) => schedule.status === "Đã hoàn thành").length;
  const cancelledSchedules = schedules.filter((schedule) => schedule.status === "Đã hủy").length;

  return {
    totalPets: pets.length,
    unfinishedSchedules: schedules.length - completedSchedules - cancelledSchedules,
    completedSchedules,
  };
}
