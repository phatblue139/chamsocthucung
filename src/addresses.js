import "./style.css";
import { getCurrentUser } from "./auth.js";
import { initSiteHeader } from "./siteHeader.js";
import {
  ADDRESS_LOCATION_OPTIONS,
  getAddressAreaCode,
  getAddressStorage,
  saveAddressStorage,
} from "./shippingData.js";

initSiteHeader();

const currentUser = getCurrentUser();
if (!currentUser) {
  location.replace("/");
} else {
  initAddressManager(currentUser);
}

function initAddressManager(user) {
  const form = document.getElementById("addressForm");
  const formId = document.getElementById("addressId");
  const cityInput = document.getElementById("addressCity");
  const districtInput = document.getElementById("addressDistrict");
  const wardInput = document.getElementById("addressWard");
  const houseNumberInput = document.getElementById("addressHouseNumber");
  const detailInput = document.getElementById("addressDetail");
  const defaultInput = document.getElementById("addressDefault");
  const list = document.getElementById("addressList");
  const message = document.getElementById("addressMessage");
  const cancelBtn = document.getElementById("addressCancelBtn");

  populateCityOptions();
  cityInput?.addEventListener("change", () => {
    populateDistrictOptions();
    populateWardOptions();
  });
  districtInput?.addEventListener("change", () => populateWardOptions());
  renderAddresses();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const addresses = getAddressStorage();
    const editingId = String(formId?.value || "").trim();
    const existingAddress = editingId
      ? addresses.find((address) =>
        String(address.id) === editingId && String(address.ownerUsername) === String(user.username),
      )
      : null;
    if (editingId && !existingAddress) {
      showMessage("Không tìm thấy địa chỉ thuộc tài khoản của bạn.", "error");
      formId.value = "";
      return;
    }
    const cleaned = {
      id: editingId || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerUsername: user.username,
      city: String(cityInput.value || "").trim(),
      district: String(districtInput.value || "").trim(),
      ward: String(wardInput.value || "").trim(),
      houseNumber: String(houseNumberInput.value || "").trim(),
      detail: String(detailInput.value || "").trim(),
      areaCode: getAddressAreaCode(cityInput.value, districtInput.value),
      areaName: existingAddress?.areaName || "",
      isDefault: Boolean(defaultInput.checked),
      createdAt: existingAddress?.createdAt || new Date().toISOString(),
    };

    if (!cleaned.city || !cleaned.district || !cleaned.houseNumber) {
      showMessage("Vui lòng điền đầy đủ thông tin bắt buộc của địa chỉ.", "error");
      return;
    }

    if (!cleaned.areaCode) {
      showMessage("Khu vực đã chọn chưa có tuyến vận chuyển mô phỏng. Vui lòng chọn địa chỉ thuộc Hà Nội.", "error");
      return;
    }

    const next = editingId
      ? addresses.map((address) => String(address.id) === editingId && String(address.ownerUsername) === String(user.username)
        ? { ...address, ...cleaned }
        : address)
      : [...addresses, cleaned];

    if (cleaned.isDefault) {
      next.forEach((address) => {
        if (String(address.ownerUsername) === String(user.username)) {
          address.isDefault = String(address.id) === String(cleaned.id);
        }
      });
    }

    const onlyCurrentUser = next.filter((address) => String(address.ownerUsername) === String(user.username));
    if (!onlyCurrentUser.some((address) => address.isDefault)) {
      const defaultIdx = onlyCurrentUser.findIndex((address) => String(address.id) === String(cleaned.id));
      if (defaultIdx >= 0) onlyCurrentUser[defaultIdx].isDefault = true;
    }

    if (!saveAddressStorage(next)) {
      showMessage("Không thể lưu địa chỉ. Vui lòng thử lại.", "error");
      return;
    }

    form.reset();
    formId.value = "";
    populateDistrictOptions();
    populateWardOptions();
    showMessage(editingId ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới.", "success");
    renderAddresses();
  });

  list?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const allAddresses = getAddressStorage();
    const target = allAddresses.find((address) => String(address.id) === String(button.dataset.id));
    if (!target || String(target.ownerUsername) !== String(user.username)) return;

    if (button.dataset.action === "edit") {
      formId.value = target.id;
      populateCityOptions(target.city || "");
      populateDistrictOptions(target.district || "");
      populateWardOptions(target.ward || "");
      houseNumberInput.value = target.houseNumber || "";
      detailInput.value = target.detail || "";
      defaultInput.checked = Boolean(target.isDefault);
      showMessage("Đang chỉnh sửa địa chỉ đã chọn.", "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (button.dataset.action === "delete") {
      const confirmed = window.confirm("Xóa địa chỉ này khỏi danh sách đã lưu?");
      if (!confirmed) return;
      const next = allAddresses.filter((address) =>
        !(String(address.id) === String(target.id) && String(address.ownerUsername) === String(user.username)),
      );
      const remaining = next.filter((address) => String(address.ownerUsername) === String(user.username));
      if (!remaining.some((address) => address.isDefault) && remaining.length) {
        const defaultId = String(remaining[0].id);
        next.forEach((address) => {
          if (String(address.ownerUsername) === String(user.username)) {
            address.isDefault = String(address.id) === defaultId;
          }
        });
      }
      if (!saveAddressStorage(next)) {
        showMessage("Không thể xóa địa chỉ. Vui lòng thử lại.", "error");
        return;
      }
      if (formId.value === String(target.id)) {
        form.reset();
        formId.value = "";
        populateDistrictOptions();
        populateWardOptions();
      }
      showMessage("Đã xóa địa chỉ.", "success");
      renderAddresses();
    }

    if (button.dataset.action === "default") {
      const next = allAddresses.map((address) => (
        String(address.ownerUsername) === String(user.username)
          ? { ...address, isDefault: String(address.id) === String(target.id) }
          : address
      ));
      if (!saveAddressStorage(next)) {
        showMessage("Không thể đặt địa chỉ mặc định. Vui lòng thử lại.", "error");
        return;
      }
      showMessage("Đã đặt địa chỉ mặc định.", "success");
      renderAddresses();
    }
  });

  cancelBtn?.addEventListener("click", () => {
    form.reset();
    formId.value = "";
    populateDistrictOptions();
    populateWardOptions();
    showMessage("", "");
  });

  function renderAddresses() {
    const addresses = getAddressStorage().filter((address) => String(address.ownerUsername) === String(user.username));
    list.replaceChildren();

    if (!addresses.length) {
      const empty = document.createElement("p");
      empty.className = "care-empty";
      empty.textContent = "Bạn chưa lưu địa chỉ nào. Hãy thêm địa chỉ đón thú cưng để đặt ship.";
      list.appendChild(empty);
      return;
    }

    addresses.forEach((address) => {
      const card = document.createElement("article");
      card.className = "address-card";

      const main = document.createElement("div");
      main.className = "address-card-main";

      const title = document.createElement("div");
      title.className = "address-card-title";
      const addressLabel = document.createElement("span");
      addressLabel.textContent =
        [address.houseNumber, address.street || address.detail].filter(Boolean).join(", ") || "Địa chỉ chưa có thông tin";
      title.appendChild(addressLabel);
      if (address.isDefault) {
        const badge = document.createElement("span");
        badge.className = "address-default-badge";
        badge.textContent = "Mặc định";
        title.appendChild(badge);
      }

      const meta = document.createElement("div");
      meta.className = "address-card-meta";
      [
        [address.city, address.district, address.ward].filter(Boolean).join(" - ") || "Chưa có thông tin khu vực",
      ].forEach((value) => {
        const line = document.createElement("span");
        line.textContent = value;
        meta.appendChild(line);
      });

      main.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "address-card-actions";
      const editButton = createActionButton("edit", "Sửa");
      const removeButton = createActionButton("delete", "Xóa");
      const defaultButton = createActionButton("default", address.isDefault ? "Đã mặc định" : "Đặt mặc định");
      editButton.dataset.id = address.id;
      removeButton.dataset.id = address.id;
      defaultButton.dataset.id = address.id;
      defaultButton.disabled = address.isDefault;
      actions.append(editButton, removeButton, defaultButton);

      card.append(main, actions);
      list.appendChild(card);
    });
  }

  function createActionButton(action, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.textContent = label;
    button.className = action === "delete" ? "care-btn-delete" : action === "edit" ? "care-btn-edit" : "care-btn-confirm";
    return button;
  }

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }
}

