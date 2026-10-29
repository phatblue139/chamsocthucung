import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("service catalog changes are persisted and update booking prices", async () => {
  globalThis.localStorage = new MemoryStorage();
  const catalogData = await import("../src/serviceCatalogData.js");
  const scheduleData = await import("../src/careScheduleData.js");
  const catalog = catalogData.loadServiceCatalog();
  const bathing = catalog.find((service) => service.id === "bath");
  assert.equal(bathing.price, 100000);

  const next = [
    ...catalog.map((service) => service.id === "bath" ? { ...service, price: 125000 } : service),
    {
      id: "nail-polish",
      value: "Sơn móng",
      name: "Sơn móng",
      description: "Chăm sóc móng cho thú cưng.",
      icon: "🐾",
      price: 75000,
      unit: "lần",
      active: true,
    },
  ];
  assert.equal(catalogData.saveServiceCatalog(next), true);
  assert.equal(scheduleData.getCareTypePrice("Tắm"), 125000);
  assert.equal(scheduleData.getCareTypePrice("Sơn móng"), 75000);
  assert.equal(scheduleData.isKnownCareType("Sơn móng"), true);
  assert.equal(catalogData.loadServiceCatalog().some((service) => service.id === "pet-sitting"), true);

  assert.equal(catalogData.saveServiceCatalog(next.filter((service) => service.id !== "pet-sitting")), true);
  assert.equal(catalogData.loadServiceCatalog().some((service) => service.id === "pet-sitting"), true);
});
