import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Linking,
  Image,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { readJson, writeJson, STORAGE_KEYS } from "../../services/storageService";

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


const SAVED_FALLBACKS: Record<string, Record<string, string>> = {
  "saved.title": {
    tr: "Favoriler",
    en: "Saved",
    de: "Gespeichert",
    ru: "Сохранённое",
  },
  "saved.subtitle": {
    tr: "Favori yerlerin, offline rotaların ve gezi notların.",
    en: "Your favorite places, offline routes and travel notes.",
    de: "Deine Lieblingsorte, Offline-Routen und Reisenotizen.",
    ru: "Избранные места, офлайн-маршруты и заметки.",
  },
  "saved.places": {
    tr: "Favoriler",
    en: "Favorites",
    de: "Favoriten",
    ru: "Избранное",
  },
  "settings.visited": {
    tr: "Ziyaret",
    en: "Visited",
    de: "Besucht",
    ru: "Посещено",
  },
  "saved.routes": {
    tr: "Rotalar",
    en: "Routes",
    de: "Routen",
    ru: "Маршруты",
  },
  "saved.journal": {
    tr: "Günlük",
    en: "Journal",
    de: "Tagebuch",
    ru: "Дневник",
  },
  "saved.noPlacesTitle": {
    tr: "Henüz favori yer yok",
    en: "No saved places yet",
    de: "Noch keine gespeicherten Orte",
    ru: "Пока нет сохранённых мест",
  },
  "saved.noPlacesText": {
    tr: "Favori yerlerin burada görünecek.",
    en: "Your favorite places will appear here.",
    de: "Deine Lieblingsorte erscheinen hier.",
    ru: "Твои избранные места появятся здесь.",
  },
  "saved.noRoutesTitle": {
    tr: "Henüz kayıtlı rota yok",
    en: "No saved routes yet",
    de: "Noch keine gespeicherten Routen",
    ru: "Пока нет сохранённых маршрутов",
  },
  "saved.noRoutesText": {
    tr: "Haritada rota kaydettiğinde burada offline görebilirsin.",
    en: "When you save a route on the map, you can view it here offline.",
    de: "Wenn du eine Route speicherst, kannst du sie hier offline ansehen.",
    ru: "Когда ты сохранишь маршрут на карте, он появится здесь офлайн.",
  },
  "saved.noJournalTitle": {
    tr: "Gezi günlüğün boş",
    en: "Travel journal is empty",
    de: "Reisetagebuch ist leer",
    ru: "Дневник путешествий пуст",
  },
  "saved.noJournalText": {
    tr: "Haritada bir yere not eklediğinde burada görünür.",
    en: "When you add a note to a place on the map, it will appear here.",
    de: "Wenn du einem Ort eine Notiz hinzufügst, erscheint sie hier.",
    ru: "Когда ты добавишь заметку к месту на карте, она появится здесь.",
  },
  "saved.savedRoute": {
    tr: "Kayıtlı Rota",
    en: "Saved Route",
    de: "Gespeicherte Route",
    ru: "Сохранённый маршрут",
  },
  "saved.stops": {
    tr: "durak",
    en: "stops",
    de: "Stopps",
    ru: "остановок",
  },
  "saved.removeErrorTitle": {
    tr: "Hata",
    en: "Error",
    de: "Fehler",
    ru: "Ошибка",
  },
  "saved.removeErrorText": {
    tr: "Kayıtlı yer silinemedi.",
    en: "Could not remove saved place.",
    de: "Gespeicherter Ort konnte nicht entfernt werden.",
    ru: "Не удалось удалить сохранённое место.",
  },
  "saved.routeRemoveError": {
    tr: "Rota silinemedi.",
    en: "Could not remove route.",
    de: "Route konnte nicht entfernt werden.",
    ru: "Не удалось удалить маршрут.",
  },
};

function safeT(
  t: (key: string) => string,
  key: string,
  fallback: string,
  language: string
) {
  const value = t(key);
  if (value && value !== key) return value;

  const lang = String(language || "en").toLowerCase();
  return SAVED_FALLBACKS[key]?.[lang] || SAVED_FALLBACKS[key]?.en || fallback;
}


