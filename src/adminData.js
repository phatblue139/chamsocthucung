import { getScheduleStatusClass, resolveScheduleStatus } from "./careScheduleData.js";

export function filterPets(pets, keyword = "", species = "", status = "") {
  const list = Array.isArray(pets) ? pets : [];
  const normalizedKeyword = String(keyword).trim().toLocaleLowerCase("vi");

  return list.filter((pet) => {
    const searchValues = [
      pet.name,
      pet.owner,
      pet.petCode || (pet.id ? `PET${String(pet.id).padStart(3, "0")}` : ""),
    ].map((value) => String(value || "").toLocaleLowerCase("vi"));
    const matchesKeyword = !normalizedKeyword || searchValues.some((value) => value.includes(normalizedKeyword));
    const matchesSpecies = !species || String(pet.species || "").toLocaleLowerCase("vi") === String(species).toLocaleLowerCase("vi");
    const matchesStatus = !status || String(pet.status || "").toLocaleLowerCase("vi") === String(status).toLocaleLowerCase("vi");
    return matchesKeyword && matchesSpecies && matchesStatus;
  });
}

export function sortPets(pets, sortBy = "") {
  const list = Array.isArray(pets) ? [...pets] : [];
  if (sortBy === "name") {
    return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi", { sensitivity: "base" }));
  }
  if (sortBy === "age") {
    return list.sort((a, b) => {
      const ageA = Number(a.age);
      const ageB = Number(b.age);
      const validA = Number.isFinite(ageA);
      const validB = Number.isFinite(ageB);
      if (!validA && !validB) return 0;
      if (!validA) return 1;
      if (!validB) return -1;
      return ageA - ageB;
    });
  }
  return list;
}

export function paginatePets(pets, page = 1, pageSize = 10) {
  const list = Array.isArray(pets) ? pets : [];
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalPages = Math.ceil(list.length / size);
  const currentPage = totalPages ? Math.min(Math.max(1, Number(page) || 1), totalPages) : 1;
  const start = (currentPage - 1) * size;
  return {
    items: list.slice(start, start + size),
    page: currentPage,
    pageSize: size,
    totalItems: list.length,
    totalPages,
  };
}

export function getPetSchedules(pet, schedules) {
  if (!pet || !Array.isArray(schedules)) return [];
  const petId = String(pet.id ?? "");
  const petName = String(pet.name || "").trim().toLocaleLowerCase("vi");

  return schedules.filter((schedule) => {
    if (!schedule || schedule.deletedAt) return false;
    const schedulePetIds = [
      ...(Array.isArray(schedule.petIds) ? schedule.petIds : []),
      ...(Array.isArray(schedule.petServices) ? schedule.petServices.map((item) => item.petId) : []),
      schedule.petId,
    ].filter((id) => id !== "" && id !== null && id !== undefined).map(String);
    if (schedulePetIds.length) return schedulePetIds.includes(petId);

    const names = [
      ...(Array.isArray(schedule.petNames) ? schedule.petNames : []),
      ...(Array.isArray(schedule.petServices) ? schedule.petServices.map((item) => item.petName) : []),
      schedule.petName,
    ].map((name) => String(name || "").trim().toLocaleLowerCase("vi"));
    return Boolean(petName && names.includes(petName));
  });
}

export function getPetScheduleServices(schedule, pet) {
  if (Array.isArray(schedule?.petServices) && schedule.petServices.length) {
    const petService = schedule.petServices.find((item) => String(item.petId) === String(pet?.id))
      || schedule.petServices.find((item) => !item.petId && String(item.petName || "").trim().toLocaleLowerCase("vi") === String(pet?.name || "").trim().toLocaleLowerCase("vi"));
    if (petService && Array.isArray(petService.services) && petService.services.length) return petService.services;
  }
  return schedule?.careType ? [String(schedule.careType)] : [];
}

export function getUnresolvedPetSchedules(pet, schedules) {
  return getPetSchedules(pet, schedules).filter((schedule) => {
    const status = resolveScheduleStatus(schedule);
    return status !== "Đã hoàn thành" && status !== "Đã hủy";
  });
}

export function validatePetFormData(name, age) {
  if (!String(name || "").trim()) return "Vui lòng nhập tên thú cưng.";
  if (age === undefined) return "";
  if (String(age ?? "").trim() === "") return "Vui lòng nhập tuổi thú cưng.";
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return "Tuổi thú cưng phải là một số hợp lệ.";
  if (numericAge < 0) return "Tuổi thú cưng không được là số âm.";
  if (numericAge > 40) return "Tuổi thú cưng không được vượt quá 40.";
  if (!Number.isInteger(numericAge)) return "Tuổi thú cưng phải là số nguyên.";
  return "";
}

export function getPetStatistics(pets) {
  const list = Array.isArray(pets) ? pets : [];
  const stats = { totalPets: list.length, dogs: 0, cats: 0, beingCaredFor: 0 };

  list.forEach((pet) => {
    const species = String(pet?.species || "").trim().toLocaleLowerCase("vi");
    const status = String(pet?.status || "").trim().toLocaleLowerCase("vi");
    if (species === "chó") stats.dogs += 1;
    if (species === "mèo") stats.cats += 1;
    if (status === "đang chăm sóc") stats.beingCaredFor += 1;
  });

  return stats;
}

export function getAdminStatistics(pets, schedules) {
  const list = (Array.isArray(schedules) ? schedules : []).filter((schedule) => !schedule.deletedAt);
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