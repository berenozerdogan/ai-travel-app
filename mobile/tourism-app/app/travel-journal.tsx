import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  SectionList,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useLanguage } from "../context/LanguageContext";
import {
  readJson,
  writeJson,
  removeStorage,
  STORAGE_KEYS,
} from "../services/storageService";

const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31,41,55,0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  white: "#FFFFFF",
  shadow: "#D6CEC2",
};

type JournalItem = {
  id: string;
  placeId?: number | string;
  placeName: string;
  city?: string;
  note: string;
  createdAt?: string;
  photoUri?: string;
};

type JournalSection = {
  title: string;
  data: JournalItem[];
};

function journalText(key: string, language: string) {
  const texts: Record<string, Record<string, string>> = {
    cityMap: {
      tr: "Günlük Haritası",
      en: "Journal Map",
      de: "Tagebuchkarte",
      ru: "Карта дневника",
    },
    summary: {
      tr: "Şehir şehir tuttuğun gezi notları burada listelenir.",
      en: "Your travel notes are grouped by city here.",
      de: "Deine Reisenotizen werden hier nach Stadt gruppiert.",
      ru: "Ваши заметки сгруппированы по городам.",
    },
    unknownCity: {
      tr: "Diğer",
      en: "Other",
      de: "Andere",
      ru: "Другое",
    },
    notes: {
      tr: "not",
      en: "note",
      de: "Notiz",
      ru: "заметка",
    },
    addMemory: {
      tr: "Fotoğraflı Anı Ekle",
      en: "Add Photo Memory",
      de: "Foto-Erinnerung hinzufügen",
      ru: "Добавить фото-воспоминание",
    },
    addMemoryDesc: {
      tr: "Galerinden fotoğraf seçerek gezi günlüğüne anı ekleyebilirsin.",
      en: "Pick a photo from your gallery and save it as a travel memory.",
      de: "Wähle ein Foto aus deiner Galerie und speichere eine Reiseerinnerung.",
      ru: "Выберите фото из галереи и сохраните воспоминание о поездке.",
    },
    photoPermissionTitle: {
      tr: "İzin gerekli",
      en: "Permission needed",
      de: "Berechtigung erforderlich",
      ru: "Нужно разрешение",
    },
    photoPermissionMessage: {
      tr: "Fotoğraf eklemek için galeri izni vermelisin.",
      en: "Please allow gallery permission to add a photo.",
      de: "Bitte erlaube den Galerie-Zugriff, um ein Foto hinzuzufügen.",
      ru: "Разрешите доступ к галерее, чтобы добавить фото.",
    },
    photoNote: {
      tr: "Fotoğraflı gezi anısı",
      en: "Photo travel memory",
      de: "Foto-Reiseerinnerung",
      ru: "Фото-воспоминание о поездке",
    },
    photoMemory: {
      tr: "Fotoğraf Anısı",
      en: "Photo Memory",
      de: "Foto-Erinnerung",
      ru: "Фото-воспоминание",
    },
  };

  const lang = String(language || "en").toLowerCase();
  return texts[key]?.[lang] || texts[key]?.en || key;
}

