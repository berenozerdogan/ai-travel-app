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
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

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

type TabKey = "places" | "visited" | "routes" | "journal";

export default function Saved() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("places");
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [journalItems, setJournalItems] = useState<any[]>([]);

  const loadAllSavedData = async () => {
    try {
      const placesRaw = await AsyncStorage.getItem("saved_places");
      const routesRaw = await AsyncStorage.getItem("saved_routes");
      const notesRaw = await AsyncStorage.getItem("user_place_notes");
      const visitedRaw = await AsyncStorage.getItem("visited_places");

      const places = placesRaw ? JSON.parse(placesRaw) : [];
      const routes = routesRaw ? JSON.parse(routesRaw) : [];
      const notes = notesRaw ? JSON.parse(notesRaw) : {};
      const visited = visitedRaw ? JSON.parse(visitedRaw) : [];

      setSavedPlaces(Array.isArray(places) ? places : []);
      setSavedRoutes(Array.isArray(routes) ? routes : []);
      setVisitedPlaces(Array.isArray(visited) ? visited : []);

      const noteList = Object.keys(notes || {})
        .map((id) => {
          const place = Array.isArray(places)
            ? places.find((p: any) => String(p.id) === String(id))
            : null;
          return {
            id,
            note: notes[id],
            placeName: place?.name || `Mekan #${id}`,
            city: place?.city || "",
            place,
          };
        })
        .filter((item) => String(item.note || "").trim().length > 0);

      setJournalItems(noteList);
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
    }, [])
  );

  const removePlace = async (id: number) => {
    try {
      const updated = savedPlaces.filter((item) => Number(item.id) !== Number(id));
      setSavedPlaces(updated);
      await AsyncStorage.setItem("saved_places", JSON.stringify(updated));
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
      await AsyncStorage.setItem("visited_places", JSON.stringify(updated));
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
      await AsyncStorage.setItem("saved_routes", JSON.stringify(updated));
    } catch (error) {
      console.log(error);
      Alert.alert(safeT(t, "saved.removeErrorTitle", "Hata", language), safeT(t, "saved.routeRemoveError", "Rota silinemedi.", language));
    }
  };

  const removeJournalNote = async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem("user_place_notes");
      const notes = raw ? JSON.parse(raw) : {};
      delete notes[id];
      await AsyncStorage.setItem("user_place_notes", JSON.stringify(notes));
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
    router.push({
      pathname: "/(tabs)/map",
      params: { route: JSON.stringify(route.places || []) },
    });
  };

  const shareRouteText = async (route: any) => {
    const text = (route.places || [])
      .map((place: any, index: number) => `${index + 1}. ${place.name} - ${place.city || ""}`)
      .join("\n");

    await Linking.openURL(`mailto:?subject=${encodeURIComponent(route.title || "Saved Route")}&body=${encodeURIComponent(text)}`).catch(() => {});
  };

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
              <Text style={styles.meta} numberOfLines={1}>{item.city} • {item.category} • ⭐ {item.rating}</Text>
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
              <Text style={styles.meta} numberOfLines={1}>{item.city} • {item.category} • ⭐ {item.rating}</Text>
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
              <Text style={styles.meta}>{item.places?.length || 0} {safeT(t, "saved.stops", "durak", language)} • {new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
              <Text style={styles.routePreview} numberOfLines={2}>{(item.places || []).map((p: any) => p.name).join(" → ")}</Text>
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
            <TouchableOpacity style={{ flex: 1 }} onPress={() => item.place ? openPlace(item.place) : null}>
              <Text style={styles.name}>{item.placeName}</Text>
              {item.city ? <Text style={styles.meta}>{item.city}</Text> : null}
              <Text style={styles.noteText}>“{item.note}”</Text>
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
});
