import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicUsers,
  getCurrentRole,
  login,
  logout,
  registerUser,
  USERS_STORAGE_KEY,
} from "../src/auth.js";
import { filterPets, getAdminStatistics } from "../src/adminData.js";
import {
  CARE_TYPES,
  CARE_TYPE_PET_SITTING,
  SCHEDULE_STATUS,
  getCareTypePrice,
  getPetSittingPrice,
  getNextScheduleId,
  loadSchedules,
  mergeScheduleUpdate,
  getScheduleStatusClass,
  normalizeStatus,
  resolveScheduleStatus,
  saveSchedules,
  SCHEDULE_STORAGE_KEY,
  isKnownCareType,
} from "../src/careScheduleData.js";
import { getNextPetId, loadPets, PET_STORAGE_KEY, savePets } from "../src/petData.js";
import {
  calculateShipmentFee,
  DISTANCE_CONFIG_KEY,
  getDistanceConfig,
  getDistanceForLocation,
  getAddressAreaCode,
  normalizePetSize,
  validateShippingPet,
} from "../src/shippingData.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

test("sample admin and user can log in; invalid credentials are rejected", () => {
  assert.equal(login("admin", "123456"), true);
  assert.equal(getCurrentRole(), "admin");
  logout();
  assert.equal(login("sample", "123456"), true);
  assert.equal(getCurrentRole(), "user");
  logout();
  assert.equal(login("sample", "wrong-password"), false);
  assert.equal(getCurrentRole(), null);
});

test("registration saves a user and rejects duplicate usernames", () => {
  localStorage.removeItem("neko:users");
  const result = registerUser({ username: "tester", password: "secret1", fullName: "Test User" });
  assert.equal(result.success, true);
  assert.equal(login("tester", "secret1"), true);
  logout();
  assert.equal(registerUser({ username: "TESTER", password: "secret1" }).success, false);
});

