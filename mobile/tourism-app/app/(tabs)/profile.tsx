import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

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
  "auth.title": {
    tr: "Giriş Yap / Kayıt Ol",
    en: "Login / Register",
    de: "Anmelden / Registrieren",
    ru: "Вход / Регистрация",
  },
  "auth.subtitle": {
    tr: "Favorilerin, gezi günlüğün ve rozetlerin hesabına bağlı saklanır.",
    en: "Your favorites, travel journal and badges are saved to your account.",
    de: "Favoriten, Reisetagebuch und Abzeichen werden in deinem Konto gespeichert.",
    ru: "Избранное, дневник путешествий и значки сохраняются в вашем аккаунте.",
  },
  "auth.email": {
    tr: "E-posta",
    en: "Email",
    de: "E-Mail",
    ru: "Эл. почта",
  },
  "auth.password": {
    tr: "Şifre",
    en: "Password",
    de: "Passwort",
    ru: "Пароль",
  },
  "auth.login": {
    tr: "Giriş Yap",
    en: "Login",
    de: "Anmelden",
    ru: "Войти",
  },
  "auth.register": {
    tr: "Kayıt Ol",
    en: "Register",
    de: "Registrieren",
    ru: "Зарегистрироваться",
  },
  "auth.welcome": {
    tr: "Hoş Geldin",
    en: "Welcome",
    de: "Willkommen",
    ru: "Добро пожаловать",
  },
  "auth.accountReady": {
    tr: "Seyahat geçmişin, favorilerin ve başarıların bu hesapla ilişkilendirildi.",
    en: "Your travel history, favorites and achievements are linked to this account.",
    de: "Deine Reisehistorie, Favoriten und Erfolge sind mit diesem Konto verknüpft.",
    ru: "История поездок, избранное и достижения связаны с этим аккаунтом.",
  },
  "auth.logout": {
    tr: "Çıkış Yap",
    en: "Logout",
    de: "Abmelden",
    ru: "Выйти",
  },
  "auth.error": {
    tr: "Hata",
    en: "Error",
    de: "Fehler",
    ru: "Ошибка",
  },
  "auth.validEmail": {
    tr: "Geçerli bir e-posta adresi girmelisin.",
    en: "Please enter a valid email address.",
    de: "Bitte gib eine gültige E-Mail-Adresse ein.",
    ru: "Введите корректный адрес электронной почты.",
  },
  "auth.passwordRequired": {
    tr: "Şifreni girmelisin.",
    en: "Please enter your password.",
    de: "Bitte gib dein Passwort ein.",
    ru: "Введите пароль.",
  },
  "auth.passwordMin": {
    tr: "Şifre en az 6 karakter olmalı.",
    en: "Password must be at least 6 characters.",
    de: "Das Passwort muss mindestens 6 Zeichen lang sein.",
    ru: "Пароль должен содержать минимум 6 символов.",
  },
  "auth.loginSuccessTitle": {
    tr: "Giriş başarılı",
    en: "Login successful",
    de: "Anmeldung erfolgreich",
    ru: "Вход выполнен",
  },
  "auth.loginSuccessText": {
    tr: "Hesabına giriş yapıldı.",
    en: "You are now logged in.",
    de: "Du bist jetzt angemeldet.",
    ru: "Вы вошли в аккаунт.",
  },
  "auth.loginFailed": {
    tr: "Giriş başarısız. E-posta ve şifreni kontrol et.",
    en: "Login failed. Please check your email and password.",
    de: "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.",
    ru: "Не удалось войти. Проверьте почту и пароль.",
  },
  "auth.userNotFound": {
    tr: "Bu bilgilerle kullanıcı bulunamadı. E-posta veya şifre hatalı olabilir.",
    en: "No user was found with these details. Email or password may be wrong.",
    de: "Mit diesen Daten wurde kein Benutzer gefunden. E-Mail oder Passwort kann falsch sein.",
    ru: "Пользователь с такими данными не найден. Почта или пароль могут быть неверными.",
  },
  "auth.wrongPassword": {
    tr: "Şifre hatalı.",
    en: "Password is incorrect.",
    de: "Das Passwort ist falsch.",
    ru: "Неверный пароль.",
  },
  "auth.networkLogin": {
    tr: "İnternet bağlantısı nedeniyle giriş yapılamadı.",
    en: "Login failed due to internet connection.",
    de: "Anmeldung wegen Internetverbindung fehlgeschlagen.",
    ru: "Не удалось войти из-за интернет-соединения.",
  },
  "auth.registerSuccessTitle": {
    tr: "Kayıt başarılı",
    en: "Registration successful",
    de: "Registrierung erfolgreich",
    ru: "Регистрация успешна",
  },
  "auth.registerSuccessText": {
    tr: "Hesabın oluşturuldu. Artık favoriler, gezi günlüğü ve rozetler bu hesaba bağlı çalışacak.",
    en: "Your account has been created. Favorites, journal and badges will now be linked to it.",
    de: "Dein Konto wurde erstellt. Favoriten, Tagebuch und Abzeichen sind nun damit verknüpft.",
    ru: "Аккаунт создан. Избранное, дневник и значки теперь связаны с ним.",
  },
  "auth.registerFailed": {
    tr: "Kayıt oluşturulamadı. Lütfen bilgilerini kontrol et.",
    en: "Registration failed. Please check your information.",
    de: "Registrierung fehlgeschlagen. Bitte prüfe deine Angaben.",
    ru: "Не удалось зарегистрироваться. Проверьте данные.",
  },
  "auth.emailUsed": {
    tr: "Bu e-posta ile daha önce kayıt olunmuş. Giriş Yap butonunu kullanabilirsin.",
    en: "This email is already registered. You can use the Login button.",
    de: "Diese E-Mail ist bereits registriert. Nutze die Anmelden-Schaltfläche.",
    ru: "Этот адрес уже зарегистрирован. Используйте кнопку входа.",
  },
  "auth.invalidEmail": {
    tr: "E-posta formatı geçersiz.",
    en: "Email format is invalid.",
    de: "Das E-Mail-Format ist ungültig.",
    ru: "Неверный формат электронной почты.",
  },
  "auth.networkRegister": {
    tr: "İnternet bağlantısı nedeniyle kayıt oluşturulamadı.",
    en: "Registration failed due to internet connection.",
    de: "Registrierung wegen Internetverbindung fehlgeschlagen.",
    ru: "Не удалось зарегистрироваться из-за интернет-соединения.",
  },
  "settings.explorerBadgeDesc": {
    tr: "3 yer kaydettiğinde veya ziyaret ettiğinde açılır.",
    en: "Unlocks when you save or visit 3 places.",
    de: "Wird freigeschaltet, wenn du 3 Orte speicherst oder besuchst.",
    ru: "Открывается после сохранения или посещения 3 мест.",
  },
  "settings.routeMasterBadgeDesc": {
    tr: "En az 1 rota oluşturduğunda açılır.",
    en: "Unlocks when you create at least 1 route.",
    de: "Wird freigeschaltet, wenn du mindestens 1 Route erstellst.",
    ru: "Открывается после создания хотя бы 1 маршрута.",
  },
  "settings.journalKeeperBadgeDesc": {
    tr: "Gezi günlüğüne not veya fotoğraf eklediğinde açılır.",
    en: "Unlocks when you add a note or photo to your journal.",
    de: "Wird freigeschaltet, wenn du eine Notiz oder ein Foto hinzufügst.",
    ru: "Открывается после добавления заметки или фото в дневник.",
  },
  "settings.cityCollectorBadgeDesc": {
    tr: "2 farklı şehirden yer kaydettiğinde açılır.",
    en: "Unlocks when you save places from 2 different cities.",
    de: "Wird freigeschaltet, wenn du Orte aus 2 Städten speicherst.",
    ru: "Открывается после сохранения мест из 2 разных городов.",
  },
  "settings.foodLoverBadgeDesc": {
    tr: "2 restoran veya kafe keşfettiğinde açılır.",
    en: "Unlocks when you discover 2 restaurants or cafés.",
    de: "Wird freigeschaltet, wenn du 2 Restaurants oder Cafés entdeckst.",
    ru: "Открывается после открытия 2 ресторанов или кафе.",
  },
  "settings.museumHunterBadgeDesc": {
    tr: "En az 1 müze veya kültürel yer keşfettiğinde açılır.",
    en: "Unlocks when you discover at least 1 museum or cultural place.",
    de: "Wird freigeschaltet, wenn du mindestens 1 Museum oder Kulturort entdeckst.",
    ru: "Открывается после открытия хотя бы 1 музея или культурного места.",
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
  const { user, login, register, logout } = useAuth();
  const isAccountReady = !!user;
  const storageKey = (key: string) => isAccountReady ? `${key}_${user.uid}` : key;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      if (!isAccountReady) {
        setStats({ places: 0, routes: 0, notes: 0, visited: 0, cities: 0, restaurants: 0, museums: 0 });
        return;
      }
      const placesRaw = await AsyncStorage.getItem(storageKey("saved_places"));
      const routesRaw = await AsyncStorage.getItem(storageKey("saved_routes"));
      const notesRaw = await AsyncStorage.getItem(storageKey("user_place_notes"));
      const visitedRaw = await AsyncStorage.getItem(storageKey("visited_places"));

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
    }, [isAccountReady, user?.uid])
  );

  const achievements = useMemo(
    () => [
      {
        key: "explorer",
        desc: safeT(t, "settings.explorerBadgeDesc", "3 yer kaydettiğinde veya ziyaret ettiğinde açılır.", language),
        icon: "compass-outline",
        label: safeT(t, "settings.explorerBadge", "Kaşif", language),
        unlocked: stats.places >= 3 || stats.visited >= 3,
        progress: `${Math.min(Math.max(stats.places, stats.visited), 3)}/3`,
      },
      {
        key: "routeMaster",
        desc: safeT(t, "settings.routeMasterBadgeDesc", "En az 1 rota oluşturduğunda açılır.", language),
        icon: "map-outline",
        label: safeT(t, "settings.routeMasterBadge", "Rota Ustası", language),
        unlocked: stats.routes >= 1,
        progress: `${Math.min(stats.routes, 1)}/1`,
      },
      {
        key: "journalKeeper",
        desc: safeT(t, "settings.journalKeeperBadgeDesc", "Gezi günlüğüne not veya fotoğraf eklediğinde açılır.", language),
        icon: "book-outline",
        label: safeT(t, "settings.journalKeeperBadge", "Günlük Tutucu", language),
        unlocked: stats.notes >= 1,
        progress: `${Math.min(stats.notes, 1)}/1`,
      },
      {
        key: "cityCollector",
        desc: safeT(t, "settings.cityCollectorBadgeDesc", "2 farklı şehirden yer kaydettiğinde açılır.", language),
        icon: "business-outline",
        label: safeT(t, "settings.cityCollectorBadge", "Şehir Koleksiyoncusu", language),
        unlocked: stats.cities >= 2,
        progress: `${Math.min(stats.cities, 2)}/2`,
      },
      {
        key: "foodLover",
        desc: safeT(t, "settings.foodLoverBadgeDesc", "2 restoran veya kafe keşfettiğinde açılır.", language),
        icon: "restaurant-outline",
        label: safeT(t, "settings.foodLoverBadge", "Lezzet Avcısı", language),
        unlocked: stats.restaurants >= 2,
        progress: `${Math.min(stats.restaurants, 2)}/2`,
      },
      {
        key: "museumHunter",
        desc: safeT(t, "settings.museumHunterBadgeDesc", "En az 1 müze veya kültürel yer keşfettiğinde açılır.", language),
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

        {!user ? (
          <View style={styles.authCard}>
            <View style={styles.authHeader}>
              <View style={styles.authIcon}>
                <Ionicons name="person-circle-outline" size={26} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authTitle}>
                  {safeT(t, "auth.title", "Giriş Yap / Kayıt Ol", language)}
                </Text>
                <Text style={styles.authSubtitle}>
                  {safeT(t, "auth.subtitle", "Favorilerin, gezi günlüğün ve rozetlerin hesabına bağlı saklanır.", language)}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.authInput}
              placeholder={safeT(t, "auth.email", "E-posta", language)}
              placeholderTextColor={COLORS.textSoft}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.authInput}
              placeholder={safeT(t, "auth.password", "Şifre", language)}
              placeholderTextColor={COLORS.textSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.authRow}>
              <TouchableOpacity
                style={styles.authButton}
                onPress={async () => {
                  const cleanEmail = email.trim();
                  const cleanPassword = password.trim();

                  if (!cleanEmail || !cleanEmail.includes("@")) {
                    Alert.alert(
                      safeT(t, "auth.error", "Hata", language),
                      safeT(t, "auth.validEmail", "Geçerli bir e-posta adresi girmelisin.", language)
                    );
                    return;
                  }

                  if (!cleanPassword) {
                    Alert.alert(
                      safeT(t, "auth.error", "Hata", language),
                      safeT(t, "auth.passwordRequired", "Şifreni girmelisin.", language)
                    );
                    return;
                  }

                  try {
                    await login(cleanEmail, cleanPassword);
                    setPassword("");
                    Alert.alert(
                      safeT(t, "auth.loginSuccessTitle", "Giriş başarılı", language),
                      safeT(t, "auth.loginSuccessText", "Hesabına giriş yapıldı.", language)
                    );
                  } catch (e: any) {
                    const code = String(e?.code || "");
                    let message = safeT(t, "auth.loginFailed", "Giriş başarısız. E-posta ve şifreni kontrol et.", language);

                    if (code.includes("user-not-found") || code.includes("invalid-credential")) {
                      message = safeT(t, "auth.userNotFound", "Bu bilgilerle kullanıcı bulunamadı. E-posta veya şifre hatalı olabilir.", language);
                    } else if (code.includes("wrong-password")) {
                      message = safeT(t, "auth.wrongPassword", "Şifre hatalı.", language);
                    } else if (code.includes("network-request-failed")) {
                      message = safeT(t, "auth.networkLogin", "İnternet bağlantısı nedeniyle giriş yapılamadı.", language);
                    }

                    Alert.alert(safeT(t, "auth.error", "Hata", language), message);
                  }
                }}
              >
                <Text style={styles.authButtonText}>
                  {safeT(t, "auth.login", "Giriş Yap", language)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authButtonSecondary}
                onPress={async () => {
                  const cleanEmail = email.trim();
                  const cleanPassword = password.trim();

                  if (!cleanEmail || !cleanEmail.includes("@")) {
                    Alert.alert(
                      safeT(t, "auth.error", "Hata", language),
                      safeT(t, "auth.validEmail", "Geçerli bir e-posta adresi girmelisin.", language)
                    );
                    return;
                  }

                  if (cleanPassword.length < 6) {
                    Alert.alert(
                      safeT(t, "auth.error", "Hata", language),
                      safeT(t, "auth.passwordMin", "Şifre en az 6 karakter olmalı.", language)
                    );
                    return;
                  }

                  try {
                    await register(cleanEmail, cleanPassword);
                    setPassword("");
                    Alert.alert(
                      safeT(t, "auth.registerSuccessTitle", "Kayıt başarılı", language),
                      safeT(t, "auth.registerSuccessText", "Hesabın oluşturuldu. Artık favoriler, gezi günlüğü ve rozetler bu hesaba bağlı çalışacak.", language)
                    );
                  } catch (e: any) {
                    const code = String(e?.code || "");
                    let message = safeT(t, "auth.registerFailed", "Kayıt oluşturulamadı. Lütfen bilgilerini kontrol et.", language);

                    if (code.includes("email-already-in-use")) {
                      message = safeT(t, "auth.emailUsed", "Bu e-posta ile daha önce kayıt olunmuş. Giriş Yap butonunu kullanabilirsin.", language);
                    } else if (code.includes("invalid-email")) {
                      message = safeT(t, "auth.invalidEmail", "E-posta formatı geçersiz.", language);
                    } else if (code.includes("weak-password")) {
                      message = safeT(t, "auth.passwordMin", "Şifre en az 6 karakter olmalı.", language);
                    } else if (code.includes("network-request-failed")) {
                      message = safeT(t, "auth.networkRegister", "İnternet bağlantısı nedeniyle kayıt oluşturulamadı.", language);
                    }

                    Alert.alert(safeT(t, "auth.error", "Hata", language), message);
                  }
                }}
              >
                <Text style={styles.authButtonSecondaryText}>
                  {safeT(t, "auth.register", "Kayıt Ol", language)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.authCard}>
            <View style={styles.authHeader}>
              <View style={styles.authIcon}>
                <Ionicons name="checkmark-circle-outline" size={26} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authTitle}>
                  {safeT(t, "auth.welcome", "Hoş Geldin", language)}
                </Text>
                <Text style={styles.authEmail}>{user.email}</Text>
                <Text style={styles.authSubtitle}>
                  {safeT(t, "auth.accountReady", "Seyahat geçmişin, favorilerin ve başarıların bu hesapla ilişkilendirildi.", language)}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.authButtonText}>
                {safeT(t, "auth.logout", "Çıkış Yap", language)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!user ? null : (
          <>
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
                <Text style={styles.badgeDesc} numberOfLines={3}>
                  {badge.desc}
                </Text>
                <Text style={[styles.badgeProgress, badge.unlocked && styles.badgeProgressUnlocked]}>
                  {badge.progress}
                </Text>
              </View>
            ))}
          </View>
        </View>

          </>
        )}

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

  lockedCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  lockedTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900", marginTop: 10, marginBottom: 6, textAlign: "center" },
  lockedText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 20, textAlign: "center", fontWeight: "600" },

  authCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  authHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFF1F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  authTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  authSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  authEmail: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  authInput: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  authRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  authButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  authButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authButtonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 13,
  },
  authButtonSecondaryText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
  },

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
    width: "48%",
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
  badgeDesc: {
    color: COLORS.textSoft,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 40,
    marginTop: 4,
  },
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
