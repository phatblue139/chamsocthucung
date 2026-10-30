import { isAdminLoggedIn, logout } from "./auth.js";
import { formatCurrency } from "./careScheduleData.js";
import {
  ADDRESS_STORAGE_KEY,
  SHIPMENT_STATUS,
  SHIPMENT_STORAGE_KEY,
  getAddressStorage,
  getShipmentNextStatuses,
  getShipmentStorage,
  saveShipmentStorage,
  updateShipmentStatus,
} from "./shippingData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
  throw new Error("Không có quyền truy cập trang này");
}

const shipmentList = document.getElementById("shipmentList");
const shipmentEmpty = document.getElementById("shipmentEmpty");
const shipmentCount = document.getElementById("shipmentCount");
const shipmentMessage = document.getElementById("shipmentMessage");

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  logout();
  location.replace("/");
});

shipmentList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='shipment-status']");
  if (!button) return;
  setShipmentStatus(button.dataset.shipmentId, button.dataset.status);
});

window.addEventListener("storage", (event) => {
  if ([SHIPMENT_STORAGE_KEY, ADDRESS_STORAGE_KEY].includes(event.key)) render();
});

render();

function render() {
  if (!shipmentList || !shipmentEmpty) return;

  const shipments = getShipmentStorage().sort((first, second) => {
    const firstCreatedAt = Date.parse(first.createdAt || "");
    const secondCreatedAt = Date.parse(second.createdAt || "");
    const validFirstDate = Number.isFinite(firstCreatedAt);
    const validSecondDate = Number.isFinite(secondCreatedAt);

    if (validFirstDate && validSecondDate && firstCreatedAt !== secondCreatedAt) {
      return secondCreatedAt - firstCreatedAt;
    }
    if (validFirstDate !== validSecondDate) return validFirstDate ? -1 : 1;
    return Number(second.id) - Number(first.id);
  });
  const addresses = getAddressStorage();
  shipmentList.replaceChildren();
  shipmentCount.textContent = `${shipments.length} đơn vận chuyển`;

  shipments.forEach((shipment) => {
    const row = document.createElement("tr");
    const customer = `${shipment.customerName || shipment.customerUsername || "Khách hàng"}${shipment.customerPhone ? ` · ${shipment.customerPhone}` : ""}`;
    const pickup = addresses.find((address) =>
      String(address.id) === String(shipment.pickupAddressId) &&
      String(address.ownerUsername) === String(shipment.customerUsername),
    );
    const returnAddress = addresses.find((address) =>
      String(address.id) === String(shipment.returnAddressId) &&
      String(address.ownerUsername) === String(shipment.customerUsername),
    );
    const routeParts = [
      pickup
        ? [pickup.houseNumber, pickup.district, pickup.city].filter(Boolean).join(", ")
        : "Không tìm thấy địa chỉ đón",
      shipment.centerName || "Trung tâm",
    ];
    if (shipment.transportType === "round-trip") {
      routeParts.push(returnAddress
        ? [returnAddress.houseNumber, returnAddress.district, returnAddress.city].filter(Boolean).join(", ")
        : "Không tìm thấy địa chỉ trả");
    }

    const petLabel = Array.isArray(shipment.petNames) && shipment.petNames.length
      ? shipment.petNames.join(", ")
      : shipment.petName || "Thú cưng";
    [
      `#${shipment.id}`,
      customer,
      petLabel,
      routeParts.join(" → "),
      `${shipment.distanceKm ?? "—"} km (mô phỏng) · ${formatCurrency(shipment.totalFee) || "—"}`,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const currentStatus = shipment.status || SHIPMENT_STATUS.PENDING;
    const badge = document.createElement("span");
    badge.className = "care-status-badge";
    badge.textContent = currentStatus;
    statusCell.appendChild(badge);
    (shipment.statusHistory || []).forEach((entry) => {
      const history = document.createElement("small");
      history.className = "shipment-history-entry";
      history.textContent = `${entry.status} · ${formatDateTime(entry.changedAt)}`;
      statusCell.appendChild(history);
    });
    row.appendChild(statusCell);

    const actions = document.createElement("td");
    getShipmentNextStatuses(currentStatus).forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = status === SHIPMENT_STATUS.CANCELLED ? "care-btn-delete" : "care-btn-confirm";
      button.dataset.action = "shipment-status";
      button.dataset.shipmentId = String(shipment.id);
      button.dataset.status = status;
      button.textContent = status;
      actions.appendChild(button);
    });
    if (!actions.childElementCount) actions.textContent = "Không còn bước tiếp theo";
    row.appendChild(actions);
    shipmentList.appendChild(row);
  });

  shipmentEmpty.hidden = shipments.length > 0;
}

function setShipmentStatus(shipmentId, nextStatus) {
  const shipments = getShipmentStorage();
  const shipment = shipments.find((item) => String(item.id) === String(shipmentId));
  if (!shipment) {
    showMessage("Không tìm thấy đơn vận chuyển. Hãy tải lại danh sách.", "error");
    return;
  }

  const updated = updateShipmentStatus(shipment, nextStatus, "admin");
  if (!updated) {
    showMessage("Chuyển trạng thái vận chuyển không hợp lệ. Hãy tải lại danh sách.", "error");
    return;
  }

  const nextShipments = shipments.map((item) =>
    String(item.id) === String(shipmentId) ? updated : item,
  );
  if (!saveShipmentStorage(nextShipments)) {
    showMessage("Không thể lưu trạng thái vận chuyển. Vui lòng thử lại.", "error");
    return;
  }

  render();
  showMessage(`Đã cập nhật đơn vận chuyển #${shipmentId}: ${nextStatus}.`, "success");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Thời gian không hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function showMessage(text, type) {
  if (!shipmentMessage) return;
  shipmentMessage.textContent = text;
  shipmentMessage.className = `user-form-message ${type}`;
}
