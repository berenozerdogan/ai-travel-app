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
  bg: "#131622",
  surface: "#1C1F30",
  surfaceSoft: "#272B42",
  border: "rgba(255, 255, 255, 0.03)",
  text: "#F1F3F9",
  textSoft: "#8E95B2",
  accent: "#D65A5A",
  white: "#FFFFFF",
  shadow: "#090A10",
};

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
        label: t("settings.explorerBadge"),
        unlocked: stats.places >= 3 || stats.visited >= 3,
        progress: `${Math.min(Math.max(stats.places, stats.visited), 3)}/3`,
      },
      {
        key: "routeMaster",
        icon: "map-outline",
        label: t("settings.routeMasterBadge"),
        unlocked: stats.routes >= 1,
        progress: `${Math.min(stats.routes, 1)}/1`,
      },
      {
        key: "journalKeeper",
        icon: "book-outline",
        label: t("settings.journalKeeperBadge"),
        unlocked: stats.notes >= 1,
        progress: `${Math.min(stats.notes, 1)}/1`,
      },
      {
        key: "cityCollector",
        icon: "business-outline",
        label: t("settings.cityCollectorBadge"),
        unlocked: stats.cities >= 2,
        progress: `${Math.min(stats.cities, 2)}/2`,
      },
      {
        key: "foodLover",
        icon: "restaurant-outline",
        label: t("settings.foodLoverBadge"),
        unlocked: stats.restaurants >= 2,
        progress: `${Math.min(stats.restaurants, 2)}/2`,
      },
      {
        key: "museumHunter",
        icon: "color-palette-outline",
        label: t("settings.museumHunterBadge"),
        unlocked: stats.museums >= 1,
        progress: `${Math.min(stats.museums, 1)}/1`,
      },
    ],
    [stats, t]
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1C1F30", "#161826", "#131622"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.title}>{t("tabs.profile")}</Text>
        <Text style={styles.subtitle}>{t("settings.subtitle")}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text style={styles.sectionTitle}>{t("settings.dashboard")}</Text>

        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="heart-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.places}</Text>
            <Text style={styles.statLabel}>{t("settings.favorite")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="checkmark-done-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.visited}</Text>
            <Text style={styles.statLabel}>{t("settings.visited")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="map-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.routes}</Text>
            <Text style={styles.statLabel}>{t("settings.route")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/saved" as any)}>
            <Ionicons name="book-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.notes}</Text>
            <Text style={styles.statLabel}>{t("settings.note")}</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Ionicons name="business-outline" size={21} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.cities}</Text>
            <Text style={styles.statLabel}>{t("settings.cities")}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.journalShortcut} onPress={() => router.push("/(tabs)/saved" as any)}>
          <View style={styles.shortcutIcon}>
            <Ionicons name="book-outline" size={23} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTitle}>{t("settings.travelJournal")}</Text>
            <Text style={styles.shortcutText}>{t("settings.journalShortcut")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textSoft} />
        </TouchableOpacity>

        <View style={styles.achievementCard}>
          <Text style={styles.section}>{t("settings.achievements")}</Text>
          <Text style={styles.achievementSubtitle}>{t("settings.achievementSubtitle")}</Text>
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
            <Text style={styles.shortcutTitle}>{t("emergency.title")}</Text>
            <Text style={styles.shortcutText}>{t("emergency.subtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.textSoft} />
        </TouchableOpacity>

        <View style={styles.sectionCard}>
          <Text style={styles.section}>{t("settings.language")}</Text>
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
                    {isActive ? t("common.selected") : t("common.tapToSwitch")}
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
  title: { fontSize: 32, fontWeight: "700", color: COLORS.white, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 },
  statBox: { width: "48%", backgroundColor: COLORS.surface, borderRadius: 22, alignItems: "center", paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  statValue: { color: COLORS.text, fontSize: 25, fontWeight: "800", marginTop: 6 },
  statLabel: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 2 },
  journalShortcut: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  shortcutIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginRight: 12 },
  shortcutTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  shortcutText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19 },
  achievementCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
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
