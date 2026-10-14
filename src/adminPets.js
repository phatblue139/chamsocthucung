import { getAllUsers, isAdminLoggedIn, logout } from "./auth.js";
import {
  filterPets
} from "./adminData.js";

import {
  getNextPetId,
  loadPets,
  PET_STORAGE_KEY,
  savePets
} from "./petData.js";

// Kiểm tra quyền quản trị
if (!isAdminLoggedIn()) {
  location.replace("/");
} else {
  initPetManagement();
}

function initPetManagement() {
  const form = document.getElementById("petForm");
  const petIdInput = document.getElementById("petId");
  const nameInput = document.getElementById("petName");
  const speciesInput = document.getElementById("petSpecies");
  const breedInput = document.getElementById("petBreed");
  const ageInput = document.getElementById("petAge");
  const ownerInput = document.getElementById("petOwner");
  const userIdInput = document.getElementById("petUserId");
  const genderInput = document.getElementById("petGender");
  const weightInput = document.getElementById("petWeight");
  const statusInput = document.getElementById("petStatus");

  const searchInput = document.getElementById("petSearch");
  const speciesFilter = document.getElementById("speciesFilter");
  const list = document.getElementById("petList");
  const count = document.getElementById("petCount");
  const empty = document.getElementById("petEmpty");
  const saveButton = document.getElementById("petSaveButton");
  const cancelButton = document.getElementById("petCancelButton");
  const message = document.getElementById("petMessage");

  const detailDialog = document.getElementById("petDetailDialog");
  const detailContent = document.getElementById("petDetailContent");
  const closeDetailButton = document.getElementById("closeDetailButton");

  if (!form || !list) {
    console.error("Không tìm thấy form hoặc danh sách thú cưng.");
    return;
  }

  let pets = loadPets();

  // Chỉ chọn tài khoản người dùng, không cho gán thú cưng vào tài khoản quản trị.
  function renderUserOptions(selectedId = "") {
    if (!userIdInput) return;
    userIdInput.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn tài khoản --";
    userIdInput.appendChild(placeholder);
    getAllUsers().forEach((user) => {
      const option = document.createElement("option");
      option.value = String(user.id);
      option.textContent = `${user.fullName || user.username} (@${user.username})`;
      userIdInput.appendChild(option);
    });
    userIdInput.value = selectedId;
  }
  renderUserOptions();

  // Đăng xuất quản trị viên
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    location.replace("/");
  });

  // Kiểm tra dữ liệu
  function validatePet() {
    const name = nameInput.value.trim();
    const species = speciesInput.value;
    const ageText = ageInput.value.trim();
    const age = Number(ageText);

    if (!name) {
      showMessage("Vui lòng nhập tên thú cưng.", "error");
      nameInput.focus();
      return false;
    }

    if (!species) {
      showMessage("Vui lòng chọn loài thú cưng.", "error");
      speciesInput.focus();
      return false;
    }

    if (!userIdInput?.value) {
      showMessage("Vui lòng chọn tài khoản sở hữu thú cưng.", "error");
      userIdInput?.focus();
      return false;
    }

    if (
      ageText === "" ||
      !Number.isInteger(age) ||
      age < 0 ||
      age > 40
    ) {
      showMessage("Tuổi phải là số nguyên từ 0 đến 40.", "error");
      ageInput.focus();
      return false;
    }

    return true;
  }

  // Lấy dữ liệu từ form
  function getFormPet() {
    return {
      name: nameInput.value.trim(),
      species: speciesInput.value,
      breed: breedInput.value.trim(),
      age: Number(ageInput.value),
      owner: ownerInput.value.trim(),
      userId: userIdInput.value,
      gender: genderInput?.value || "",
      weight: Number(weightInput?.value || 0),
      status: statusInput.value
    };
  }

  // Thêm mới hoặc cập nhật thú cưng
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validatePet()) return;

    const id = petIdInput.value.trim();
    const formPet = getFormPet();

    // Cập nhật thú cưng hiện có
    if (id) {
      const index = pets.findIndex(
        (pet) => String(pet.petId) === String(id)
      );

      if (index === -1) {
        showMessage("Không tìm thấy thú cưng cần sửa.", "error");
        return;
      }

      const oldPet = pets[index];

      pets[index] = {
        ...oldPet,
        ...formPet,

        // Giữ nguyên mã và tài khoản sở hữu
        petId: oldPet.petId,
        userId: formPet.userId,
        gender: formPet.gender,
        weight: formPet.weight,
        image: oldPet.image || ""
      };

      if (!savePets(pets)) {
        pets[index] = oldPet;
        showMessage("Không thể lưu thay đổi.", "error");
        return;
      }

      resetForm();
      render();
      showMessage("Cập nhật thú cưng thành công.", "success");
      return;
    }

    // Thêm thú cưng với mã riêng và liên kết đúng tài khoản sở hữu.
    const selectedUser = getAllUsers().find((user) => String(user.id) === formPet.userId);
    const newPet = {
      petId: getNextPetId(pets),
      userId: formPet.userId,
      name: formPet.name,
      species: formPet.species,
      breed: formPet.breed,
      age: formPet.age,
      owner: formPet.owner || selectedUser?.fullName || selectedUser?.username || "",
      gender: formPet.gender,
      weight: formPet.weight,
      image: "",
      status: formPet.status
    };

    pets.push(newPet);

    if (!savePets(pets)) {
      pets.pop();
      showMessage("Không thể lưu thú cưng.", "error");
      return;
    }

    resetForm();
    render();

    showMessage(
      "Đã thêm thú cưng. Cần liên kết tài khoản sở hữu để người dùng thấy thú cưng này khi đăng ký lịch.",
      "success"
    );
  });

  // Xử lý xem chi tiết, sửa và xóa
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const pet = pets.find(
      (item) => String(item.petId) === String(button.dataset.id)
    );

    if (!pet) {
      showMessage("Không tìm thấy thú cưng.", "error");
      return;
    }

    const action = button.dataset.action;

    if (action === "detail") {
      showDetail(pet);
      return;
    }

    if (action === "edit") {
      petIdInput.value = pet.petId;
      nameInput.value = pet.name || "";
      speciesInput.value = pet.species || "";
      breedInput.value = pet.breed || "";
      ageInput.value = String(pet.age ?? "");
      ownerInput.value = pet.owner || "";
      renderUserOptions(String(pet.userId || ""));
      if (genderInput) genderInput.value = pet.gender || "";
      if (weightInput) weightInput.value = String(pet.weight ?? "");
      statusInput.value = pet.status || "Đang chăm sóc";

      saveButton.textContent = "Lưu thay đổi";
      cancelButton.hidden = false;

      showMessage("Đang sửa thông tin thú cưng.", "");
      nameInput.focus();

      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      return;
    }

    if (action === "delete") {
      const confirmed = confirm(
        `Bạn có chắc muốn xóa thú cưng "${pet.name}" không?`
      );

      if (!confirmed) return;

      const oldPets = pets;

      pets = pets.filter(
        (item) => String(item.petId) !== String(pet.petId)
      );

      if (!savePets(pets)) {
        pets = oldPets;
        showMessage("Không thể xóa thú cưng.", "error");
        return;
      }

      if (String(petIdInput.value) === String(pet.petId)) {
        resetForm();
      }

      render();
      showMessage("Đã xóa thú cưng.", "success");
    }
  });

  // Hiển thị thông tin chi tiết
  function showDetail(pet) {
    if (!detailDialog || !detailContent) return;

    detailContent.replaceChildren();

    const details = [
      ["Mã thú cưng", pet.petId],
      ["Mã tài khoản", pet.userId],
      ["Tên", pet.name],
      ["Loài", pet.species],
      ["Giống", pet.breed],
      ["Tuổi", `${pet.age} tuổi`],
      ["Chủ nuôi", pet.owner],
      ["Giới tính", pet.gender],
      ["Cân nặng", pet.weight ? `${pet.weight} kg` : ""],
      ["Trạng thái", pet.status]
    ];

    details.forEach(([label, value]) => {
      const paragraph = document.createElement("p");
      const strong = document.createElement("strong");

      strong.textContent = `${label}: `;
      paragraph.appendChild(strong);

      paragraph.appendChild(
        document.createTextNode(
          value === undefined || value === null || value === ""
            ? "Chưa có thông tin"
            : String(value)
        )
      );

      detailContent.appendChild(paragraph);
    });

    if (!detailDialog.open) {
      detailDialog.showModal();
    }
  }

  closeDetailButton?.addEventListener("click", () => {
    detailDialog?.close();
  });

  // Tìm kiếm và lọc
  searchInput?.addEventListener("input", render);
  speciesFilter?.addEventListener("change", render);

  // Hủy sửa
  cancelButton?.addEventListener("click", () => {
    resetForm();
    showMessage("", "");
  });

  // Đồng bộ dữ liệu từ tab khác
  window.addEventListener("storage", (event) => {
    if (event.key === PET_STORAGE_KEY) {
      pets = loadPets();
      render();
    }
  });

  function resetForm() {
    form.reset();
    petIdInput.value = "";
    renderUserOptions();
    saveButton.textContent = "Thêm thú cưng";

    if (cancelButton) {
      cancelButton.hidden = true;
    }
  }

  function showMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = "user-form-message";

    if (type) {
      message.classList.add(type);
    }
  }

  function createCell(value) {
    const cell = document.createElement("td");

    cell.textContent =
      value === undefined || value === null || value === ""
        ? "—"
        : String(value);

    return cell;
  }

  function createActionButton(action, label, className, petId) {
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = String(petId);
    button.className = className;
    button.textContent = label;

    return button;
  }

  // Hiển thị danh sách thú cưng
  function render() {
    pets = loadPets();

    const rows = filterPets(
      pets,
      searchInput?.value || "",
      speciesFilter?.value || ""
    );

    list.replaceChildren();

    if (count) {
      count.textContent =
        `${pets.length} hồ sơ · ${rows.length} đang hiển thị`;
    }

    if (empty) {
      empty.hidden = rows.length > 0;
    }

    rows.forEach((pet) => {
      const row = document.createElement("tr");

      row.append(
        createCell(pet.petId),
        createCell(pet.name),
        createCell(pet.species),
        createCell(pet.breed),
        createCell(pet.age),
        createCell(pet.owner),
        createCell(pet.userId),
        createCell(pet.status)
      );

      const actionCell = document.createElement("td");
      const actions = document.createElement("div");

      actions.className = "care-actions";

      actions.append(
        createActionButton(
          "detail",
          "Chi tiết",
          "care-btn-edit",
          pet.petId
        ),
        createActionButton(
          "edit",
          "Sửa",
          "care-btn-edit",
          pet.petId
        ),
        createActionButton(
          "delete",
          "Xóa",
          "care-btn-delete",
          pet.petId
        )
      );

      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      list.appendChild(row);
    });
  }

  render();
}