function replaceOptions(select, values, placeholder, selectedValue = "") {
  if (!select) return;
  select.replaceChildren();
  const prompt = document.createElement("option");
  prompt.value = "";
  prompt.textContent = placeholder;
  select.appendChild(prompt);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (selectedValue && !values.includes(selectedValue)) {
    const legacyOption = document.createElement("option");
    legacyOption.value = selectedValue;
    legacyOption.textContent = selectedValue;
    select.appendChild(legacyOption);
  }
  select.value = selectedValue;
  select.disabled = values.length === 0 && !selectedValue;
}

function populateCityOptions(selectedCity = "") {
  const cityInput = document.getElementById("addressCity");
  replaceOptions(cityInput, ADDRESS_LOCATION_OPTIONS.map((location) => location.city), "-- Chọn tỉnh/thành phố --", selectedCity);
}

function populateDistrictOptions(selectedDistrict = "") {
  const cityInput = document.getElementById("addressCity");
  const districtInput = document.getElementById("addressDistrict");
  const location = ADDRESS_LOCATION_OPTIONS.find((item) => item.city === cityInput?.value);
  const districtNames = location?.districts.map((district) => district.name) || [];
  replaceOptions(districtInput, districtNames, "-- Chọn quận/huyện --", selectedDistrict);
}

function populateWardOptions(selectedWard = "") {
  const cityInput = document.getElementById("addressCity");
  const districtInput = document.getElementById("addressDistrict");
  const wardInput = document.getElementById("addressWard");
  const location = ADDRESS_LOCATION_OPTIONS.find((item) => item.city === cityInput?.value);
  const district = location?.districts.find((item) => item.name === districtInput?.value);
  replaceOptions(wardInput, district?.wards || [], "-- Chọn phường/xã (không bắt buộc) --", selectedWard);
}
