import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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


const PROFILE_FALLBACKS: Record<string, Record<string, string>> = {
  "tabs.profile": {
    tr: "Profil",
    en: "Profile",
    de: "Profil",
    ru: "Профиль",
  },
  "settings.subtitle": {
    tr: "Dil, kaydedilen rotalar ve gezi günlüğü özeti.",
    en: "Language, saved routes and travel journal summary.",
    de: "Sprache, gespeicherte Routen und Reisetagebuch-Übersicht.",
    ru: "Язык, сохранённые маршруты и сводка дневника путешествий.",
  },
  "settings.dashboard": {
    tr: "Özet Paneli",
    en: "Dashboard",
    de: "Übersicht",
    ru: "Панель обзора",
  },
  "settings.favorite": {
    tr: "Favori",
    en: "Favorite",
    de: "Favorit",
    ru: "Избранное",
  },
  "settings.visited": {
    tr: "Ziyaret Edildi",
    en: "Visited",
    de: "Besucht",
    ru: "Посещено",
  },
  "settings.route": {
    tr: "Rota",
    en: "Route",
    de: "Route",
    ru: "Маршрут",
  },
  "settings.note": {
    tr: "Not",
    en: "Note",
    de: "Notiz",
    ru: "Заметка",
  },
  "settings.cities": {
    tr: "Şehir",
    en: "City",
    de: "Stadt",
    ru: "Город",
  },
  "settings.travelJournal": {
    tr: "Gezi Günlüğü",
    en: "Travel Journal",
    de: "Reisetagebuch",
    ru: "Дневник путешествий",
  },
  "settings.journalShortcut": {
    tr: "Harita notlarını ve offline rotalarını görüntüle.",
    en: "View your map notes and offline routes.",
    de: "Sieh dir deine Kartennotizen und Offline-Routen an.",
    ru: "Просматривай заметки на карте и офлайн-маршруты.",
  },
  "settings.achievements": {
    tr: "Başarılar",
    en: "Achievements",
    de: "Erfolge",
    ru: "Достижения",
  },
  "settings.achievementSubtitle": {
    tr: "Gezdikçe rozetlerin açılır.",
    en: "Unlock badges as you explore.",
    de: "Schalte Abzeichen frei, während du reist.",
    ru: "Открывай значки во время путешествий.",
  },
  "settings.language": {
    tr: "Dil",
    en: "Language",
    de: "Sprache",
    ru: "Язык",
  },
  "common.selected": {
    tr: "Seçili",
    en: "Selected",
    de: "Ausgewählt",
    ru: "Выбрано",
  },
  "common.tapToSwitch": {
    tr: "Değiştirmek için dokun",
    en: "Tap to switch",
    de: "Zum Wechseln tippen",
    ru: "Нажми, чтобы изменить",
  },
  "emergency.title": {
    tr: "Acil / Faydalı Bilgiler",
    en: "Emergency / Useful Info",
    de: "Notfall / Nützliche Infos",
    ru: "Экстренная / Полезная информация",
  },
  "emergency.subtitle": {
    tr: "Seyahat sırasında hızlı erişebileceğin bilgiler.",
    en: "Helpful information you can quickly access while traveling.",
    de: "Hilfreiche Informationen für schnellen Zugriff auf Reisen.",
    ru: "Полезная информация для быстрого доступа в поездке.",
  },
  "settings.explorerBadge": {
    tr: "Kaşif",
    en: "Explorer",
    de: "Entdecker",
    ru: "Исследователь",
  },
  "settings.routeMasterBadge": {
    tr: "Rota Ustası",
    en: "Route Master",
    de: "Routenmeister",
    ru: "Мастер маршрутов",
  },
  "settings.journalKeeperBadge": {
    tr: "Günlük Tutucu",
    en: "Journal Keeper",
    de: "Tagebuchführer",
    ru: "Хранитель дневника",
  },
  "settings.cityCollectorBadge": {
    tr: "Şehir Koleksiyoncusu",
    en: "City Collector",
    de: "Städtesammler",
    ru: "Коллекционер городов",
  },
  "settings.foodLoverBadge": {
    tr: "Lezzet Avcısı",
    en: "Food Lover",
    de: "Food Lover",
    ru: "Любитель еды",
  },
  "settings.museumHunterBadge": {
    tr: "Müze Gezgini",
    en: "Museum Hunter",
    de: "Museumsjäger",
    ru: "Охотник за музеями",
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
  return PROFILE_FALLBACKS[key]?.[lang] || PROFILE_FALLBACKS[key]?.en || fallback;
}

type Stats = {
  places: number;
  routes: number;
  notes: number;
  visited: number;
  cities: number;
  restaurants: number;
  museums: number;
};

export default function Profile() {
  const { language, setLanguage, t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    places: 0,
    routes: 0,
    notes: 0,
    visited: 0,
    cities: 0,
    restaurants: 0,
    museums: 0,
  });

  const languages = [
    { key: "tr", label: "🇹🇷 Türkçe" },
    { key: "en", label: "🇬🇧 English" },
    { key: "de", label: "🇩🇪 Deutsch" },
    { key: "ru", label: "🇷🇺 Русский" },
  ];

  const loadStats = async () => {
    try {
      const placesRaw = await AsyncStorage.getItem("saved_places");
      const routesRaw = await AsyncStorage.getItem("saved_routes");
      const notesRaw = await AsyncStorage.getItem("user_place_notes");
      const visitedRaw = await AsyncStorage.getItem("visited_places");

      const places = placesRaw ? JSON.parse(placesRaw) : [];
      const routes = routesRaw ? JSON.parse(routesRaw) : [];
      const notes = notesRaw ? JSON.parse(notesRaw) : {};
      const visited = visitedRaw ? JSON.parse(visitedRaw) : [];

      const allKnownPlaces = [
        ...(Array.isArray(places) ? places : []),
        ...(Array.isArray(visited) ? visited : []),
      ];

      const citySet = new Set(
        allKnownPlaces
          .map((p: any) => String(p?.city || "").trim())
          .filter(Boolean)
      );

      setStats({
        places: Array.isArray(places) ? places.length : 0,
        routes: Array.isArray(routes) ? routes.length : 0,
        notes: Object.values(notes || {}).filter((v: any) => String(v || "").trim()).length,
        visited: Array.isArray(visited) ? visited.length : 0,
        cities: citySet.size,
        restaurants: allKnownPlaces.filter((p: any) => p?.category === "restaurant" || p?.category === "cafe").length,
        museums: allKnownPlaces.filter((p: any) => p?.category === "museum" || p?.subcategory === "museum").length,
      });
    } catch (error) {
      console.log(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const achievements = useMemo(
    () => [
      {
        key: "explorer",
        icon: "compass-outline",
        label: safeT(t, "settings.explorerBadge", "Kaşif", language),
        unlocked: stats.places >= 3 || stats.visited >= 3,
        progress: `${Math.min(Math.max(stats.places, stats.visited), 3)}/3`,
      },
      {
        key: "routeMaster",
        icon: "map-outline",
        label: safeT(t, "settings.routeMasterBadge", "Rota Ustası", language),
        unlocked: stats.routes >= 1,
        progress: `${Math.min(stats.routes, 1)}/1`,
      },
      {
        key: "journalKeeper",
        icon: "book-outline",
        label: safeT(t, "settings.journalKeeperBadge", "Günlük Tutucu", language),
        unlocked: stats.notes >= 1,
        progress: `${Math.min(stats.notes, 1)}/1`,
      },
      {
        key: "cityCollector",
        icon: "business-outline",
        label: safeT(t, "settings.cityCollectorBadge", "Şehir Koleksiyoncusu", language),
        unlocked: stats.cities >= 2,
        progress: `${Math.min(stats.cities, 2)}/2`,
      },
      {
        key: "foodLover",
        icon: "restaurant-outline",
        label: safeT(t, "settings.foodLoverBadge", "Lezzet Avcısı", language),
        unlocked: stats.restaurants >= 2,
        progress: `${Math.min(stats.restaurants, 2)}/2`,
      },
      {
        key: "museumHunter",
        icon: "color-palette-outline",
        label: safeT(t, "settings.museumHunterBadge", "Müze Gezgini", language),
        unlocked: stats.museums >= 1,
        progress: `${Math.min(stats.museums, 1)}/1`,
      },
    ],
    [stats, t]
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.title}>{safeT(t, "tabs.profile", "Profil", language)}</Text>
        <Text style={styles.subtitle}>{safeT(t, "settings.subtitle", "Dil, kaydedilen rotalar ve gezi günlüğü özeti.", language)}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text style={styles.sectionTitle}>{safeT(t, "settings.dashboard", "Özet Paneli", language)}</Text>

        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="heart-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.places}</Text>
            <Text style={styles.statLabel}>{safeT(t, "settings.favorite", "Favori", language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="checkmark-done-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.visited}</Text>
            <Text style={styles.statLabel}>{safeT(t, "settings.visited", "Ziyaret Edildi", language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="map-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.routes}</Text>
            <Text style={styles.statLabel}>{safeT(t, "settings.route", "Rota", language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="book-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.notes}</Text>
            <Text style={styles.statLabel}>{safeT(t, "settings.note", "Not", language)}</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Ionicons name="business-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.cities}</Text>
            <Text style={styles.statLabel}>{safeT(t, "settings.cities", "Şehir", language)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.journalShortcut} onPress={() => router.push("/(tabs)/saved" as any)}>
          <View style={styles.shortcutIcon}>
            <Ionicons name="book-outline" size={23} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTitle}>{safeT(t, "settings.travelJournal", "Gezi Günlüğü", language)}</Text>
            <Text style={styles.shortcutText}>{safeT(t, "settings.journalShortcut", "Harita notlarını ve offline rotalarını görüntüle.", language)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textSoft} />
        </TouchableOpacity>

        <View style={styles.achievementCard}>
          <Text style={styles.section}>{safeT(t, "settings.achievements", "Başarılar", language)}</Text>
          <Text style={styles.achievementSubtitle}>{safeT(t, "settings.achievementSubtitle", "Gezdikçe rozetlerin açılır.", language)}</Text>
          <View style={styles.badgeGrid}>
            {achievements.map((badge) => (
              <View key={badge.key} style={[styles.badgeBox, badge.unlocked && styles.badgeUnlocked]}>
                <Ionicons
                  name={badge.icon as any}
                  size={22}
                  color={badge.unlocked ? COLORS.white : COLORS.textSoft}
                />
                <Text style={[styles.badgeText, badge.unlocked && styles.badgeTextUnlocked]} numberOfLines={1}>
                  {badge.label}
                </Text>
                <Text style={styles.badgeProgress}>{badge.progress}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.journalShortcut} onPress={() => router.push("/emergency" as any)}>
          <View style={styles.shortcutIcon}>
            <Ionicons name="medkit-outline" size={23} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTitle}>{safeT(t, "emergency.title", "Acil / Faydalı Bilgiler", language)}</Text>
            <Text style={styles.shortcutText}>{safeT(t, "emergency.subtitle", "Seyahat sırasında hızlı erişebileceğin bilgiler.", language)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textSoft} />
        </TouchableOpacity>

        <View style={styles.sectionCard}>
          <Text style={styles.section}>{safeT(t, "settings.language", "Dil", language)}</Text>
          <View style={styles.grid}>
            {languages.map((item) => {
              const isActive = language === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.button, isActive && styles.active]}
                  onPress={() => setLanguage(item.key as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.buttonTop}>
                    <Text style={[styles.text, isActive && styles.activeText]}>{item.label}</Text>
                    {isActive && (
                      <View style={styles.checkWrap}>
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.helperText, isActive && styles.activeHelperText]}>
                    {isActive ? safeT(t, "common.selected", "Seçili", language) : safeT(t, "common.tapToSwitch", "Değiştirmek için dokun", language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  title: { fontSize: 32, fontWeight: "700", color: COLORS.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 },
  statBox: { width: "48%", backgroundColor: COLORS.surface, borderRadius: 22, alignItems: "center", paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, shadowColor: COLORS.shadow, shadowOpacity: 0.20, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  statValue: { color: COLORS.text, fontSize: 25, fontWeight: "800", marginTop: 6 },
  statLabel: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 2 },
  journalShortcut: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  shortcutIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginRight: 12 },
  shortcutTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  shortcutText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19 },
  achievementCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  achievementSubtitle: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeBox: { width: "48%", backgroundColor: COLORS.surfaceSoft, borderRadius: 18, padding: 12, alignItems: "center", marginBottom: 10, opacity: 0.55 },
  badgeUnlocked: { backgroundColor: COLORS.accent, opacity: 1 },
  badgeText: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 8, textAlign: "center" },
  badgeTextUnlocked: { color: COLORS.white },
  badgeProgress: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700", marginTop: 4 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  section: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 8, letterSpacing: 0.3 },
  grid: { gap: 12 },
  button: { backgroundColor: COLORS.surfaceSoft, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  active: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  buttonTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  text: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  activeText: { color: COLORS.white, fontWeight: "700" },
  helperText: { color: COLORS.textSoft, fontSize: 13, marginTop: 8 },
  activeHelperText: { color: "rgba(255,255,255,0.8)" },
});
