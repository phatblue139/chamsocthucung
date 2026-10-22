import samplePets from "./samplePets.json" with { type: "json" };

export const PET_STORAGE_KEY = "neko:pets";
export const PET_ID_SEQUENCE_KEY = "neko:petIdSequence";

function normalizePetSize(size) {
  const raw = String(size || "").trim().toLowerCase();
  if (!raw) return "";
  if (["small", "nhỏ", "tiny"].includes(raw)) return "small";
  if (["medium", "vừa", "mid"].includes(raw)) return "medium";
  if (["large", "lớn", "big"].includes(raw)) return "large";
  return raw;
}

function normalizePetRecord(pet) {
  const item = pet && typeof pet === "object" ? { ...pet } : {};
  const weightNumber = Number(item.weightKg ?? item.weight ?? item.weight_kg ?? "");
  const lengthNumber = Number(item.bodyLengthCm ?? item.lengthCm ?? item.bodyLength ?? "");
  const heightNumber = Number(item.bodyHeightCm ?? item.heightCm ?? item.bodyHeight ?? "");

  return {
    ...item,
    size: normalizePetSize(item.size || item.sizeCategory || item.petSize || item.groupSize || ""),
    weightKg: Number.isFinite(weightNumber) ? weightNumber : "",
    bodyLengthCm: Number.isFinite(lengthNumber) ? lengthNumber : "",
    bodyHeightCm: Number.isFinite(heightNumber) ? heightNumber : "",
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
  if (!storage) return clonePets(samplePets);

  try {
    const saved = storage.getItem(PET_STORAGE_KEY);
    if (saved === null) {
      const initialPets = clonePets(samplePets);
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(initialPets));
      return initialPets;
    }

    const pets = JSON.parse(saved);
    return Array.isArray(pets) ? clonePets(pets) : clonePets(samplePets);
  } catch (error) {
    return clonePets(samplePets);
  }
}

export function savePets(pets) {
  const storage = getStorage();
  if (!storage || !Array.isArray(pets)) return false;

  try {
    storage.setItem(PET_STORAGE_KEY, JSON.stringify(pets));
    return true;
  } catch (error) {
    return false;
  }
}

export function getNextPetId(pets = loadPets()) {
  const ids = (Array.isArray(pets) ? pets : [])
    .map((pet) => Number(pet?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const storage = getStorage();
  const lastIssuedId = Number(storage?.getItem(PET_ID_SEQUENCE_KEY)) || 0;
  const nextId = Math.max(ids.length ? Math.max(...ids) : 0, lastIssuedId) + 1;

  // Never reuse an id: a new pet must not inherit the schedules of a removed one.
  try {
    storage?.setItem(PET_ID_SEQUENCE_KEY, String(nextId));
  } catch (error) {
    // Storage is optional, the id is still valid for the current session.
  }

  return nextId;
}
