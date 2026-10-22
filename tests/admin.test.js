import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentRole,
  login,
  logout,
  registerUser,
} from "../src/auth.js";
import {
  filterPets,
  getAdminStatistics,
  getPetScheduleServices,
  getPetSchedules,
  getPetStatistics,
  getUnresolvedPetSchedules,
  paginatePets,
  sortPets,
  validatePetFormData,
} from "../src/adminData.js";
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
import { getPetCode, loadPets, savePets } from "../src/petData.js";
import {
  SCHEDULE_STATUS,
  getCareTypePrice,
  getPetSittingPrice,
  hasScheduleConflict,
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
  getPaymentBreakdown,
  getPaymentStatus,
  getPaymentStatusClass,
  getPaymentStatistics,
  updatePaymentStatus,
  buildPaymentCsv,
  filterPayments,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REFUNDED,
  PAYMENT_STATUS_UNPAID,
} from "../src/paymentAdminData.js";
import {
  canReviewSchedule,
  createReviewRecord,
  getNextReviewId,
  getReviewForSchedule,
  loadReviews,
  REVIEW_STORAGE_KEY,
  saveReviews,
  validateReview,
} from "../src/reviewData.js";

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

test("pet search matches names, owners and codes and applies species/status filters", () => {
  const pets = [
    { id: 1, name: "Milu", owner: "Lan", species: "Chó", status: "Đang chăm sóc" },
    { id: 2, name: "Misa", owner: "Minh", species: "Mèo", status: "Chờ lịch" },
    { id: 3, name: "Momo", owner: "Lan", species: "Mèo", status: "Đang chăm sóc" },
  ];
  assert.deepEqual(filterPets(pets, "mi").map((pet) => pet.name), ["Milu", "Misa"]);
  assert.deepEqual(filterPets(pets, "lan").map((pet) => pet.name), ["Milu", "Momo"]);
  assert.deepEqual(filterPets(pets, "pet002").map((pet) => pet.name), ["Misa"]);
  assert.deepEqual(filterPets(pets, "", "Mèo").map((pet) => pet.name), ["Misa", "Momo"]);
  assert.deepEqual(filterPets(pets, "", "", "Đang chăm sóc").map((pet) => pet.name), ["Milu", "Momo"]);
});

test("pet sorting and pagination handle ordering and out-of-range pages", () => {
  const pets = [
    { name: "Momo", age: 3 },
    { name: "Bông", age: 1 },
    { name: "Milu", age: 2 },
  ];
  assert.deepEqual(sortPets(pets, "name").map((pet) => pet.name), ["Bông", "Milu", "Momo"]);
  assert.deepEqual(sortPets(pets, "age").map((pet) => pet.age), [1, 2, 3]);
  const result = paginatePets([...pets, ...pets], 2, 4);
  assert.deepEqual(result, { items: pets.slice(1, 3), page: 2, pageSize: 4, totalItems: 6, totalPages: 2 });
  assert.equal(paginatePets(pets, 8, 2).page, 2);
});

test("pet details find related schedules and per-pet service history", () => {
  const pet = { id: 2, name: "Misa" };
  const schedules = [
    { id: 1, petId: 2, careType: "Tắm" },
    {
      id: 2,
      petIds: [1, 2],
      petServices: [
        { petId: 1, services: ["Cho ăn"] },
        { petId: 2, services: ["Tắm", "Cắt móng"] },
      ],
    },
    { id: 3, petName: "Misa", careType: "Tiêm phòng" },
    { id: 4, petId: 2, deletedAt: "2026-10-01T00:00:00.000Z", careType: "Tẩy giun" },
    { id: 5, petId: 3, petName: "Misa", careType: "Cho ăn" },
  ];
  const related = getPetSchedules(pet, schedules);
  assert.deepEqual(related.map((schedule) => schedule.id), [1, 2, 3]);
  assert.deepEqual(getPetScheduleServices(schedules[1], pet), ["Tắm", "Cắt móng"]);
  assert.deepEqual(getPetScheduleServices(schedules[0], pet), ["Tắm"]);
});

