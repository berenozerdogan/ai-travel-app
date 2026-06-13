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
  "settings.smartSummary": {
    tr: "AI Seyahat Özeti",
    en: "AI Travel Summary",
    de: "AI-Reiseübersicht",
    ru: "AI-сводка поездок",
  },
  "settings.summaryEmpty": {
    tr: "Henüz yeterli veri yok. Favori ekledikçe, rota oluşturdukça ve not tuttukça profilin kişiselleşir.",
    en: "Not enough data yet. Your profile becomes more personalized as you save places, create routes and add notes.",
    de: "Noch nicht genug Daten. Dein Profil wird persönlicher, wenn du Orte speicherst, Routen erstellst und Notizen hinzufügst.",
    ru: "Пока недостаточно данных. Профиль станет персональнее, когда вы сохраните места, маршруты и заметки.",
  },
  "settings.summaryActive": {
    tr: "Seyahat profilin oluşmaya başladı. Kaydettiğin yerler, ziyaretlerin ve rotaların uygulamanın sana daha iyi öneriler sunmasına yardımcı olur.",
    en: "Your travel profile has started to form. Saved places, visits and routes help the app make better recommendations.",
    de: "Dein Reiseprofil entsteht. Gespeicherte Orte, Besuche und Routen helfen der App, bessere Empfehlungen zu geben.",
    ru: "Ваш профиль путешествий начал формироваться. Сохранённые места, посещения и маршруты помогают приложению давать лучшие рекомендации.",
  },
  "settings.museumHunterBadge": {
    tr: "Müze Gezgini",
    en: "Museum Hunter",
    de: "Museumsjäger",
    ru: "Охотник за музеями",
  },
  "settings.travelPersonality": {
    tr: "Seyahat Kişiliğin",
    en: "Your Travel Personality",
    de: "Deine Reisepersönlichkeit",
    ru: "Ваш стиль путешествий",
  },
  "settings.cultureExplorer": {
    tr: "Kültür Kaşifi",
    en: "Culture Explorer",
    de: "Kulturentdecker",
    ru: "Исследователь культуры",
  },
  "settings.foodHunter": {
    tr: "Lezzet Avcısı",
    en: "Food Hunter",
    de: "Genussentdecker",
    ru: "Охотник за вкусами",
  },
  "settings.cityExplorer": {
    tr: "Şehir Kaşifi",
    en: "City Explorer",
    de: "Stadtentdecker",
    ru: "Городской исследователь",
  },
  "settings.routePlanner": {
    tr: "Rota Planlayıcı",
    en: "Route Planner",
    de: "Routenplaner",
    ru: "Планировщик маршрутов",
  },
  "settings.personalityCultureText": {
    tr: "Müze, tarihi mekan ve kültürel duraklara ilgin yüksek görünüyor.",
    en: "You seem interested in museums, historical places and cultural stops.",
    de: "Du interessierst dich offenbar für Museen, historische Orte und kulturelle Stopps.",
    ru: "Похоже, вам интересны музеи, исторические места и культурные точки.",
  },
  "settings.personalityFoodText": {
    tr: "Restoran, kafe ve yemek duraklarını keşfetmeyi seviyorsun.",
    en: "You enjoy exploring restaurants, cafés and food stops.",
    de: "Du erkundest gerne Restaurants, Cafés und Essensstopps.",
    ru: "Вам нравится открывать рестораны, кафе и гастрономические точки.",
  },
  "settings.personalityCityText": {
    tr: "Farklı şehirleri kaydetmeyi ve şehir bazlı keşif yapmayı seviyorsun.",
    en: "You like saving different cities and exploring by location.",
    de: "Du speicherst gerne verschiedene Städte und erkundest Orte nach Stadt.",
    ru: "Вам нравится сохранять разные города и исследовать места по локации.",
  },
  "settings.personalityRouteText": {
    tr: "Rota oluşturmayı ve gezilerini planlı ilerletmeyi seviyorsun.",
    en: "You like building routes and keeping your trips organized.",
    de: "Du erstellst gerne Routen und planst deine Reisen strukturiert.",
    ru: "Вам нравится строить маршруты и планировать поездки.",
  },
  "settings.travelProgress": {
    tr: "Seyahat İlerlemen",
    en: "Travel Progress",
    de: "Reisefortschritt",
    ru: "Прогресс путешествий",
  },
  "settings.savedPlaces": {
    tr: "Kaydedilen Yerler",
    en: "Saved Places",
    de: "Gespeicherte Orte",
    ru: "Сохранённые места",
  },
  "settings.visitedPlaces": {
    tr: "Ziyaretler",
    en: "Visits",
    de: "Besuche",
    ru: "Посещения",
  },
  "settings.travelNotes": {
    tr: "Gezi Notları",
    en: "Travel Notes",
    de: "Reisenotizen",
    ru: "Заметки",
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


function badgeEmoji(key: string) {
  const map: Record<string, string> = {
    explorer: "🧭",
    routeMaster: "🗺️",
    journalKeeper: "📖",
    cityCollector: "🏙️",
    foodLover: "🍽️",
    museumHunter: "🏛️",
  };

  return map[key] || "🏅";
}

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

  const travelPersonality = useMemo(() => {
    if (stats.museums >= Math.max(stats.restaurants, stats.routes, 1)) {
      return {
        icon: "business-outline",
        title: safeT(t, "settings.cultureExplorer", "Kültür Kaşifi", language),
        text: safeT(t, "settings.personalityCultureText", "Müze, tarihi mekan ve kültürel duraklara ilgin yüksek görünüyor.", language),
      };
    }

    if (stats.restaurants >= Math.max(stats.museums, stats.routes, 1)) {
      return {
        icon: "restaurant-outline",
        title: safeT(t, "settings.foodHunter", "Lezzet Avcısı", language),
        text: safeT(t, "settings.personalityFoodText", "Restoran, kafe ve yemek duraklarını keşfetmeyi seviyorsun.", language),
      };
    }

    if (stats.routes >= 2) {
      return {
        icon: "map-outline",
        title: safeT(t, "settings.routePlanner", "Rota Planlayıcı", language),
        text: safeT(t, "settings.personalityRouteText", "Rota oluşturmayı ve gezilerini planlı ilerletmeyi seviyorsun.", language),
      };
    }

    return {
      icon: "compass-outline",
      title: safeT(t, "settings.cityExplorer", "Şehir Kaşifi", language),
      text: safeT(t, "settings.personalityCityText", "Farklı şehirleri kaydetmeyi ve şehir bazlı keşif yapmayı seviyorsun.", language),
    };
  }, [stats, t, language]);

  const progressItems = useMemo(
    () => [
      {
        key: "places",
        label: safeT(t, "settings.savedPlaces", "Kaydedilen Yerler", language),
        value: Math.min(stats.places, 10),
        total: 10,
      },
      {
        key: "visited",
        label: safeT(t, "settings.visitedPlaces", "Ziyaretler", language),
        value: Math.min(stats.visited, 10),
        total: 10,
      },
      {
        key: "routes",
        label: safeT(t, "settings.route", "Rota", language),
        value: Math.min(stats.routes, 5),
        total: 5,
      },
      {
        key: "notes",
        label: safeT(t, "settings.travelNotes", "Gezi Notları", language),
        value: Math.min(stats.notes, 5),
        total: 5,
      },
    ],
    [stats, t, language]
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


        <View style={styles.smartSummaryCard}>
          <View style={styles.smartSummaryIcon}>
            <Ionicons name="sparkles-outline" size={22} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.smartSummaryTitle}>
              {safeT(t, "settings.smartSummary", "AI Seyahat Özeti", language)}
            </Text>
            <Text style={styles.smartSummaryText}>
              {stats.places + stats.routes + stats.notes + stats.visited > 0
                ? safeT(t, "settings.summaryActive", "Seyahat profilin oluşmaya başladı. Kaydettiğin yerler, ziyaretlerin ve rotaların uygulamanın sana daha iyi öneriler sunmasına yardımcı olur.", language)
                : safeT(t, "settings.summaryEmpty", "Henüz yeterli veri yok. Favori ekledikçe, rota oluşturdukça ve not tuttukça profilin kişiselleşir.", language)}
            </Text>
          </View>
        </View>


        <View style={styles.personalityCard}>
          <View style={styles.personalityTop}>
            <View style={styles.personalityIcon}>
              <Ionicons name={travelPersonality.icon as any} size={23} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personalitySectionTitle}>
                {safeT(t, "settings.travelPersonality", "Seyahat Kişiliğin", language)}
              </Text>
              <View style={styles.personalityPill}>
                <Text style={styles.personalityPillText}>{travelPersonality.title}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.personalityText}>{travelPersonality.text}</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            {safeT(t, "settings.travelProgress", "Seyahat İlerlemen", language)}
          </Text>

          {progressItems.map((item) => {
            const percent = Math.min(100, Math.round((item.value / item.total) * 100));

            return (
              <View key={item.key} style={styles.progressItem}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>{item.label}</Text>
                  <Text style={styles.progressValue}>{item.value}/{item.total}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>
              </View>
            );
          })}
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
                <View style={[styles.badgeMedal, badge.unlocked && styles.badgeMedalUnlocked]}>
                  <Text style={styles.badgeEmoji}>{badgeEmoji(badge.key)}</Text>
                </View>
                <Text style={[styles.badgeText, badge.unlocked && styles.badgeTextUnlocked]} numberOfLines={2}>
                  {badge.label}
                </Text>
                <Text style={[styles.badgeProgress, badge.unlocked && styles.badgeProgressUnlocked]}>
                  {badge.progress}
                </Text>
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

  smartSummaryCard: {
    backgroundColor: "#FFF1F4",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(232,93,117,0.18)",
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  smartSummaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  smartSummaryTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  smartSummaryText: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  personalityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  personalityTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  personalityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF1F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  personalitySectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 7,
  },
  personalityPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  personalityPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  personalityText: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  progressTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  progressValue: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  journalShortcut: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  shortcutIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginRight: 12 },
  shortcutTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  shortcutText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19 },
  achievementCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  achievementSubtitle: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeBox: {
    width: "31%",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
    opacity: 0.72,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeUnlocked: {
    backgroundColor: "#FFF7ED",
    opacity: 1,
    borderColor: "rgba(232,93,117,0.18)",
  },
  badgeMedal: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(107,114,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMedalUnlocked: {
    backgroundColor: "#FFE4EC",
  },
  badgeEmoji: {
    fontSize: 25,
  },
  badgeText: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "center",
    minHeight: 28,
  },
  badgeTextUnlocked: { color: COLORS.text },
  badgeProgress: {
    color: COLORS.textSoft,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  badgeProgressUnlocked: {
    color: COLORS.accent,
  },
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
