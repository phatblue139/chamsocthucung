import samplePets from "./samplePets.json" with { type: "json" };
import { getCurrentUser } from "./auth.js";

export const PET_STORAGE_KEY = "neko:pets";

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// Lấy tài khoản đang đăng nhập
export function getCurrentUserId() {
  const user = getCurrentUser();

  if (!user) return null;

  return String(user.id || user.userId || "");
}

// Chuẩn hóa dữ liệu thú cưng
function normalizePet(pet, index = 0) {
  return {
    petId: String(pet.petId || pet.id || `PET${String(index + 1).padStart(3, "0")}`),
    userId: String(pet.userId || ""),
    name: String(pet.name || ""),
    species: String(pet.species || ""),
    breed: String(pet.breed || ""),
    age: Number(pet.age ?? 0),
    gender: String(pet.gender || ""),
    weight: Number(pet.weight ?? 0),
    image: String(pet.image || ""),
    owner: String(pet.owner || ""),
    status: String(pet.status || "Đang chăm sóc")
  };
}

// Đọc tất cả thú cưng
export function loadPets() {
  const storage = getStorage();

  if (!storage) {
    return samplePets.map(normalizePet);
  }

  try {
    const saved = storage.getItem(PET_STORAGE_KEY);

    if (saved === null) {
      const initialPets = samplePets.map(normalizePet);
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(initialPets));
      return initialPets;
    }

    const data = JSON.parse(saved);

    if (!Array.isArray(data)) {
      return samplePets.map(normalizePet);
    }

    // Chuyển dữ liệu mẫu cũ sang ID tài khoản mẫu hiện tại
    const migratedPets = data.map((pet, index) => {
      const normalized = normalizePet(pet, index);

      if (
        normalized.userId === "USER001" &&
        normalized.owner === "Nguyễn Văn A"
      ) {
        normalized.userId = "demo-user";
      }

      if (
        normalized.userId === "USER002" &&
        normalized.owner === "Trần Văn B"
      ) {
        normalized.userId = "demo-user-2";
      }

      return normalized;
    });

    // Chỉ lưu lại khi dữ liệu thực sự thay đổi
    if (JSON.stringify(data) !== JSON.stringify(migratedPets)) {
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(migratedPets));
    }

    return migratedPets;
  } catch (error) {
    console.error("Không đọc được dữ liệu thú cưng:", error);
    return [];
  }
}

// Chỉ lấy thú cưng của người dùng hiện tại
export function loadMyPets() {
  const userId = getCurrentUserId();

  if (!userId) return [];

  return loadPets().filter(
    (pet) => String(pet.userId) === userId
  );
}

// Lưu danh sách thú cưng
export function savePets(pets) {
  const storage = getStorage();

  if (!storage || !Array.isArray(pets)) return false;

  try {
    const normalizedPets = pets.map(normalizePet);
    storage.setItem(PET_STORAGE_KEY, JSON.stringify(normalizedPets));
    return true;
  } catch (error) {
    console.error("Không lưu được dữ liệu thú cưng:", error);
    return false;
  }
}

// Tạo mã thú cưng mới
export function getNextPetId(pets = loadPets()) {
  const numbers = pets.map((pet) => {
    const match = String(pet.petId || "").match(/^PET(\d+)$/i);
    return match ? Number(match[1]) : 0;
  });

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;

  return `PET${String(next).padStart(3, "0")}`;
}

// Tìm thú cưng theo mã
export function getPetById(petId) {
  if (!petId) return null;

  return loadPets().find(
    (pet) => String(pet.petId) === String(petId)
  ) || null;
}

// Tìm thú cưng thuộc tài khoản đang đăng nhập
export function getMyPetById(petId) {
  const userId = getCurrentUserId();

  if (!userId || !petId) return null;

  return loadPets().find(
    (pet) =>
      String(pet.petId) === String(petId) &&
      String(pet.userId) === userId
  ) || null;
}
