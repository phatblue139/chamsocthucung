import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentRole,
  login,
  logout,
  registerUser,
} from "../src/auth.js";
import { filterPets, getAdminStatistics } from "../src/adminData.js";

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
  ]);
  assert.deepEqual(stats, { totalPets: 2, unfinishedSchedules: 2, completedSchedules: 1 });
});