test("pet deletion is blocked only while related schedules remain unresolved", () => {
  const pet = { id: 1, name: "Milu" };
  const schedules = [
    { id: 1, petId: 1, status: "Chờ xác nhận" },
    { id: 2, petIds: [1, 2], status: "Đã xác nhận" },
    { id: 3, petId: 1, status: "Đã hoàn thành" },
    { id: 4, petId: 1, status: "Đã hủy" },
    { id: 5, petId: 1, status: "Chờ xác nhận", deletedAt: "2026-10-01T00:00:00.000Z" },
  ];
  assert.deepEqual(getUnresolvedPetSchedules(pet, schedules).map((schedule) => schedule.id), [1, 2]);
  assert.deepEqual(getUnresolvedPetSchedules(pet, schedules.slice(2)), []);
});

test("pet form validation requires a name and a non-negative integer age", () => {
  assert.equal(validatePetFormData("  ", 2), "Vui lòng nhập tên thú cưng.");
  assert.equal(validatePetFormData("Milu", ""), "Vui lòng nhập tuổi thú cưng.");
  assert.equal(validatePetFormData("Milu", -1), "Tuổi thú cưng không được là số âm.");
  assert.equal(validatePetFormData("Milu", "not a number"), "Tuổi thú cưng phải là một số hợp lệ.");
  assert.equal(validatePetFormData("Milu", 2.5), "Tuổi thú cưng phải là số nguyên.");
  assert.equal(validatePetFormData("Milu", 41), "Tuổi thú cưng không được vượt quá 40.");
  assert.equal(validatePetFormData(" Milu ", 0), "");
});

test("pet codes are generated from IDs and missing weights stay empty", () => {
  assert.equal(getPetCode(1), "PET001");
  assert.equal(getPetCode(25), "PET025");
  assert.equal(getPetCode(1000), "PET1000");
  assert.equal(getPetCode(0), "—");
  const savedPets = localStorage.getItem("neko:pets");
  try {
    savePets([{ id: 1, name: "Milu" }]);
    assert.equal(loadPets()[0].weightKg, "");
  } finally {
    if (savedPets === null) localStorage.removeItem("neko:pets");
    else localStorage.setItem("neko:pets", savedPets);
  }
});

