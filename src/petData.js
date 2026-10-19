import samplePets from "./samplePets.json" with { type: "json" };

export const PET_STORAGE_KEY = "neko:pets";

function normalizePetSize(size) {
  const raw = String(size || "").trim().toLowerCase();
  if (!raw) return "";
  if (["small", "nhỏ", "tiny"].includes(raw)) return "small";
  if (["medium", "vừa", "mid"].includes(raw)) return "medium";
  if (["large", "lớn", "big"].includes(raw)) return "large";
  return raw;
}

function normalizeOptionalNumber(...values) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "");
  if (value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function normalizePetRecord(pet) {
  const item = pet && typeof pet === "object" ? { ...pet } : {};

  return {
    ...item,
    age: normalizeOptionalNumber(item.age, item.ageYears),
    size: normalizePetSize(item.size || item.sizeCategory || item.petSize || item.groupSize || ""),
    weightKg: normalizeOptionalNumber(item.weightKg, item.weight, item.weight_kg),
    bodyLengthCm: normalizeOptionalNumber(item.bodyLengthCm, item.lengthCm, item.bodyLength),
    bodyHeightCm: normalizeOptionalNumber(item.bodyHeightCm, item.heightCm, item.bodyHeight),
  };
}

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function clonePets(pets) {
  return pets.map((pet) => normalizePetRecord(pet));
}

export function loadPets() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const saved = storage.getItem(PET_STORAGE_KEY);
    if (saved === null) {
      const initialPets = clonePets(samplePets);
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(initialPets));
      return initialPets;
    }

    const pets = JSON.parse(saved);
    return Array.isArray(pets) ? clonePets(pets) : [];
  } catch (error) {
    return [];
  }
}

export function savePets(pets) {
  const storage = getStorage();
  if (!storage || !Array.isArray(pets)) return false;

  try {
    const stored = storage.getItem(PET_STORAGE_KEY);
    if (stored !== null && !Array.isArray(JSON.parse(stored))) return false;
    storage.setItem(PET_STORAGE_KEY, JSON.stringify(pets));
    return true;
  } catch (error) {
    return false;
  }
}

let lastGeneratedPetId = 0;

export function getNextPetId(pets = loadPets()) {
  const ids = (Array.isArray(pets) ? pets : [])
    .map((pet) => Number(pet?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  lastGeneratedPetId = Math.max(Date.now(), ids.length ? Math.max(...ids) + 1 : 1, lastGeneratedPetId + 1);
  return lastGeneratedPetId;
}
