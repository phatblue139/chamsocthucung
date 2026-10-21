import { parseHTML } from "linkedom";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "C:\\chamsocthucung";
const html = fs.readFileSync(path.join(ROOT, "user.html"), "utf8");
const { window, document } = parseHTML(html);

class MemoryStorage {
  values = new Map();
  getItem(k) { return this.values.has(k) ? this.values.get(k) : null; }
  setItem(k, v) { this.values.set(k, String(v)); }
  removeItem(k) { this.values.delete(k); }
}
const storage = new MemoryStorage();
global.window = window; global.document = document; global.localStorage = storage;
global.location = { replace() {}, href: "http://localhost/user.html", pathname: "/user.html" };
window.localStorage = storage; window.location = global.location; window.scrollTo = () => {};

document.querySelectorAll("form").forEach((f) => {
  if (!f.elements) Object.defineProperty(f, "elements", { value: { namedItem: (n) => f.querySelector(`[name="${n}"]`) } });
  f.checkValidity = () => true; f.reportValidity = () => true;
});
document.querySelectorAll("select").forEach((sel) => {
  let backing = sel.value;
  try { Object.defineProperty(sel, "value", { configurable: true, get() { return backing; }, set(v) { backing = v; } }); } catch (e) {}
});

storage.setItem("neko:user", JSON.stringify({ id: 1, username: "user1", fullName: "User One", phone: "0900000000" }));
storage.setItem("neko:users", JSON.stringify([{ id: 1, username: "user1", password: "x", fullName: "User One", phone: "0900000000" }]));
storage.setItem("neko:pets", JSON.stringify([
  { id: 1, name: "Miu", species: "Mèo", size: "medium", ownerUsername: "user1", ownerPhone: "0900000000" },
  { id: 2, name: "Milu", species: "Chó", size: "large", ownerUsername: "user1", ownerPhone: "0900000000" },
  { id: 3, name: "Box", species: "Chó", size: "small", ownerUsername: "user1", ownerPhone: "0900000000" },
]));
storage.setItem("neko:addresses", JSON.stringify([]));
storage.setItem("careSchedules", JSON.stringify([]));

await import(pathToFileURL(path.join(ROOT, "src", "user.js")).href);
console.log("LOADED");

const cbs = () => Array.from(document.querySelectorAll('#userPetSelect input[name="petIds"]'));
const state = () => cbs().map((c) => `${c.value}:${c.checked}`).join(" ");

console.log("initial:", state());
cbs()[0].checked = true; cbs()[0].dispatchEvent(new window.Event("change", { bubbles: true }));
console.log("after check pet1:", state());
cbs()[1].checked = true; cbs()[1].dispatchEvent(new window.Event("change", { bubbles: true }));
console.log("after check pet2:", state());

// now click the service button of pet3
const buttons = document.querySelectorAll("#userPetSelect .user-pet-choice-service");
console.log("service buttons:", buttons.length);
buttons[2].dispatchEvent(new window.Event("click", { bubbles: true }));
console.log("after clicking pet3 service button:", state());
