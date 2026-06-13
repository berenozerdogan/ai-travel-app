import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  savedPlaces: "saved_places",
  savedRoutes: "saved_routes",
  visitedPlaces: "visited_places",
  userPlaceNotes: "user_place_notes",
  travelJournal: "travel_journal",
};

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeStorage(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function toggleListItemById<T extends { id: number | string }>(
  key: string,
  item: T
): Promise<{ updated: T[]; existsBefore: boolean }> {
  const list = await readJson<T[]>(key, []);
  const existsBefore = list.some((x) => String(x.id) === String(item.id));

  const updated = existsBefore
    ? list.filter((x) => String(x.id) !== String(item.id))
    : [item, ...list];

  await writeJson(key, updated);
  return { updated, existsBefore };
}