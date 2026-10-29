import { isAdminLoggedIn, logout } from "./auth.js";
import { formatCurrency } from "./careScheduleData.js";
import {
  loadServiceCatalog,
  PET_SITTING_CAGE_TYPES,
  PET_SITTING_DAILY_RATE,
  PET_SITTING_HOURLY_RATE,
  saveServiceCatalog,
} from "./serviceCatalogData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
  throw new Error("Không có quyền truy cập trang này");
}

const form = document.getElementById("serviceForm");
const idInput = document.getElementById("serviceId");
const nameInput = document.getElementById("serviceName");
const priceInput = document.getElementById("servicePrice");
const iconInput = document.getElementById("serviceIcon");
const activeInput = document.getElementById("serviceActive");
const descriptionInput = document.getElementById("serviceDescription");
const saveButton = document.getElementById("serviceSaveButton");
const cancelButton = document.getElementById("serviceCancelButton");
const message = document.getElementById("serviceMessage");
const list = document.getElementById("serviceList");
const empty = document.getElementById("serviceEmpty");
const count = document.getElementById("serviceCount");
let services = loadServiceCatalog();

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const editingId = idInput.value;
  const name = nameInput.value.trim();
  const duplicate = services.some((service) =>
    service.id !== editingId && service.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
  );
  if (duplicate) {
    showMessage("Tên dịch vụ đã tồn tại. Vui lòng chọn tên khác.", "error");
    nameInput.focus();
    return;
  }

  const editingService = editingId ? services.find((service) => service.id === editingId) : null;
  if (editingId && (!editingService || editingService.id === "pet-sitting")) {
    resetForm();
    showMessage("Không tìm thấy dịch vụ có thể chỉnh sửa.", "error");
    render();
    return;
  }

  const service = {
    ...(editingService || {}),
    id: editingId || createServiceId(name),
    value: name,
    name,
    description: descriptionInput.value.trim(),
    icon: iconInput.value.trim() || "🐾",
    price: Number(priceInput.value),
    unit: "lần",
    active: activeInput.value === "true",
  };
  const next = editingId
    ? services.map((item) => item.id === editingId ? service : item)
    : [...services.filter((item) => item.id !== "pet-sitting"), service, ...services.filter((item) => item.id === "pet-sitting")];

  if (!saveServiceCatalog(next)) {
    showMessage("Không thể lưu danh mục dịch vụ. Vui lòng thử lại.", "error");
    return;
  }

  services = loadServiceCatalog();
  resetForm();
  render();
  showMessage(editingId ? "Đã cập nhật dịch vụ." : "Đã thêm dịch vụ.", "success");
});

cancelButton.addEventListener("click", resetForm);
list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const service = services.find((item) => item.id === button.dataset.id);
  if (!service) return;

  if (button.dataset.action === "edit") {
    idInput.value = service.id;
    nameInput.value = service.name;
    priceInput.value = String(service.price);
    iconInput.value = service.icon || "";
    activeInput.value = String(service.active);
    descriptionInput.value = service.description;
    saveButton.textContent = "Lưu thay đổi";
    cancelButton.hidden = false;
    nameInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (button.dataset.action === "delete") {
    if (service.id === "pet-sitting") return;
    if (!confirm(`Xóa dịch vụ "${service.name}" khỏi danh mục? Lịch đã tạo sẽ không bị thay đổi.`)) return;
    const next = services.filter((item) => item.id !== service.id);
    if (!saveServiceCatalog(next)) {
      showMessage("Không thể xóa dịch vụ. Vui lòng thử lại.", "error");
      return;
    }
    services = loadServiceCatalog();
    if (idInput.value === service.id) resetForm();
    render();
    showMessage(`Đã xóa dịch vụ "${service.name}".`, "success");
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== "neko:serviceCatalog") return;
  services = loadServiceCatalog();
  render();
});

function createServiceId(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "service";
  const baseId = slug === "pet-sitting" ? "service-pet-sitting" : slug;
  let id = baseId;
  let suffix = 2;
  while (services.some((service) => service.id === id)) id = `${baseId}-${suffix++}`;
  return id;
}

function resetForm() {
  form.reset();
  idInput.value = "";
  activeInput.value = "true";
  saveButton.textContent = "Thêm dịch vụ";
  cancelButton.hidden = true;
}

function render() {
  count.textContent = `${services.length} dịch vụ`;
  list.replaceChildren();
  empty.hidden = services.length > 0;

  services.forEach((service) => {
    const row = document.createElement("tr");
    const serviceCell = document.createElement("td");
    serviceCell.textContent = `${service.icon || "🐾"} ${service.name}`;
    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = service.description || "—";
    const priceCell = document.createElement("td");
    priceCell.textContent = service.id === "pet-sitting"
      ? `${formatCurrency(PET_SITTING_HOURLY_RATE)}/giờ, ${formatCurrency(PET_SITTING_DAILY_RATE)}/ngày + phí chuồng (${PET_SITTING_CAGE_TYPES.map((cage) => formatCurrency(cage.fee)).join(", ")})`
      : `${formatCurrency(service.price) || "0đ"}/${service.unit || "lần"}`;
    const statusCell = document.createElement("td");
    statusCell.textContent = service.active ? "Đang hoạt động" : "Tạm ẩn";
    const actionCell = document.createElement("td");
    if (service.id === "pet-sitting") {
      actionCell.textContent = "Dịch vụ đặc biệt";
    } else {
      actionCell.append(
        createActionButton("Sửa", "edit", service.id, "care-btn-edit"),
        createActionButton("Xóa", "delete", service.id, "care-btn-delete"),
      );
    }
    row.append(serviceCell, descriptionCell, priceCell, statusCell, actionCell);
    list.appendChild(row);
  });
}

function createActionButton(label, action, id, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `care-btn ${className}`;
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `user-form-message ${type}`;
}

render();