function categoryDisplay(category: string | undefined, language: string) {
  const c = String(category || "").toLowerCase();

  if (c.includes("hotel")) {
    return language === "tr" ? "Otel" : language === "de" ? "Hotel" : language === "ru" ? "Отель" : "Hotel";
  }

  if (c.includes("restaurant") || c.includes("food") || c.includes("cafe")) {
    return language === "tr" ? "Restoran" : language === "de" ? "Restaurant" : language === "ru" ? "Ресторан" : "Restaurant";
  }

  if (c.includes("museum")) {
    return language === "tr" ? "Müze" : language === "de" ? "Museum" : language === "ru" ? "Музей" : "Museum";
  }

  return language === "tr" ? "Gezilecek Yer" : language === "de" ? "Sehenswürdigkeit" : language === "ru" ? "Достопримечательность" : "Attraction";
}

function getSavedRoutePlaces(route: any): any[] {
  if (Array.isArray(route?.places) && route.places.length > 0) {
    return route.places;
  }

  if (Array.isArray(route?.plan?.places) && route.plan.places.length > 0) {
    return route.plan.places;
  }

  if (Array.isArray(route?.plan?.days)) {
    return route.plan.days.flatMap((day: any) =>
      Array.isArray(day?.places) ? day.places : []
    );
  }

  return [];
}

function getPlaceName(place: any): string {
  if (!place) return "";
  if (typeof place === "string") return place;

  const name = place.name;

  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return String(parsed.tr || parsed.en || Object.values(parsed)[0] || "");
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (name && typeof name === "object") {
    return String(name.tr || name.en || Object.values(name)[0] || "");
  }

  return "";
}

function normalizeSavedRoutes(routes: any[]): any[] {
  if (!Array.isArray(routes)) return [];

  return routes.map((route: any) => {
    const places = getSavedRoutePlaces(route);
    return {
      ...route,
      places,
      plan: {
        ...(route?.plan || {}),
        places,
      },
    };
  });
}

type TabKey = "places" | "visited" | "routes" | "journal";

