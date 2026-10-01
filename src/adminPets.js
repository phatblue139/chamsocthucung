import { isAdminLoggedIn, logout } from "./auth.js";
import { filterPets } from "./adminData.js";
import { getNextPetId, loadPets, PET_STORAGE_KEY, savePets } from "./petData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
} else {
  const form = document.getElementById("petForm");
  const petIdInput = document.getElementById("petId");
  const nameInput = document.getElementById("petName");
  const speciesInput = document.getElementById("petSpecies");
  const breedInput = document.getElementById("petBreed");
  const ageInput = document.getElementById("petAge");
  const ownerInput = document.getElementById("petOwner");
  const statusInput = document.getElementById("petStatus");
  const searchInput = document.getElementById("petSearch");
  const speciesFilter = document.getElementById("speciesFilter");
  const list = document.getElementById("petList");
  const count = document.getElementById("petCount");
  const empty = document.getElementById("petEmpty");
  const saveButton = document.getElementById("petSaveButton");
  const cancelButton = document.getElementById("petCancelButton");
  const message = document.getElementById("petMessage");
  let pets = loadPets();

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    location.replace("/");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const id = Number(petIdInput.value);
    const pet = {
      id: id || getNextPetId(pets),
      name: nameInput.value.trim(),
      species: speciesInput.value,
      breed: breedInput.value.trim(),
      age: Number(ageInput.value),
      owner: ownerInput.value.trim(),
      status: statusInput.value,
    };
    const nextPets = id ? pets.map((item) => item.id === id ? pet : item) : [...pets, pet];

    if (!savePets(nextPets)) {
      showMessage("Không thể lưu hồ sơ thú cưng. Vui lòng thử lại.", "error");
      return;
    }

    pets = nextPets;
    resetForm();
    render();
    showMessage(id ? "Đã cập nhật hồ sơ." : "Đã thêm thú cưng.", "success");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const pet = pets.find((item) => Number(item.id) === Number(button.dataset.id));
    if (!pet) return;

    if (button.dataset.action === "edit") {
      petIdInput.value = pet.id;
      nameInput.value = pet.name || "";
      speciesInput.value = pet.species || "Chó";
      breedInput.value = pet.breed || "";
      ageInput.value = String(pet.age ?? 0);
      ownerInput.value = pet.owner || "";
      statusInput.value = pet.status || "Chờ lịch";
      saveButton.textContent = "Lưu thay đổi";
      cancelButton.hidden = false;
      nameInput.focus();
    } else if (button.dataset.action === "delete" && confirm(`Xóa hồ sơ thú cưng ${pet.name}?`)) {
      const nextPets = pets.filter((item) => Number(item.id) !== Number(pet.id));
      if (!savePets(nextPets)) {
        showMessage("Không thể xóa hồ sơ. Vui lòng thử lại.", "error");
        return;
      }
      pets = nextPets;
      render();
      showMessage("Đã xóa hồ sơ thú cưng.", "success");
    }
  });

  searchInput.addEventListener("input", render);
  speciesFilter.addEventListener("change", render);
  cancelButton.addEventListener("click", resetForm);
  window.addEventListener("storage", (event) => {
    if (event.key !== PET_STORAGE_KEY) return;
    pets = loadPets();
    render();
  });

  function resetForm() {
    form.reset();
    petIdInput.value = "";
    saveButton.textContent = "Thêm thú cưng";
    cancelButton.hidden = true;
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
    return cell;
  }

  function render() {
    const rows = filterPets(pets, searchInput.value, speciesFilter.value);
    list.replaceChildren();
    count.textContent = `${pets.length} hồ sơ · ${rows.length} đang hiển thị`;
    empty.hidden = rows.length > 0;

    rows.forEach((pet) => {
      const row = document.createElement("tr");
      row.append(createCell(pet.name), createCell(pet.species), createCell(pet.breed), createCell(pet.age), createCell(pet.owner), createCell(pet.status));
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "care-actions";
      for (const [action, label, className] of [["edit", "Sửa", "care-btn-edit"], ["delete", "Xóa", "care-btn-delete"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = action;
        button.dataset.id = String(pet.id);
        button.className = className;
        button.textContent = label;
        actions.append(button);
      }
      actionCell.append(actions);
      row.append(actionCell);
      list.append(row);
    });
  }

  render();
}
