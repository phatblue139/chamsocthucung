import { isAdminLoggedIn, logout } from "./auth.js";
import {
  filterPets,
  getPetScheduleServices,
  getPetSchedules,
  getPetStatistics,
  getUnresolvedPetSchedules,
  paginatePets,
  sortPets,
  validatePetFormData,
} from "./adminData.js";
import { getScheduleStatusClass, loadSchedules, resolveScheduleStatus, SCHEDULE_STORAGE_KEY } from "./careScheduleData.js";
import { getNextPetId, getPetCode, loadPets, PET_STORAGE_KEY, savePets } from "./petData.js";

if (!isAdminLoggedIn()) {
  location.replace("/");
} else {
  const form = document.getElementById("petForm");
  const petIdInput = document.getElementById("petId");
  const petCodeInput = document.getElementById("petCode");
  const nameInput = document.getElementById("petName");
  const speciesInput = document.getElementById("petSpecies");
  const breedInput = document.getElementById("petBreed");
  const ageInput = document.getElementById("petAge");
  const weightInput = document.getElementById("petWeight");
  const ownerInput = document.getElementById("petOwner");
  const statusInput = document.getElementById("petStatus");
  const avatarInput = document.getElementById("petAvatar");
  const avatarPreview = document.getElementById("petAvatarPreview");
  const avatarPlaceholder = document.getElementById("petAvatarPlaceholder");
  const avatarRemoveButton = document.getElementById("petAvatarRemove");
  const createdAtInput = document.getElementById("petCreatedAt");
  const searchInput = document.getElementById("petSearch");
  const speciesFilter = document.getElementById("speciesFilter");
  const statusFilter = document.getElementById("statusFilter");
  const sortInput = document.getElementById("petSort");
  const list = document.getElementById("petList");
  const count = document.getElementById("petCount");
  const empty = document.getElementById("petEmpty");
  const pagination = document.getElementById("petPagination");
  const previousPageButton = document.getElementById("petPreviousPage");
  const nextPageButton = document.getElementById("petNextPage");
  const pageInfo = document.getElementById("petPageInfo");
  const detailsDialog = document.getElementById("petDetailsDialog");
  const detailsContent = document.getElementById("petDetailsContent");
  const detailsCloseButton = document.getElementById("petDetailsClose");
  const saveButton = document.getElementById("petSaveButton");
  const cancelButton = document.getElementById("petCancelButton");
  const message = document.getElementById("petMessage");
  const pageSize = 10;
  let currentPage = 1;
  let formRevision = 0;
  let pets = loadPets();
  let schedules = loadSchedules();
  let avatarData = "";

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    location.replace("/");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validationMessage = validatePetFormData(nameInput.value, ageInput.value);
    if (validationMessage) {
      showMessage(validationMessage, "error");
      if (!String(nameInput.value || "").trim()) nameInput.focus();
      else ageInput.focus();
      return;
    }
    if (!form.reportValidity()) return;

    const submittedRevision = formRevision;
    const id = Number(petIdInput.value);
    const existingPet = id ? pets.find((item) => Number(item.id) === id) : null;
    const petNumericId = id || getNextPetId(pets);
    const selectedAvatar = avatarInput.files[0];
    if (selectedAvatar) {
      if (!selectedAvatar.type.startsWith("image/")) {
        showMessage("Vui lòng chọn tệp ảnh hợp lệ.", "error");
        return;
      }
      if (selectedAvatar.size > 5 * 1024 * 1024) {
        showMessage("Ảnh đại diện không được lớn hơn 5 MB.", "error");
        return;
      }
      try {
        const resizedAvatar = await resizeAvatar(selectedAvatar);
        if (submittedRevision !== formRevision) return;
        avatarData = resizedAvatar;
      } catch (error) {
        if (submittedRevision !== formRevision) return;
        showMessage(error.message || "Không thể đọc ảnh đại diện. Vui lòng chọn ảnh khác.", "error");
        return;
      }
    }
    if (submittedRevision !== formRevision) return;
    const pet = {
      ...(existingPet || {}),
      id: petNumericId,
      petCode: existingPet?.petCode || getPetCode(petNumericId),
      name: nameInput.value.trim(),
      species: speciesInput.value,
      breed: breedInput.value.trim(),
      age: Number(ageInput.value),
      weightKg: weightInput.value === "" ? "" : Number(weightInput.value),
      owner: ownerInput.value.trim(),
      status: statusInput.value,
      avatar: avatarData,
      createdAt: existingPet ? existingPet.createdAt || "" : getTodayDate(),
    };

    if (id && !pets.some((item) => Number(item.id) === id)) {
      resetForm();
      showMessage("Hồ sơ thú cưng không còn tồn tại. Vui lòng chọn lại hồ sơ cần sửa.", "error");
      render();
      return;
    }

    const nextPets = id ? pets.map((item) => Number(item.id) === id ? pet : item) : [...pets, pet];

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

    if (button.dataset.action === "details") {
      renderPetDetails(pet);
      detailsDialog.showModal();
    } else if (button.dataset.action === "edit") {
      petIdInput.value = pet.id;
      petCodeInput.value = pet.petCode || getPetCode(pet.id);
      nameInput.value = pet.name || "";
      speciesInput.value = pet.species || "Chó";
      breedInput.value = pet.breed || "";
      ageInput.value = String(pet.age ?? 0);
      weightInput.value = pet.weightKg === "" || pet.weightKg === undefined ? "" : String(pet.weightKg);
      ownerInput.value = pet.owner || "";
      statusInput.value = pet.status || "Chờ lịch";
      createdAtInput.value = formatPetDate(pet.createdAt);
      avatarData = pet.avatar || "";
      updateAvatarPreview();
      saveButton.textContent = "Lưu thay đổi";
      cancelButton.hidden = false;
      nameInput.focus();
    } else if (button.dataset.action === "delete") {
      schedules = loadSchedules();
      const unresolvedSchedules = getUnresolvedPetSchedules(pet, schedules);
      if (unresolvedSchedules.length) {
        showMessage(
          `Không thể xóa hồ sơ ${pet.name || "thú cưng"} vì còn ${unresolvedSchedules.length} lịch chăm sóc chưa xử lý. Vui lòng xác nhận hoặc hủy các lịch này trước.`,
          "error",
        );
        return;
      }
      if (confirm(`Xóa hồ sơ thú cưng ${pet.name}? Thao tác này không thể hoàn tác.`)) {
        const nextPets = pets.filter((item) => Number(item.id) !== Number(pet.id));
        if (!savePets(nextPets)) {
          showMessage("Không thể xóa hồ sơ. Vui lòng thử lại.", "error");
          return;
        }
        pets = nextPets;
        if (Number(petIdInput.value) === Number(pet.id)) resetForm();
        render();
        showMessage(`Đã xóa hồ sơ thú cưng ${pet.name || ""}.`.trim(), "success");
      }
    }
  });

  searchInput.addEventListener("input", resetPageAndRender);
  speciesFilter.addEventListener("change", resetPageAndRender);
  statusFilter.addEventListener("change", resetPageAndRender);
  sortInput.addEventListener("change", resetPageAndRender);
  previousPageButton.addEventListener("click", () => {
    currentPage -= 1;
    render();
  });
  nextPageButton.addEventListener("click", () => {
    currentPage += 1;
    render();
  });
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      avatarInput.value = "";
      showMessage("Vui lòng chọn tệp ảnh hợp lệ.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      avatarInput.value = "";
      showMessage("Ảnh đại diện không được lớn hơn 5 MB.", "error");
      return;
    }
    const selectedRevision = formRevision;
    resizeAvatar(file).then((image) => {
      if (selectedRevision !== formRevision) return;
      avatarData = image;
      updateAvatarPreview();
      showMessage("", "");
    }).catch((error) => {
      if (selectedRevision !== formRevision) return;
      avatarInput.value = "";
      showMessage(error.message || "Không thể đọc ảnh đại diện. Vui lòng chọn ảnh khác.", "error");
    });
  });
  avatarRemoveButton.addEventListener("click", () => {
    avatarData = "";
    avatarInput.value = "";
    updateAvatarPreview();
  });
  cancelButton.addEventListener("click", () => {
    resetForm();
    showMessage("Đã hủy sửa. Dữ liệu hồ sơ đã lưu được giữ nguyên.", "success");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === PET_STORAGE_KEY) {
      pets = loadPets();
      render();
    } else if (event.key === SCHEDULE_STORAGE_KEY) {
      schedules = loadSchedules();
      if (detailsDialog.open) {
        const pet = pets.find((item) => Number(item.id) === Number(detailsDialog.dataset.petId));
        if (pet) renderPetDetails(pet);
      }
    }
  });
  detailsCloseButton.addEventListener("click", () => detailsDialog.close());
  detailsDialog.addEventListener("click", (event) => {
    if (event.target === detailsDialog) detailsDialog.close();
  });

  function resetForm() {
    formRevision += 1;
    form.reset();
    petIdInput.value = "";
    petCodeInput.value = getPetCode(getNextPetId(pets));
    createdAtInput.value = getTodayDate();
    avatarData = "";
    updateAvatarPreview();
    saveButton.textContent = "Thêm thú cưng";
    cancelButton.hidden = true;
  }

  function updateAvatarPreview() {
    const hasAvatar = avatarData.startsWith("data:image/jpeg;base64,");
    avatarPreview.hidden = !hasAvatar;
    avatarPlaceholder.hidden = hasAvatar;
    avatarRemoveButton.hidden = !hasAvatar;
    if (hasAvatar) avatarPreview.src = avatarData;
    else avatarPreview.removeAttribute("src");
  }

  function resetPageAndRender() {
    currentPage = 1;
    render();
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `user-form-message ${type}`;
  }

  function getTodayDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function formatPetDate(value) {
    const date = String(value || "");
    return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : "";
  }

  function resizeAvatar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("Không thể đọc tệp ảnh."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Tệp đã chọn không phải ảnh hợp lệ."));
        image.onload = () => {
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Trình duyệt không thể xử lý ảnh này."));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const resizedImage = canvas.toDataURL("image/jpeg", 0.78);
          if (resizedImage.length > 500_000) {
            reject(new Error("Ảnh sau khi thu nhỏ vẫn quá lớn. Vui lòng chọn ảnh khác."));
            return;
          }
          resolve(resizedImage);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
    return cell;
  }

  function renderPetDetails(pet) {
    detailsDialog.dataset.petId = String(pet.id);
    detailsContent.replaceChildren();

    const relatedSchedules = getPetSchedules(pet, schedules).sort((left, right) => {
      const leftDate = `${left.date || ""} ${left.time || ""}`;
      const rightDate = `${right.date || ""} ${right.time || ""}`;
      return rightDate.localeCompare(leftDate);
    });
    const ownerSchedule = relatedSchedules.find((schedule) => schedule.customerName || schedule.customerPhone || schedule.customerUsername);

    const profileSection = createDetailsSection("Thông tin thú cưng");
    const profile = document.createElement("div");
    profile.className = "admin-pet-detail-profile";
    if (typeof pet.avatar === "string" && pet.avatar.startsWith("data:image/jpeg;base64,")) {
      const image = document.createElement("img");
      image.src = pet.avatar;
      image.alt = `Ảnh đại diện của ${pet.name || "thú cưng"}`;
      profile.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "admin-pet-detail-avatar-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "🐾";
      profile.append(placeholder);
    }
    const profileFields = createDetailsList([
      ["Mã thú cưng", pet.petCode || getPetCode(pet.id)],
      ["Tên", pet.name],
      ["Loài", pet.species],
      ["Giống", pet.breed],
      ["Tuổi", pet.age === "" || pet.age === undefined ? "" : `${pet.age} tuổi`],
      ["Cân nặng", pet.weightKg === "" || pet.weightKg === undefined ? "" : `${pet.weightKg} kg`],
      ["Trạng thái", pet.status],
      ["Ngày tạo hồ sơ", formatPetDate(pet.createdAt)],
    ]);
    profile.append(profileFields);
    profileSection.append(profile);

    const ownerSection = createDetailsSection("Thông tin chủ nuôi");
    ownerSection.append(createDetailsList([
      ["Họ tên", pet.owner || ownerSchedule?.customerName],
      ["Số điện thoại", pet.ownerPhone || ownerSchedule?.customerPhone],
      ["Tài khoản", pet.ownerUsername || ownerSchedule?.customerUsername],
    ]));

    const schedulesSection = createDetailsSection(`Lịch chăm sóc liên quan (${relatedSchedules.length})`);
    schedulesSection.append(createScheduleList(relatedSchedules, pet));

    const serviceHistory = relatedSchedules.filter((schedule) => resolveScheduleStatus(schedule) === "Đã hoàn thành");
    const historySection = createDetailsSection(`Lịch sử dịch vụ đã sử dụng (${serviceHistory.length})`);
    historySection.append(createScheduleList(serviceHistory, pet, true));

    detailsContent.append(profileSection, ownerSection, schedulesSection, historySection);
  }

  function createDetailsSection(title) {
    const section = document.createElement("section");
    section.className = "admin-pet-detail-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.append(heading);
    return section;
  }

  function createDetailsList(fields) {
    const list = document.createElement("dl");
    list.className = "admin-pet-detail-list";
    fields.forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
      list.append(term, description);
    });
    return list;
  }

  function createScheduleList(records, pet, isHistory = false) {
    const list = document.createElement("div");
    list.className = "admin-pet-detail-schedules";
    if (!records.length) {
      const emptyText = document.createElement("p");
      emptyText.className = "admin-pet-detail-empty";
      emptyText.textContent = isHistory ? "Chưa có dịch vụ hoàn thành." : "Chưa có lịch chăm sóc.";
      list.append(emptyText);
      return list;
    }

    records.forEach((schedule) => {
      const card = document.createElement("article");
      card.className = "admin-pet-detail-schedule";
      const heading = document.createElement("strong");
      heading.textContent = `${schedule.date || "Chưa có ngày"}${schedule.time ? ` · ${schedule.time}` : ""}`;
      const services = document.createElement("p");
      services.textContent = getPetScheduleServices(schedule, pet).join(", ") || "Chăm sóc theo yêu cầu";
      const status = resolveScheduleStatus(schedule);
      const statusText = document.createElement("span");
      statusText.className = `admin-pet-detail-status is-${getScheduleStatusClass(status)}`;
      statusText.textContent = status;
      card.append(heading, services, statusText);
      if (schedule.note) {
        const note = document.createElement("p");
        note.className = "admin-pet-detail-note";
        note.textContent = `Ghi chú: ${schedule.note}`;
        card.append(note);
      }
      list.append(card);
    });
    return list;
  }

  function render() {
    const filteredPets = filterPets(pets, searchInput.value, speciesFilter.value, statusFilter.value);
    const sortedPets = sortPets(filteredPets, sortInput.value);
    const page = paginatePets(sortedPets, currentPage, pageSize);
    currentPage = page.page;
    const rows = page.items;
    const stats = getPetStatistics(pets);
    list.replaceChildren();
    count.textContent = `${pets.length} hồ sơ · ${filteredPets.length} phù hợp`;
    document.getElementById("totalPets").textContent = String(stats.totalPets);
    document.getElementById("dogCount").textContent = String(stats.dogs);
    document.getElementById("catCount").textContent = String(stats.cats);
    document.getElementById("beingCaredForCount").textContent = String(stats.beingCaredFor);
    empty.hidden = filteredPets.length > 0;
    pagination.hidden = page.totalPages <= 1;
    pageInfo.textContent = `Trang ${page.page} / ${page.totalPages} · ${page.totalItems} hồ sơ`;
    previousPageButton.disabled = page.page <= 1;
    nextPageButton.disabled = page.page >= page.totalPages;

    rows.forEach((pet) => {
      const row = document.createElement("tr");
      const avatarCell = document.createElement("td");
      if (typeof pet.avatar === "string" && pet.avatar.startsWith("data:image/jpeg;base64,")) {
        const image = document.createElement("img");
        image.className = "admin-pet-table-avatar";
        image.src = pet.avatar;
        image.alt = `Ảnh đại diện của ${pet.name || "thú cưng"}`;
        avatarCell.append(image);
      } else {
        avatarCell.textContent = "—";
      }
      const nameCell = document.createElement("td");
      const detailsButton = document.createElement("button");
      detailsButton.type = "button";
      detailsButton.className = "admin-pet-name-link";
      detailsButton.dataset.action = "details";
      detailsButton.dataset.id = String(pet.id);
      detailsButton.textContent = pet.name || "Thú cưng";
      nameCell.append(detailsButton);
      row.append(
        avatarCell,
        createCell(pet.petCode || getPetCode(pet.id)),
        nameCell,
        createCell(pet.species),
        createCell(pet.breed),
        createCell(pet.age),
        createCell(pet.weightKg),
        createCell(pet.owner),
        createCell(pet.status),
        createCell(formatPetDate(pet.createdAt)),
      );
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "care-actions";
      for (const [action, label, className] of [["details", "Chi tiết", "care-btn-edit"], ["edit", "Sửa", "care-btn-edit"], ["delete", "Xóa", "care-btn-delete"]]) {
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

  resetForm();
  render();
}