export default function Saved() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAccountReady = !!user;
  const [activeTab, setActiveTab] = useState<TabKey>("places");
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [journalItems, setJournalItems] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);

  const loadAllSavedData = async () => {
    try {
      if (!isAccountReady) {
        setSavedPlaces([]);
        setSavedRoutes([]);
        setVisitedPlaces([]);
        setJournalItems([]);
        return;
      }

      const places = await readJson<any[]>(STORAGE_KEYS.savedPlaces, []);
      const routes = await readJson<any[]>(STORAGE_KEYS.savedRoutes, []);
      const notes = await readJson<Record<string, string>>(STORAGE_KEYS.userPlaceNotes, {});
      const travelJournal = await readJson<any[]>(STORAGE_KEYS.travelJournal, []);
      const visited = await readJson<any[]>(STORAGE_KEYS.visitedPlaces, []);

      setSavedPlaces(Array.isArray(places) ? places : []);
      const normalizedRoutes = normalizeSavedRoutes(Array.isArray(routes) ? routes : []);
      setSavedRoutes(normalizedRoutes);

      // Eski bozuk kayıtları da otomatik tamir edip tekrar sakla.
      if (Array.isArray(routes) && JSON.stringify(routes) !== JSON.stringify(normalizedRoutes)) {
        await writeJson(STORAGE_KEYS.savedRoutes, normalizedRoutes);
      }
      setVisitedPlaces(Array.isArray(visited) ? visited : []);

      const oldNoteList = Object.keys(notes || {})
        .map((id) => {
          const place = Array.isArray(places)
            ? places.find((p: any) => String(p.id) === String(id))
            : null;
          return {
            id: `old-${id}`,
            note: notes[id],
            placeName: place?.name || `Mekan #${id}`,
            city: place?.city || "",
            place,
          };
        })
        .filter((item) => String(item.note || "").trim().length > 0);

      const journalList = Array.isArray(travelJournal)
        ? travelJournal.map((item: any) => ({
            id: String(item.id),
            note: item.note,
            placeName: item.placeName || item.name || "Gezi Notu",
            city: item.city || "",
            photoUri: item.photoUri || "",
            locationLabel: item.locationLabel || "",
            createdAt: item.createdAt || "",
            place:
              item.placeId &&
              item.placeId !== "route" &&
              !String(item.placeId).startsWith("photo")
                ? { id: item.placeId }
                : null,
          }))
        : [];

      const mergedJournal = [...journalList, ...oldNoteList].filter(
        (item, index, self) =>
          index === self.findIndex((x) => String(x.id) === String(item.id))
      );

      setJournalItems(mergedJournal);
    } catch (error) {
      console.log(error);
      setSavedPlaces([]);
      setSavedRoutes([]);
      setVisitedPlaces([]);
      setJournalItems([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllSavedData();
    }, [isAccountReady, user?.uid])
  );

  const removePlace = async (id: number) => {
    try {
      const updated = savedPlaces.filter((item) => Number(item.id) !== Number(id));
      setSavedPlaces(updated);
      await writeJson(STORAGE_KEYS.savedPlaces, updated);
      loadAllSavedData();
    } catch (error) {
      console.log(error);
      Alert.alert(safeT(t, "saved.removeErrorTitle", "Hata", language), safeT(t, "saved.removeErrorText", "Kayıtlı yer silinemedi.", language));
    }
  };

  const removeVisited = async (id: number) => {
    try {
      const updated = visitedPlaces.filter((item) => Number(item.id) !== Number(id));
      setVisitedPlaces(updated);
      await writeJson(STORAGE_KEYS.visitedPlaces, updated);
      loadAllSavedData();
    } catch (error) {
      console.log(error);
      Alert.alert(safeT(t, "saved.removeErrorTitle", "Hata", language), safeT(t, "saved.removeErrorText", "Kayıtlı yer silinemedi.", language));
    }
  };

  const removeRoute = async (routeId: string) => {
    try {
      const updated = savedRoutes.filter((item) => String(item.id) !== String(routeId));
      setSavedRoutes(updated);
      await writeJson(STORAGE_KEYS.savedRoutes, updated);
    } catch (error) {
      console.log(error);
      Alert.alert(safeT(t, "saved.removeErrorTitle", "Hata", language), safeT(t, "saved.routeRemoveError", "Rota silinemedi.", language));
    }
  };

  const removeJournalNote = async (id: string) => {
    try {
      const notes = await readJson<Record<string, string>>(STORAGE_KEYS.userPlaceNotes, {});
      delete notes[id];
      await writeJson(STORAGE_KEYS.userPlaceNotes, notes);

      const journal = await readJson<any[]>(STORAGE_KEYS.travelJournal, []);
      const updatedJournal = Array.isArray(journal)
        ? journal.filter((item: any) => String(item.id) !== String(id))
        : [];
      await writeJson(STORAGE_KEYS.travelJournal, updatedJournal);

      loadAllSavedData();
    } catch (error) {
      console.log(error);
    }
  };

  const openPlace = (item: any) => {
    if (item?.id) {
      router.push({ pathname: "/place", params: { id: String(item.id) } });
      return;
    }
    if (item?.name) {
      router.push({ pathname: "/place", params: { name: String(item.name) } });
    }
  };

  const openRoute = (route: any) => {
    const routePlaces = getSavedRoutePlaces(route);

    router.push({
      pathname: "/(tabs)/map",
      params: { route: JSON.stringify(routePlaces) },
    });
  };

  const shareRouteText = async (route: any) => {
    const routePlaces = getSavedRoutePlaces(route);

    const text = routePlaces
      .map((place: any, index: number) => `${index + 1}. ${getPlaceName(place)} - ${place.city || ""}`)
      .join("\n");

    await Linking.openURL(`mailto:?subject=${encodeURIComponent(route.title || "Saved Route")}&body=${encodeURIComponent(text)}`).catch(() => {});
  };

  if (!isAccountReady) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />

      <Modal
        visible={!!selectedJournal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedJournal(null)}
      >
        <View style={styles.journalDetailOverlay}>
          <View style={styles.journalDetailCard}>
            <View style={styles.journalDetailHeader}>
              <Text style={styles.journalDetailTitle}>
                {selectedJournal?.placeName || safeT(t, "saved.journal", "Günlük", language)}
              </Text>
              <TouchableOpacity style={styles.journalDetailClose} onPress={() => setSelectedJournal(null)}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedJournal?.photoUri ? (
              <Image source={{ uri: selectedJournal.photoUri }} style={styles.journalDetailImage} />
            ) : null}

            {selectedJournal?.locationLabel || selectedJournal?.city ? (
              <View style={styles.journalDetailLocation}>
                <Ionicons name="location-outline" size={15} color={COLORS.accent} />
                <Text style={styles.journalDetailLocationText}>
                  {selectedJournal?.locationLabel || selectedJournal?.city}
                </Text>
              </View>
            ) : null}

            <Text style={styles.journalDetailNote}>{selectedJournal?.note}</Text>

            {selectedJournal?.place ? (
              <TouchableOpacity
                style={styles.journalDetailButton}
                onPress={() => {
                  const place = selectedJournal.place;
                  setSelectedJournal(null);
                  openPlace(place);
                }}
              >
                <Text style={styles.journalDetailButtonText}>
                  {language === "tr" ? "Mekan Detayına Git" : "Open Place Detail"}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>


        <LinearGradient
          colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.title}>{safeT(t, "saved.title", "Favoriler", language)}</Text>
          <Text style={styles.subtitle}>Favoriler, ziyaretler, rotalar ve gezi günlüğü için giriş yapmalısın.</Text>
        </LinearGradient>

        <View style={styles.authGateCard}>
          <Ionicons name="lock-closed-outline" size={42} color={COLORS.accent} />
          <Text style={styles.authGateTitle}>Giriş gerekli</Text>
          <Text style={styles.authGateText}>Bu sayfadaki kişisel seyahat verileri hesabına bağlı saklanır. Devam etmek için giriş yap veya kayıt ol.</Text>
          <TouchableOpacity style={styles.authGateButton} onPress={() => router.push("/(tabs)/profile" as any)}>
            <Text style={styles.authGateButtonText}>Profil'e Git</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderTabs = () => (
    <View style={styles.tabsRow}>
      {[
        { key: "places", label: safeT(t, "saved.places", "Favoriler", language), icon: "heart-outline" },
        { key: "visited", label: safeT(t, "settings.visited", "Ziyaret", language), icon: "checkmark-done-outline" },
        { key: "routes", label: safeT(t, "saved.routes", "Rotalar", language), icon: "map-outline" },
        { key: "journal", label: safeT(t, "saved.journal", "Günlük", language), icon: "book-outline" },
      ].map((tab: any) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={15} color={active ? COLORS.white : COLORS.textSoft} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderPlaces = () => {
    if (savedPlaces.length === 0) return <EmptyState icon="heart-outline" title={safeT(t, "saved.noPlacesTitle", "Henüz favori yer yok", language)} text={safeT(t, "saved.noPlacesText", "Favori yerlerin burada görünecek.", language)} />;
    return (
      <FlatList
        data={savedPlaces}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.88} style={{ flex: 1, paddingRight: 8 }} onPress={() => openPlace(item)}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.city} • {categoryDisplay(item.category, language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => removePlace(item.id)} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  const renderVisited = () => {
    if (visitedPlaces.length === 0) {
      return <EmptyState icon="checkmark-done-outline" title={safeT(t, "settings.visited", "Ziyaret", language)} text={safeT(t, "saved.noPlacesText", "Favori yerlerin burada görünecek.", language)} />;
    }
    return (
      <FlatList
        data={visitedPlaces}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.88} style={{ flex: 1, paddingRight: 8 }} onPress={() => openPlace(item)}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.city} • {categoryDisplay(item.category, language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => removeVisited(item.id)} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  const renderRoutes = () => {
    if (savedRoutes.length === 0) return <EmptyState icon="map-outline" title={safeT(t, "saved.noRoutesTitle", "Henüz kayıtlı rota yok", language)} text={safeT(t, "saved.noRoutesText", "Haritada rota kaydettiğinde burada offline görebilirsin.", language)} />;
    return (
      <FlatList
        data={savedRoutes}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.routeCard}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openRoute(item)}>
              <Text style={styles.name} numberOfLines={1}>{item.title || safeT(t, "saved.savedRoute", "Kayıtlı Rota", language)}</Text>
              <Text style={styles.meta}>{getSavedRoutePlaces(item).length || 0} {safeT(t, "saved.stops", "durak", language)} • {new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
              <Text style={styles.routePreview} numberOfLines={2}>{getSavedRoutePlaces(item).map((p: any) => getPlaceName(p)).filter(Boolean).join(" → ")}</Text>
            </TouchableOpacity>
            <View style={styles.routeActions}>
              <TouchableOpacity style={styles.smallActionButton} onPress={() => openRoute(item)}>
                <Ionicons name="navigate-outline" size={15} color={COLORS.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionButton} onPress={() => shareRouteText(item)}>
                <Ionicons name="share-social-outline" size={15} color={COLORS.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionButtonDanger} onPress={() => removeRoute(item.id)}>
                <Ionicons name="trash-outline" size={15} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    );
  };

  const renderJournal = () => {
    if (journalItems.length === 0) return <EmptyState icon="book-outline" title={safeT(t, "saved.noJournalTitle", "Gezi günlüğün boş", language)} text={safeT(t, "saved.noJournalText", "Haritada bir yere not eklediğinde burada görünür.", language)} />;
    return (
      <FlatList
        data={journalItems}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.journalCard}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.88}
              onPress={() => setSelectedJournal(item)}
            >
              {item.photoUri ? (
                <Image source={{ uri: item.photoUri }} style={styles.journalThumb} />
              ) : null}
              <Text style={styles.name}>{item.placeName}</Text>
              {item.locationLabel || item.city ? (
                <Text style={styles.meta}>{item.locationLabel || item.city}</Text>
              ) : null}
              <Text style={styles.noteText} numberOfLines={2}>“{item.note}”</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeButton} onPress={() => removeJournalNote(item.id)}>
              <Ionicons name="trash-outline" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <Modal
        visible={!!selectedJournal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedJournal(null)}
      >
        <View style={styles.journalDetailOverlay}>
          <View style={styles.journalDetailCard}>
            <View style={styles.journalDetailHeader}>
              <Text style={styles.journalDetailTitle}>
                {selectedJournal?.placeName || safeT(t, "saved.journal", "Günlük", language)}
              </Text>
              <TouchableOpacity style={styles.journalDetailClose} onPress={() => setSelectedJournal(null)}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedJournal?.photoUri ? (
              <Image source={{ uri: selectedJournal.photoUri }} style={styles.journalDetailImage} />
            ) : null}

            {selectedJournal?.locationLabel || selectedJournal?.city ? (
              <View style={styles.journalDetailLocation}>
                <Ionicons name="location-outline" size={15} color={COLORS.accent} />
                <Text style={styles.journalDetailLocationText}>
                  {selectedJournal?.locationLabel || selectedJournal?.city}
                </Text>
              </View>
            ) : null}

            <Text style={styles.journalDetailNote}>{selectedJournal?.note}</Text>

            {selectedJournal?.place ? (
              <TouchableOpacity
                style={styles.journalDetailButton}
                onPress={() => {
                  const place = selectedJournal.place;
                  setSelectedJournal(null);
                  openPlace(place);
                }}
              >
                <Text style={styles.journalDetailButtonText}>
                  {language === "tr" ? "Mekan Detayına Git" : "Open Place Detail"}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>


      <LinearGradient colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{safeT(t, "saved.title", "Favoriler", language)}</Text>
        <Text style={styles.subtitle}>{safeT(t, "saved.subtitle", "Favori yerlerin, offline rotaların ve gezi notların.", language)}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {renderTabs()}
        {activeTab === "places" && renderPlaces()}
        {activeTab === "visited" && renderVisited()}
        {activeTab === "routes" && renderRoutes()}
        {activeTab === "journal" && renderJournal()}
      </View>
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={34} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 32, fontWeight: "700", color: COLORS.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  tabsRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 18, padding: 5, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tabButton: { flex: 1, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  tabButtonActive: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.textSoft, fontWeight: "700", fontSize: 12, marginLeft: 5 },
  tabTextActive: { color: COLORS.white },
  emptyBox: { marginTop: 28, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 36, paddingHorizontal: 20, shadowColor: COLORS.shadow, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptyText: { color: COLORS.textSoft, fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  routeCard: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, marginBottom: 14, flexDirection: "row", borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  journalCard: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, marginBottom: 14, flexDirection: "row", borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  name: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 6, letterSpacing: -0.3 },
  meta: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20 },
  routePreview: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 8 },
  noteText: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginTop: 8 },
  routeActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  smallActionButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center", marginLeft: 6, borderWidth: 1, borderColor: COLORS.border },
  smallActionButtonDanger: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  removeButton: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accent, marginLeft: 8 },
  authGateCard: {
  backgroundColor: COLORS.surface,
  borderRadius: 24,
  padding: 24,
  margin: 20,
  alignItems: "center",
  borderWidth: 1,
  borderColor: COLORS.border,
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.2,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
},

authGateTitle: {
  color: COLORS.text,
  fontSize: 22,
  fontWeight: "800",
  marginTop: 12,
  marginBottom: 8,
},

authGateText: {
  color: COLORS.textSoft,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
  marginBottom: 18,
},

authGateButton: {
  backgroundColor: COLORS.accent,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 14,
},

authGateButtonText: {
  color: COLORS.white,
  fontSize: 14,
  fontWeight: "700",
},
  journalThumb: {
    width: "100%",
    height: 145,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    marginBottom: 10,
  },
  journalDetailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.30)",
    justifyContent: "flex-end",
  },
  journalDetailCard: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: "88%",
  },
  journalDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  journalDetailTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginRight: 10,
  },
  journalDetailClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  journalDetailImage: {
    width: "100%",
    height: 260,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSoft,
    marginBottom: 12,
  },
  journalDetailLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  journalDetailLocationText: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  journalDetailNote: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  journalDetailButton: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  journalDetailButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },
});

