import samplePets from "./samplePets.json" with { type: "json" };

export const PET_STORAGE_KEY = "neko:pets";

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    return null;
  }
}

function clonePets(pets) {
  return pets.map((pet) => ({ ...pet }));
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
  return ids.length ? Math.max(...ids) + 1 : 1;
}