test("pet statistics count totals by species and care status", () => {
  const stats = getPetStatistics([
    { species: "Chó", status: "Đang chăm sóc" },
    { species: "chó", status: "Chờ lịch" },
    { species: "Mèo", status: " Đang chăm sóc " },
    { species: "Mèo", status: "Chờ lịch" },
    { species: "Chim", status: "Đang chăm sóc" },
  ]);
  assert.deepEqual(stats, { totalPets: 5, dogs: 2, cats: 2, beingCaredFor: 3 });
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

test("schedule conflict checks handle pet ID sets", () => {
  const existing = [{
    petIds: [4],
    date: "2026-10-22",
    time: "12:30",
    status: SCHEDULE_STATUS.PENDING,
    customerUsername: "sample",
  }];

  assert.equal(hasScheduleConflict(existing, { petIds: [4], date: "2026-10-22", time: "12:30" }), true);
  assert.equal(hasScheduleConflict(existing, { petIds: [4], date: "2026-10-22", time: "12:35" }), false);
  assert.equal(hasScheduleConflict(existing, { petIds: [5], date: "2026-10-22", time: "12:30" }), false);
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

test("reviews are limited to completed schedules owned by the current user", () => {
  const schedule = {
    id: 42,
    customerUsername: "sample",
    petName: "Milu",
    careType: "Tắm",
    status: SCHEDULE_STATUS.COMPLETED,
  };
  assert.equal(canReviewSchedule(schedule, "sample"), true);
  assert.equal(canReviewSchedule(schedule, "other"), false);
  assert.equal(canReviewSchedule({ ...schedule, status: SCHEDULE_STATUS.CONFIRMED }, "sample"), false);
  assert.equal(canReviewSchedule({ ...schedule, deletedAt: "now" }, "sample"), false);

  assert.equal(validateReview({ schedule, username: "sample", rating: 5, comment: "Rất tốt" }), "");
  assert.match(validateReview({ schedule, username: "other", rating: 5, comment: "Rất tốt" }), /lịch đã hoàn thành/);
  assert.match(validateReview({ schedule, username: "sample", rating: 6, comment: "Rất tốt" }), /số sao/);
  assert.match(validateReview({ schedule, username: "sample", rating: 4, comment: "  " }), /nội dung đánh giá/);
});

test("reviews persist with schedule and customer identity", () => {
  localStorage.removeItem(REVIEW_STORAGE_KEY);
  const schedule = {
    id: 7,
    customerUsername: "sample",
    petName: "Misa",
    careType: "Tiêm phòng",
    status: SCHEDULE_STATUS.COMPLETED,
  };
  const review = createReviewRecord({
    id: getNextReviewId([]),
    schedule,
    user: { username: "sample", fullName: "Minh Anh" },
    rating: 4,
    comment: "Tư vấn tốt",
    now: "2026-10-20T10:00:00.000Z",
  });
  assert.equal(saveReviews([review]), true);
  assert.equal(getReviewForSchedule(loadReviews(), 7, "sample").authorName, "Minh Anh");
  assert.equal(getReviewForSchedule(loadReviews(), 7, "other"), null);
  assert.equal(getNextReviewId([{ id: 1 }, { id: 5 }]), 6);
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
  assert.match(confirmed.payment.transactionId, /^PAY-000018-/);
  assert.equal(schedule.payment.status, "Chờ thanh toán");
  assert.equal(confirmPaymentReceived(confirmed, "admin", "2026-10-20T10:00:00.000Z").payment.transactionId, confirmed.payment.transactionId);
});

test("payment breakdown separates service, shipping, and additional fees", () => {
  assert.deepEqual(getPaymentBreakdown({
    price: 100000,
    shipping: { totalFee: 25000 },
    payment: { amount: 135000 },
  }), {
    serviceAmount: 100000,
    shippingFee: 25000,
    additionalFees: 10000,
    totalAmount: 135000,
  });
});

test("payment filters apply method, date range, status, and search", () => {
  const payments = [
    {
      id: 1,
      date: "2026-10-01",
      customerName: "Lan",
      payment: { method: "wallet", status: PAYMENT_STATUS_PAID, paidAt: "2026-10-03T09:00:00.000Z" },
    },
    {
      id: 2,
      date: "2026-10-05",
      customerName: "Minh",
      payment: { method: "bank-transfer", status: PAYMENT_STATUS_PENDING },
    },
    {
      id: 3,
      date: "2026-10-07",
      customerName: "Lan",
      payment: { method: "wallet", status: PAYMENT_STATUS_FAILED },
    },
  ];
  assert.deepEqual(filterPayments(payments, {
    method: "wallet",
    status: PAYMENT_STATUS_PAID,
    dateField: "booking",
    dateFrom: "2026-10-01",
    dateTo: "2026-10-04",
    query: "lan",
  }).map((payment) => payment.id), [1]);
  assert.deepEqual(filterPayments(payments, {
    dateField: "payment",
    dateFrom: "2026-10-03",
    dateTo: "2026-10-03",
  }).map((payment) => payment.id), [1]);
  assert.deepEqual(filterPayments(payments, {
    dateFrom: "2026-10-10",
    dateTo: "2026-10-01",
  }), []);
});

test("payment CSV includes Excel BOM and escapes formula-leading values", () => {
  const csv = buildPaymentCsv([{
    id: 4,
    date: "2026-10-01",
    customerName: "=HYPERLINK(\"bad\")",
    customerPhone: "+84900000000",
    price: 100000,
    payment: { status: PAYMENT_STATUS_PENDING },
  }]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"'\+84900000000"/);
  assert.match(csv, /"Giá dịch vụ"/);
});

test("admin payment statistics separate collected and outstanding amounts", () => {
  const stats = getPaymentStatistics([
    { price: 100000, shipping: { totalFee: 15000 }, payment: { status: PAYMENT_STATUS_PAID, amount: 115000 } },
    { price: 50000, payment: { status: "paid", amount: 45000 } },
    { price: 80000, shipping: { totalFee: 10000 }, payment: { status: PAYMENT_STATUS_UNPAID, amount: 90000 } },
    { price: 25000, payment: { status: PAYMENT_STATUS_UNPAID } },
  ]);
  assert.deepEqual(stats, {
    receivedRevenue: 160000,
    outstandingAmount: 115000,
    paidTransactions: 2,
    unpaidTransactions: 2,
    failedTransactions: 0,
    refundedTransactions: 0,
  });
  assert.deepEqual(getPaymentStatistics([]), {
    receivedRevenue: 0,
    outstandingAmount: 0,
    paidTransactions: 0,
    unpaidTransactions: 0,
    failedTransactions: 0,
    refundedTransactions: 0,
  });
});

test("payment statuses normalize legacy values and allow only valid admin transitions", () => {
  assert.equal(getPaymentStatus({ payment: { status: "Chưa thanh toán" } }), PAYMENT_STATUS_PENDING);
  assert.equal(getPaymentStatus({ payment: { status: "failed" } }), PAYMENT_STATUS_FAILED);
  assert.equal(getPaymentStatus({ payment: { status: "refunded" } }), PAYMENT_STATUS_REFUNDED);
  assert.equal(getPaymentStatusClass(PAYMENT_STATUS_FAILED), "is-failed");
  assert.equal(getPaymentStatusClass(PAYMENT_STATUS_REFUNDED), "is-refunded");

  const pending = { id: 31, price: 80000, payment: { status: PAYMENT_STATUS_PENDING } };
  const failed = updatePaymentStatus(pending, PAYMENT_STATUS_FAILED, "admin", "2026-10-22T10:00:00.000Z");
  assert.equal(getPaymentStatus(failed), PAYMENT_STATUS_FAILED);
  assert.equal(failed.payment.failedBy, "admin");
  assert.equal(getPaymentStatus(updatePaymentStatus(failed, PAYMENT_STATUS_PENDING)), PAYMENT_STATUS_PENDING);
  const paid = confirmPaymentReceived(pending, "admin", "2026-10-22T11:00:00.000Z");
  const refunded = updatePaymentStatus(paid, PAYMENT_STATUS_REFUNDED, "admin", "2026-10-22T12:00:00.000Z");
  assert.equal(getPaymentStatus(refunded), PAYMENT_STATUS_REFUNDED);
  assert.equal(refunded.payment.refundedBy, "admin");
  assert.equal(updatePaymentStatus(pending, PAYMENT_STATUS_REFUNDED), null);
  assert.equal(updatePaymentStatus(refunded, PAYMENT_STATUS_PAID), null);
});

test("payment statistics keep failed amounts outstanding and exclude refunds from revenue", () => {
  assert.deepEqual(getPaymentStatistics([
    { price: 100, payment: { status: PAYMENT_STATUS_PAID } },
    { price: 50, payment: { status: PAYMENT_STATUS_PENDING } },
    { price: 25, payment: { status: PAYMENT_STATUS_FAILED } },
    { price: 10, payment: { status: PAYMENT_STATUS_REFUNDED } },
  ]), {
    receivedRevenue: 100,
    outstandingAmount: 75,
    paidTransactions: 1,
    unpaidTransactions: 1,
    failedTransactions: 1,
    refundedTransactions: 1,
  });
});