test("pet storage preserves owner and profile fields and refuses to overwrite invalid JSON", () => {
  const previousStorage = globalThis.localStorage;
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;

  try {
    storage.setItem(PET_STORAGE_KEY, "[]");
    const pet = {
      id: 1,
      name: "Miu",
      species: "Mèo",
      age: 2,
      weightKg: 4.5,
      ownerUsername: "tester",
      owner: "Test User",
      note: "Dị ứng thức ăn",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const otherPet = { id: 2, name: "Bông", ownerUsername: "another-user" };
    assert.equal(savePets([pet, otherPet]), true);
    const loadedPet = loadPets()[0];
    assert.equal(loadedPet.ownerUsername, "tester");
    assert.equal(loadedPet.weightKg, 4.5);
    assert.equal(loadedPet.note, "Dị ứng thức ăn");
    assert.equal(loadedPet.createdAt, pet.createdAt);
    assert.equal(savePets([{ ...loadedPet, name: "Miu mới" }, otherPet]), true);
    assert.deepEqual(loadPets().map((item) => item.name), ["Miu mới", "Bông"]);

    storage.setItem(PET_STORAGE_KEY, "not-json");
    assert.deepEqual(loadPets(), []);
    assert.equal(savePets([pet]), false);
    assert.equal(storage.getItem(PET_STORAGE_KEY), "not-json");
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("empty schedules start empty and invalid stored data is not overwritten", () => {
  const previousStorage = globalThis.localStorage;
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;

  try {
    assert.deepEqual(loadSchedules(), []);
    const schedule = {
      id: 1,
      customerUsername: "tester",
      customerId: "user-1",
      petId: 5,
      petName: "Miu",
      careType: "Tắm",
      status: SCHEDULE_STATUS.PENDING,
    };
    const otherSchedule = { id: 2, customerUsername: "another-user", petName: "Bông", status: SCHEDULE_STATUS.PENDING };
    assert.equal(saveSchedules([schedule, otherSchedule]), true);
    assert.equal(loadSchedules()[0].customerUsername, "tester");
    assert.equal(loadSchedules()[0].petId, 5);
    assert.equal(loadSchedules()[0].customerId, "user-1");
    assert.equal(getNextScheduleId(loadSchedules()), 3);
    assert.equal(saveSchedules([{ ...loadSchedules()[0], status: SCHEDULE_STATUS.CONFIRMED }, otherSchedule]), true);
    assert.equal(loadSchedules()[0].status, SCHEDULE_STATUS.CONFIRMED);
    assert.equal(loadSchedules()[1].customerUsername, "another-user");

    storage.setItem(SCHEDULE_STORAGE_KEY, "not-json");
    assert.deepEqual(loadSchedules(), []);
    assert.equal(saveSchedules([schedule]), false);
    assert.equal(storage.getItem(SCHEDULE_STORAGE_KEY), "not-json");
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("public account directory never exposes passwords", () => {
  localStorage.removeItem(USERS_STORAGE_KEY);
  const publicUsers = getPublicUsers();
  assert.ok(publicUsers.length > 0);
  assert.ok(publicUsers.every((user) => !Object.hasOwn(user, "password")));
});

test("pet search matches names and species filters", () => {
  const pets = [
    { name: "Milu", species: "Chó" },
    { name: "Misa", species: "Mèo" },
    { name: "Momo", species: "Mèo" },
  ];
  assert.deepEqual(filterPets(pets, "mi").map((pet) => pet.name), ["Milu", "Misa"]);
  assert.deepEqual(filterPets(pets, "", "Mèo").map((pet) => pet.name), ["Misa", "Momo"]);
});

test("pet identifiers remain increasing after deletion or reload", () => {
  const firstId = getNextPetId([]);
  const nextId = getNextPetId([]);
  assert.ok(firstId >= Date.now() - 1000);
  assert.ok(nextId > firstId);
  assert.ok(getNextPetId([{ id: nextId + 100 }]) > nextId + 100);
});

test("dashboard statistics count pets and unfinished/completed schedules", () => {
  const stats = getAdminStatistics([{ id: 1 }, { id: 2 }], [
    { status: "Chờ xác nhận" },
    { status: "Đã xác nhận" },
    { status: "Đã hoàn thành" },
    { status: "Đã hủy" },
    { status: "Chờ xác nhận", deletedAt: "2026-10-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(stats, { totalPets: 2, unfinishedSchedules: 2, completedSchedules: 1 });
});

test("schedule status is normalized from aliases and falls back by source", () => {
  assert.equal(normalizeStatus("completed", "user"), SCHEDULE_STATUS.COMPLETED);
  assert.equal(normalizeStatus("  CANCELLED ", "user"), SCHEDULE_STATUS.CANCELLED);
  assert.equal(normalizeStatus("", "user"), SCHEDULE_STATUS.PENDING);
  assert.equal(normalizeStatus("", "admin"), SCHEDULE_STATUS.CONFIRMED);

  assert.equal(resolveScheduleStatus({ customerUsername: "sample" }), SCHEDULE_STATUS.PENDING);
  assert.equal(resolveScheduleStatus({ source: "admin" }), SCHEDULE_STATUS.CONFIRMED);
  assert.equal(resolveScheduleStatus(null), SCHEDULE_STATUS.CONFIRMED);

  assert.equal(getScheduleStatusClass(SCHEDULE_STATUS.CONFIRMED), "confirmed");
  assert.equal(getScheduleStatusClass(SCHEDULE_STATUS.CANCELLED), "cancelled");
  assert.equal(getScheduleStatusClass("trạng thái lạ"), "pending");
});

test("multiple care services add their prices together", () => {
  assert.equal(getCareTypePrice("Tắm · Cắt móng"), 150000);
  assert.equal(getCareTypePrice(["Tắm", "Tiêm phòng"]), 300000);
  assert.equal(getCareTypePrice("Dịch vụ khác"), 0);
  assert.ok(CARE_TYPES.every((service) => service.value && service.price > 0));
  assert.equal(isKnownCareType(CARE_TYPE_PET_SITTING), true);
});

test("pet sitting price uses hourly rates with a daily cap per 24 hours", () => {
  assert.equal(getPetSittingPrice("2026-10-15", "22:00", "2026-10-16", "02:00"), 40000);
  assert.equal(getPetSittingPrice("2026-10-15", "08:00", "2026-10-16", "08:00"), 150000);
  assert.equal(getPetSittingPrice("2026-10-15", "08:00", "2026-10-16", "09:00"), 160000);
  assert.equal(getPetSittingPrice("2026-10-15", "08:00", "2026-10-15", "07:55"), 0);
});

test("admin edits preserve detailed customer services and their total price", () => {
  const schedule = {
    petId: "",
    petIds: [1, 2],
    petName: "Milu, Misa",
    petNames: ["Milu", "Misa"],
    petServices: [{ petId: 1, services: ["Tắm"], price: 100000 }],
    careType: "Milu: Tắm | Misa: Tiêm phòng",
    price: 300000,
    date: "2026-10-20",
  };
  const updated = mergeScheduleUpdate(schedule, {
    petName: "Tên không hợp lệ",
    careType: "Khác",
    price: 0,
    date: "2026-10-21",
    status: SCHEDULE_STATUS.CONFIRMED,
  });

  assert.equal(updated.price, 300000);
  assert.equal(updated.careType, schedule.careType);
  assert.deepEqual(updated.petServices, schedule.petServices);
  assert.equal(updated.petName, schedule.petName);
  assert.equal(updated.date, "2026-10-21");
  assert.equal(updated.status, SCHEDULE_STATUS.CONFIRMED);
});

test("dashboard statistics ignore unknown status values", () => {
  const stats = getAdminStatistics([], [
    { status: "completed" },
    { status: "cancelled" },
    { status: "không rõ" },
  ]);
  assert.deepEqual(stats, { totalPets: 0, unfinishedSchedules: 1, completedSchedules: 1 });
});

test("simulated shipping fees use distance and selected pet size", () => {
  assert.equal(getDistanceForLocation("A", "CENTER_1")?.distanceKm, 2);
  assert.deepEqual(getDistanceConfig().slice(0, 4).map((row) => row.areaCode), ["A", "B", "C", "D"]);

  const oneWay = calculateShipmentFee({
    distanceKm: 8,
    petSize: "medium",
    transportType: "one-way",
  });
  assert.equal(oneWay.baseFee, 20000);
  assert.equal(oneWay.distanceFee, 25000);
  assert.equal(oneWay.weightFee, 0);
  assert.equal(oneWay.sizeFee, 5000);
  assert.equal(oneWay.total, 50000);

  const roundTrip = calculateShipmentFee({
    distanceKm: 8,
    petSize: "medium",
    transportType: "round-trip",
  });
  assert.equal(roundTrip.baseFee, 35000);
  assert.equal(roundTrip.distanceFee, 50000);
  assert.equal(roundTrip.total, 90000);

  const differentReturnLocation = calculateShipmentFee({
    distanceKm: 6,
    returnDistanceKm: 12,
    petSize: "medium",
    transportType: "round-trip",
  });
  assert.equal(differentReturnLocation.distanceFee, 60000);
  assert.equal(differentReturnLocation.total, 100000);

  const withinIncludedDistance = calculateShipmentFee({
    distanceKm: 3,
    petSize: "small",
    transportType: "one-way",
  });
  assert.equal(withinIncludedDistance.total, 20000);

  const nextKilometer = calculateShipmentFee({
    distanceKm: 4,
    petSize: "small",
    transportType: "one-way",
  });
  assert.equal(nextKilometer.distanceFee, 5000);
  assert.equal(nextKilometer.total, 25000);

  const invalid = calculateShipmentFee({ distanceKm: 20, petSize: "medium", transportType: "one-way" });
  assert.equal(invalid.valid, false);
  assert.match(invalid.message, /xác nhận/);
});

test("stored district distances migrate to the Dong Da route estimates", () => {
  const previousStorage = globalThis.localStorage;
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  storage.setItem(DISTANCE_CONFIG_KEY, JSON.stringify([
    { areaCode: "HN_DONG_DA", areaName: "Đống Đa", centerCode: "CENTER_2", centerName: "Trung tâm 2", distanceKm: 6 },
    { areaCode: "HN_CAU_GIAY", areaName: "Cầu Giấy", centerCode: "CENTER_2", centerName: "Trung tâm 2", distanceKm: 9 },
    { areaCode: "HN_HOAN_KIEM", areaName: "Hoàn Kiếm", centerCode: "CENTER_2", centerName: "Tùy chỉnh", distanceKm: 99 },
    { areaCode: "CUSTOM", areaName: "Tùy chỉnh", centerCode: "CENTER_2", centerName: "Tùy chỉnh", distanceKm: 17 },
    { areaCode: "HN_DONG_DA", areaName: "Đống Đa", centerCode: "CENTER_1", centerName: "Trung tâm 1", distanceKm: 5 },
  ]));

  try {
    const routes = getDistanceConfig();
    const activeDistrictRoutes = routes
      .filter((row) => row.centerCode === "CENTER_2" && row.areaCode.startsWith("HN_"))
      .map(({ areaCode, distanceKm }) => [areaCode, distanceKm]);
    assert.deepEqual(activeDistrictRoutes, [
      ["HN_BA_DINH", 4],
      ["HN_HOAN_KIEM", 99],
      ["HN_TAY_HO", 8],
      ["HN_DONG_DA", 2],
      ["HN_HAI_BA_TRUNG", 5],
      ["HN_LONG_BIEN", 10],
      ["HN_CAU_GIAY", 6],
      ["HN_THANH_XUAN", 5],
      ["HN_BAC_TU_LIEM", 12],
      ["HN_NAM_TU_LIEM", 9],
      ["HN_HA_DONG", 12],
    ]);
    assert.equal(routes.find((row) => row.areaCode === "CUSTOM")?.distanceKm, 17);
    assert.equal(routes.find((row) => row.areaCode === "HN_DONG_DA" && row.centerCode === "CENTER_1")?.distanceKm, 5);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("pet sizes are normalized and validated safely", () => {
  assert.equal(normalizePetSize("SMALL"), "small");
  assert.equal(normalizePetSize("tiny"), "small");
  assert.equal(normalizePetSize("medium"), "medium");
  assert.equal(normalizePetSize("large"), "large");
  assert.equal(normalizePetSize(""), "");
  assert.equal(validateShippingPet({ name: "Milu", size: "medium" }).valid, true);
  assert.equal(validateShippingPet({ name: "Milu" }).valid, false);
});

test("simulated routes use the selected address district", () => {
  const centralDistrict = getAddressAreaCode("Hà Nội", "Ba Đình");
  const outerDistrict = getAddressAreaCode("Hà Nội", "Hà Đông");

  assert.equal(getDistanceForLocation(centralDistrict, "CENTER_1")?.distanceKm, 2);
  assert.equal(getDistanceForLocation(outerDistrict, "CENTER_1")?.distanceKm, 12);
});
