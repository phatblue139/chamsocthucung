import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentRole,
  login,
  logout,
  registerUser,
} from "../src/auth.js";
import { filterPets, getAdminStatistics } from "../src/adminData.js";
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_PREFERENCE_STORAGE_KEY,
  chargeWallet,
  loadWallet,
  loadPaymentPreference,
  requestWalletWithdrawal,
  savePaymentPreference,
  topUpWallet,
} from "../src/paymentData.js";
import {
  SCHEDULE_STATUS,
  getCareTypePrice,
  getPetSittingPrice,
  mergeScheduleUpdate,
  getScheduleStatusClass,
  normalizeStatus,
  resolveScheduleStatus,
} from "../src/careScheduleData.js";
import {
  calculateShipmentFee,
  getDistanceConfig,
  getDistanceForLocation,
  getAddressAreaCode,
  normalizePetSize,
  validateShippingPet,
} from "../src/shippingData.js";
import {
  confirmPaymentReceived,
  getPaymentAmount,
  getPaymentStatus,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_UNPAID,
} from "../src/paymentAdminData.js";

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

test("pet search matches names and species filters", () => {
  const pets = [
    { name: "Milu", species: "Chó" },
    { name: "Misa", species: "Mèo" },
    { name: "Momo", species: "Mèo" },
  ];
  assert.deepEqual(filterPets(pets, "mi").map((pet) => pet.name), ["Milu", "Misa"]);
  assert.deepEqual(filterPets(pets, "", "Mèo").map((pet) => pet.name), ["Misa", "Momo"]);
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
  assert.equal(getDistanceForLocation("A", "CENTER_2")?.distanceKm, 3);
  assert.deepEqual(getDistanceConfig().slice(0, 4).map((row) => row.areaCode), ["A", "B", "C", "D"]);

  const oneWay = calculateShipmentFee({
    distanceKm: 8,
    petSize: "medium",
    transportType: "one-way",
  });
  assert.equal(oneWay.baseFee, 20000);
  assert.equal(oneWay.distanceFee, 25000);
  assert.equal(oneWay.weightFee, 0);
  assert.equal(oneWay.sizeFee, 10000);
  assert.equal(oneWay.total, 55000);

  const roundTrip = calculateShipmentFee({
    distanceKm: 8,
    petSize: "medium",
    transportType: "round-trip",
  });
  assert.equal(roundTrip.baseFee, 35000);
  assert.equal(roundTrip.total, 70000);

  const invalid = calculateShipmentFee({ distanceKm: 20, petSize: "medium", transportType: "one-way" });
  assert.equal(invalid.valid, false);
  assert.match(invalid.message, /xác nhận/);
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

  assert.equal(getDistanceForLocation(centralDistrict, "CENTER_2")?.distanceKm, 3);
  assert.equal(getDistanceForLocation(outerDistrict, "CENTER_2")?.distanceKm, 15);
});

test("payment preference is saved per user and rejects unknown methods", () => {
  localStorage.removeItem(PAYMENT_PREFERENCE_STORAGE_KEY);
  assert.equal(loadPaymentPreference("new-customer"), DEFAULT_PAYMENT_METHOD);
  assert.equal(savePaymentPreference("Customer-A", "bank-transfer"), true);
  assert.equal(loadPaymentPreference("customer-a"), "bank-transfer");
  assert.equal(loadPaymentPreference("customer-b"), DEFAULT_PAYMENT_METHOD);
  assert.equal(savePaymentPreference("customer-a", "card"), false);
  assert.equal(savePaymentPreference("customer-a", "wallet"), true);
});

test("wallet tracks demo top-ups and charges without allowing a negative balance", () => {
  const username = `wallet-test-${Date.now()}`;
  assert.equal(loadWallet(username).balance, 0);
  assert.equal(chargeWallet(username, 10000), false);
  assert.equal(topUpWallet(username, 100000), true);
  assert.equal(chargeWallet(username, 35000), true);
  assert.equal(loadWallet(username).balance, 65000);
  assert.equal(requestWalletWithdrawal(username, 40000), true);
  assert.equal(loadWallet(username).balance, 25000);
  assert.equal(requestWalletWithdrawal(username, 30000), false);
  assert.equal(loadWallet(username).transactions.length, 3);
  assert.equal(loadWallet(username).transactions.at(-1).status, "pending");
  assert.equal(topUpWallet(username, -1), false);
});

test("admin payment helpers include shipping and confirm receipt metadata", () => {
  const schedule = {
    id: 18,
    price: 100000,
    shipping: { totalFee: 25000 },
    payment: { method: "bank-transfer", status: "Chờ thanh toán" },
  };
  assert.equal(getPaymentAmount(schedule), 125000);
  assert.equal(getPaymentStatus(schedule), PAYMENT_STATUS_UNPAID);

  const confirmed = confirmPaymentReceived(schedule, "admin", "2026-10-19T10:00:00.000Z");
  assert.equal(getPaymentStatus(confirmed), PAYMENT_STATUS_PAID);
  assert.equal(confirmed.payment.amount, 125000);
  assert.equal(confirmed.payment.receivedBy, "admin");
  assert.equal(confirmed.payment.paidAt, "2026-10-19T10:00:00.000Z");
  assert.equal(schedule.payment.status, "Chờ thanh toán");
});