export default function TravelJournal() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<JournalItem[]>([]);

  const loadJournal = async () => {
    const travelJournal = await readJson<JournalItem[]>(
      STORAGE_KEYS.travelJournal,
      []
    );

    const oldNotes = await readJson<Record<string, string>>(
      STORAGE_KEYS.userPlaceNotes,
      {}
    );

    const savedPlaces = await readJson<any[]>(STORAGE_KEYS.savedPlaces, []);

    const oldNoteList: JournalItem[] = Object.keys(oldNotes || {})
      .filter((id) => String(oldNotes[id] || "").trim())
      .map((id) => {
        const place = savedPlaces.find((p) => String(p.id) === String(id));

        return {
          id: `old-${id}`,
          placeId: id,
          placeName: place?.name || `${t("journal.placeFallback") || "Place"} #${id}`,
          city: place?.city || "",
          note: oldNotes[id],
          createdAt: new Date().toISOString(),
        };
      });

    const merged = [...travelJournal, ...oldNoteList];

    const unique = merged.filter(
      (item, index, self) =>
        index === self.findIndex((x) => String(x.id) === String(item.id))
    );

    setItems(unique);
  };

  useFocusEffect(
    useCallback(() => {
      loadJournal();
    }, [])
  );

  const sections = useMemo<JournalSection[]>(() => {
    const grouped: Record<string, JournalItem[]> = {};

    items.forEach((item) => {
      const city = String(item.city || "").trim() || journalText("unknownCity", language);
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(item);
    });

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((city) => ({
        title: city,
        data: grouped[city].sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        ),
      }));
  }, [items, language]);

  const clearJournal = async () => {
    Alert.alert(t("journal.clearTitle"), t("journal.clearMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await removeStorage(STORAGE_KEYS.travelJournal);
          await removeStorage(STORAGE_KEYS.userPlaceNotes);
          setItems([]);
        },
      },
    ]);
  };

  const deleteItem = async (item: JournalItem) => {
    const journal = await readJson<JournalItem[]>(STORAGE_KEYS.travelJournal, []);
    const updatedJournal = journal.filter((x) => String(x.id) !== String(item.id));
    await writeJson(STORAGE_KEYS.travelJournal, updatedJournal);

    if (item.placeId) {
      const oldNotes = await readJson<Record<string, string>>(
        STORAGE_KEYS.userPlaceNotes,
        {}
      );
      delete oldNotes[String(item.placeId)];
      await writeJson(STORAGE_KEYS.userPlaceNotes, oldNotes);
    }

    loadJournal();
  };


  const addPhotoMemory = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          journalText("photoPermissionTitle", language),
          journalText("photoPermissionMessage", language)
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.82,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const old = await readJson<JournalItem[]>(STORAGE_KEYS.travelJournal, []);

      const item: JournalItem = {
        id: Date.now().toString(),
        placeId: "photo",
        placeName: journalText("photoMemory", language),
        city: journalText("unknownCity", language),
        note: journalText("photoNote", language),
        photoUri: result.assets[0].uri,
        createdAt: new Date().toISOString(),
      };

      await writeJson(STORAGE_KEYS.travelJournal, [item, ...(Array.isArray(old) ? old : [])]);
      loadJournal();
    } catch (error) {
      console.log("photo memory error", error);
    }
  };

  const renderItem = ({ item }: { item: JournalItem }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => {
          if (item.placeId && item.placeId !== "route") {
            router.push({
              pathname: "/place",
              params: { id: String(item.placeId) },
            });
          }
        }}
      >
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.memoryImage} />
        ) : null}
        <Text style={styles.cardTitle}>{item.placeName}</Text>
        <Text style={styles.note}>{item.note}</Text>
        {item.createdAt ? (
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(item)}
      >
        <Ionicons name="trash-outline" size={17} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{t("journal.title")}</Text>
        <Text style={styles.subtitle}>{t("journal.subtitle")}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity style={styles.photoMemoryCard} activeOpacity={0.88} onPress={addPhotoMemory}>
          <View style={styles.photoStack}>
            <View style={[styles.photoTile, styles.photoTileBack]}>
              <Ionicons name="image-outline" size={22} color={COLORS.accent} />
            </View>
            <View style={[styles.photoTile, styles.photoTileFront]}>
              <Ionicons name="camera-outline" size={28} color={COLORS.white} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.photoMemoryTitle}>{journalText("addMemory", language)}</Text>
            <Text style={styles.photoMemoryText}>{journalText("addMemoryDesc", language)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textSoft} />
        </TouchableOpacity>

        {items.length > 0 && (
          <View style={styles.topActions}>
            <View style={styles.summaryBox}>
              <Ionicons name="map-outline" size={20} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>{journalText("cityMap", language)}</Text>
                <Text style={styles.summaryText}>{journalText("summary", language)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={clearJournal}>
              <Text style={styles.clearText}>{t("journal.clearAll")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="journal-outline" size={36} color={COLORS.accent} />
            <Text style={styles.emptyTitle}>{t("journal.emptyTitle")}</Text>
            <Text style={styles.emptyText}>{t("journal.emptyText")}</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={styles.cityHeader}>
                <View style={styles.cityIcon}>
                  <Ionicons name="location-outline" size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityTitle}>{section.title}</Text>
                  <Text style={styles.citySubtitle}>
                    {section.data.length} {journalText("notes", language)}
                  </Text>
                </View>
              </View>
            )}
            renderItem={renderItem}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  hero: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  content: { flex: 1, padding: 18 },

  topActions: {
    marginBottom: 14,
  },

  summaryBox: {
    backgroundColor: "#FFF1F4",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(232,93,117,0.16)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  summaryTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  summaryText: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },


  photoMemoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  photoStack: {
    width: 70,
    height: 58,
    marginRight: 12,
    position: "relative",
  },

  photoTile: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  photoTileBack: {
    left: 0,
    top: 4,
    backgroundColor: "#EAF6FF",
    transform: [{ rotate: "-8deg" }],
  },

  photoTileFront: {
    right: 0,
    top: 0,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: "6deg" }],
  },

  photoMemoryTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  photoMemoryText: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "600",
  },

  memoryImage: {
    width: "100%",
    height: 150,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },

  emptyText: {
    color: COLORS.textSoft,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },

  cityHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  cityIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF1F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  cityTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },

  citySubtitle: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },

  note: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  date: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginTop: 10,
  },

  clearButton: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  clearText: {
    color: COLORS.accent,
    fontWeight: "800",
  },

  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
