import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const STORAGE_KEYS = {
  savedPlaces: "saved_places",
  savedRoutes: "saved_routes",
  visitedPlaces: "visited_places",
  userPlaceNotes: "user_place_notes",
  travelJournal: "travel_journal",
  travelStyleQuiz: "travel_style_quiz",
};

function getUserScopedKey(key: string) {
  const user = auth.currentUser;
  return user ? `${key}_${user.uid}` : key;
}

function getUserDocRef(key: string) {
  const user = auth.currentUser;
  if (!user) return null;

  return doc(db, "users", user.uid, "storage", key);
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const ref = getUserDocRef(key);

    if (ref) {
      const snap = await getDoc(ref);

      if (snap.exists()) {
        return (snap.data()?.value ?? fallback) as T;
      }

      // Eski AsyncStorage kayıtlarını Firestore'a taşımak için geriye dönük okuma
      const scopedRaw = await AsyncStorage.getItem(getUserScopedKey(key));
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw) as T;
        await setDoc(ref, {
          value: parsed,
          updatedAt: new Date().toISOString(),
        });
        return parsed;
      }
    }

    const raw = await AsyncStorage.getItem(getUserScopedKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.log("readJson error:", error);
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(getUserScopedKey(key), JSON.stringify(value));

    const ref = getUserDocRef(key);
    if (ref) {
      await setDoc(ref, {
        value,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.log("writeJson error:", error);
  }
}

export async function removeStorage(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getUserScopedKey(key));

    const ref = getUserDocRef(key);
    if (ref) {
      await deleteDoc(ref);
    }
  } catch (error) {
    console.log("removeStorage error:", error);
  }
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
