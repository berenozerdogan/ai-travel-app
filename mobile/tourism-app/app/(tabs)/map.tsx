import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  Linking,
  Share,
  TextInput,
  Image,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

type Place = {
  id: number;
  name: string;
  city: string;
  district?: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  review_count?: number;
  price_level?: string;
  image?: string;
  description?: string;
  estimated_visit_time?: number;
  distance_km?: number;
};

type Cluster = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  count: number;
  color: string;
  city?: string;
};

const API_BASE_URL = "https://ai-travel-app-2zso.onrender.com";

const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31,41,55,0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  white: "#FFFFFF",
  blue: "#38BDF8",
  orange: "#F59E0B",
  green: "#22C55E",
  purple: "#7C3AED",
  yellow: "#FACC15",
  shadow: "#D6CEC2",
};

const TURKEY_REGION: Region = {
  latitude: 39.1,
  longitude: 35.4,
  latitudeDelta: 7.2,
  longitudeDelta: 11.4,
};

const CATEGORY_CONFIG = [
  {
    key: "all",
    labelKey: "map.all",
    fallback: "Tümü",
    icon: "apps-outline",
    color: COLORS.accent,
  },
  {
    key: "attraction",
    labelKey: "map.attractions",
    fallback: "Gezilecek Yer",
    icon: "business-outline",
    color: COLORS.accent,
  },
  {
    key: "restaurant",
    labelKey: "map.food",
    fallback: "Yemek",
    icon: "restaurant-outline",
    color: COLORS.orange,
  },
  {
    key: "hotel",
    labelKey: "map.hotels",
    fallback: "Otel",
    icon: "bed-outline",
    color: COLORS.blue,
  },
  {
    key: "saved",
    labelKey: "map.saved",
    fallback: "Kaydedilenler",
    icon: "heart-outline",
    color: COLORS.purple,
  },
] as const;

const CLUSTER_COLORS = [
  "#7C3AED",
  "#F59E0B",
  "#38BDF8",
  "#22C55E",
  "#E85D75",
  "#FACC15",
];

const MAP_FALLBACKS: Record<string, Record<string, string>> = {
  "map.all": { tr: "Tümü", en: "All", de: "Alle", ru: "Все" },
  "map.attractions": { tr: "Gezilecek Yer", en: "Attractions", de: "Sehenswürdigkeiten", ru: "Достопримечательности" },
  "map.food": { tr: "Yemek", en: "Food", de: "Essen", ru: "Еда" },
  "map.hotels": { tr: "Otel", en: "Hotel", de: "Hotel", ru: "Отель" },
  "map.saved": { tr: "Kaydedilenler", en: "Saved", de: "Gespeichert", ru: "Сохранённое" },
  "map.youAreHere": { tr: "Konumun", en: "You are here", de: "Du bist hier", ru: "Вы здесь" },
  "map.locationPermissionTitle": { tr: "İzin gerekli", en: "Permission needed", de: "Berechtigung erforderlich", ru: "Нужно разрешение" },
  "map.locationPermissionMessage": { tr: "Yakındaki yerleri bulmak için konum izni vermelisin.", en: "Please allow location permission to find nearby places.", de: "Bitte erlaube den Standortzugriff, um Orte in der Nähe zu finden.", ru: "Разрешите доступ к геолокации, чтобы найти места рядом." },
  "map.tripMap": { tr: "Gezi Haritası", en: "Trip Map", de: "Reisekarte", ru: "Карта поездки" },
  "map.routeSavedTitle": { tr: "Rota kaydedildi", en: "Route saved", de: "Route gespeichert", ru: "Маршрут сохранён" },
  "map.routeSavedMessage": { tr: "Bu rotayı Favoriler > Rotalar bölümünde görebilirsin.", en: "You can view this route in Favorites > Routes.", de: "Du findest diese Route unter Favoriten > Routen.", ru: "Маршрут можно посмотреть в Избранное > Маршруты." },
  "map.routeSaveError": { tr: "Rota kaydedilemedi.", en: "Could not save route.", de: "Route konnte nicht gespeichert werden.", ru: "Не удалось сохранить маршрут." },
  "map.yourRoute": { tr: "Rotan", en: "Your Route", de: "Deine Route", ru: "Твой маршрут" },
  "map.noteSavedTitle": { tr: "Kaydedildi", en: "Saved", de: "Gespeichert", ru: "Сохранено" },
  "map.noteSavedMessage": { tr: "Seyahat notun başarıyla kaydedildi.", en: "Your travel note was saved successfully.", de: "Deine Reisenotiz wurde gespeichert.", ru: "Заметка о поездке сохранена." },
  "map.weatherAdvice": { tr: "Hava Durumu Önerisi", en: "Weather Advice", de: "Wetterempfehlung", ru: "Совет по погоде" },
  "map.emergencyInfo": { tr: "Acil / Faydalı Bilgiler", en: "Emergency / Useful Info", de: "Notfall / Nützliche Infos", ru: "Экстренная / Полезная информация" },
  "map.usefulInfoSubtitle": { tr: "Yakındaki önemli yerleri aç", en: "Open nearby important places", de: "Wichtige Orte in der Nähe öffnen", ru: "Открыть важные места рядом" },
  "map.nearbyHospitals": { tr: "Yakındaki hastaneler", en: "Nearby hospitals", de: "Krankenhäuser in der Nähe", ru: "Больницы рядом" },
  "map.nearbyPharmacies": { tr: "Yakındaki eczaneler", en: "Nearby pharmacies", de: "Apotheken in der Nähe", ru: "Аптеки рядом" },
  "map.nearbyPolice": { tr: "Yakındaki polis merkezleri", en: "Nearby police stations", de: "Polizeistationen in der Nähe", ru: "Полицейские участки рядом" },
  "map.nearbyTransport": { tr: "Yakındaki toplu taşıma", en: "Nearby public transport", de: "ÖPNV in der Nähe", ru: "Общественный транспорт рядом" },
  "map.nearbyPlaces": { tr: "Yerler", en: "Places", de: "Orte", ru: "Места" },
  "map.found": { tr: "bulundu", en: "found", de: "gefunden", ru: "найдено" },
  "map.share": { tr: "Paylaş", en: "Share", de: "Teilen", ru: "Поделиться" },
  "map.refit": { tr: "Ortala", en: "Center", de: "Zentrieren", ru: "Центрировать" },
  "map.saveRoute": { tr: "Kaydet", en: "Save", de: "Speichern", ru: "Сохранить" },
  "map.stopsInPlan": { tr: "durak planda", en: "stops in plan", de: "Stopps im Plan", ru: "остановок в плане" },
  "common.error": { tr: "Hata", en: "Error", de: "Fehler", ru: "Ошибка" },

  "map.restaurant": { tr: "Restoran", en: "Restaurant", de: "Restaurant", ru: "Ресторан" },
  "map.turkey": { tr: "Türkiye", en: "Turkey", de: "Türkei", ru: "Турция" },
  "map.explorePlan": { tr: "Haritayı keşfet ve planını yap", en: "Explore the map and plan your trip", de: "Entdecke die Karte und plane deine Reise", ru: "Изучай карту и планируй поездку" },
  "map.filter": { tr: "Filtrele", en: "Filter", de: "Filtern", ru: "Фильтр" },
  "map.howToUse": { tr: "Nasıl Kullanılır?", en: "How to use?", de: "Wie benutzt man es?", ru: "Как использовать?" },
  "map.helpText": { tr: "Kümelere tıklayarak daha fazla yeri görüntüleyebilir, yakınlaştırarak detayları keşfedebilirsin.", en: "Tap clusters to view more places and zoom in to explore details.", de: "Tippe auf Cluster, um mehr Orte zu sehen, und zoome hinein, um Details zu entdecken.", ru: "Нажимай на кластеры, чтобы увидеть больше мест, и приближай карту для деталей." },
  "map.approxDistance": { tr: "Yaklaşık Mesafe", en: "Approx. Distance", de: "Ungefähre Distanz", ru: "Примерное расстояние" },
  "map.estimatedTime": { tr: "Tahmini Süre", en: "Estimated Time", de: "Geschätzte Zeit", ru: "Примерное время" },
  "map.routeScore": { tr: "Rota Uygunluk Skoru", en: "Route Match Score", de: "Routen-Eignung", ru: "Оценка маршрута" },
  "map.routeNote": { tr: "Mesafe ve süre yaklaşık hesaplanır. Gerçek yol ve trafik için Yol Tarifi kullan.", en: "Distance and time are approximate. Use Directions for real roads and traffic.", de: "Distanz und Zeit sind ungefähr. Nutze Wegbeschreibung für echte Straßen und Verkehr.", ru: "Расстояние и время приблизительные. Для дорог и трафика используй Маршрут." },
  "map.nextStop": { tr: "Sıradaki Durak", en: "Next Stop", de: "Nächster Stopp", ru: "Следующая остановка" },
  "map.followingStop": { tr: "Sonraki", en: "Following", de: "Danach", ru: "Далее" },
  "map.lastStop": { tr: "Rotanın son durağı", en: "Last stop of the route", de: "Letzter Stopp der Route", ru: "Последняя остановка маршрута" },
  "map.routeStops": { tr: "Rota Durakları", en: "Route Stops", de: "Routenstopps", ru: "Остановки маршрута" },
  "map.stops": { tr: "durak", en: "stops", de: "Stopps", ru: "остановок" },
  "map.budgetSummary": { tr: "AI Bütçe Özeti", en: "AI Budget Summary", de: "AI-Budgetübersicht", ru: "AI-сводка бюджета" },
  "map.foodCost": { tr: "Yemek", en: "Food", de: "Essen", ru: "Еда" },
  "map.hotelCost": { tr: "Otel", en: "Hotel", de: "Hotel", ru: "Отель" },
  "map.transportCost": { tr: "Ulaşım", en: "Transport", de: "Transport", ru: "Транспорт" },
  "map.entryCost": { tr: "Giriş", en: "Entry", de: "Eintritt", ru: "Вход" },
  "map.directions": { tr: "Yol Tarifi", en: "Directions", de: "Wegbeschreibung", ru: "Маршрут" },
  "map.addToJournal": { tr: "Günlüğe Ekle", en: "Add to Journal", de: "Zum Tagebuch hinzufügen", ru: "Добавить в дневник" },
  "map.journalAddedTitle": { tr: "Günlüğe eklendi", en: "Added to journal", de: "Zum Tagebuch hinzugefügt", ru: "Добавлено в дневник" },
  "map.journalAddedMessage": { tr: "Bu rota seyahat günlüğüne kaydedildi.", en: "This route was saved to your travel journal.", de: "Diese Route wurde in deinem Reisetagebuch gespeichert.", ru: "Этот маршрут сохранён в дневник путешествий." },
  "map.journalAddError": { tr: "Rota günlüğe eklenemedi.", en: "Could not add route to journal.", de: "Route konnte nicht zum Tagebuch hinzugefügt werden.", ru: "Не удалось добавить маршрут в дневник." },
  "map.myLocation": { tr: "Konumum", en: "My location", de: "Mein Standort", ru: "Моя геолокация" },
  "map.nearMeTitle": { tr: "Yakınımdaki Yerler", en: "Nearby Places", de: "Orte in der Nähe", ru: "Места рядом" },
  "map.nearMeSubtitle": { tr: "Konumuna en yakın gezi noktaları", en: "Closest places to your location", de: "Nächste Orte zu deinem Standort", ru: "Ближайшие места к вам" },
  "map.showNearMe": { tr: "Yakınımda Ne Var?", en: "What is nearby?", de: "Was ist in der Nähe?", ru: "Что рядом?" },
};

function safeT(
  t: (key: string) => string,
  key: string,
  fallback: string,
  language = "en"
) {
  const value = t(key);
  if (value && value !== key) return value;

  const lang = String(language || "en").toLowerCase();
  return MAP_FALLBACKS[key]?.[lang] || MAP_FALLBACKS[key]?.en || fallback;
}

function normalizeCategory(category?: string) {
  const c = String(category || "").toLowerCase();

  if (c.includes("restaurant") || c.includes("food") || c.includes("cafe")) return "restaurant";
  if (c.includes("hotel")) return "hotel";

  if (
    c.includes("attraction") ||
    c.includes("tourism") ||
    c.includes("museum") ||
    c.includes("park") ||
    c.includes("landmark") ||
    c.includes("historical") ||
    c.includes("palace") ||
    c.includes("mosque")
  ) {
    return "attraction";
  }

  return c || "attraction";
}

function categoryDisplay(category: string | undefined, language: string) {
  const c = normalizeCategory(category);

  if (c === "restaurant") {
    if (language === "tr") return "Restoran";
    if (language === "de") return "Restaurant";
    if (language === "ru") return "Ресторан";
    return "Restaurant";
  }

  if (c === "hotel") {
    if (language === "tr") return "Otel";
    if (language === "de") return "Hotel";
    if (language === "ru") return "Отель";
    return "Hotel";
  }
  if (
  c === "landmark" ||
  c === "historical" ||
  c === "museum" ||
  c === "tourism"
) {
  if (language === "tr") return "Gezilecek Yer";
  if (language === "de") return "Sehenswürdigkeit";
  if (language === "ru") return "Достопримечательность";
  return "Attraction";
}
  if (c === "attraction") {
    if (language === "tr") return "Gezilecek Yer";
    if (language === "de") return "Sehenswürdigkeit";
    if (language === "ru") return "Достопримечательность";
    return "Attraction";
  }

  return category || "";
}


function cleanGuideDescription(description: string, language: string) {
  const raw = String(description || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return "";

  if (
    lower === "unknown" ||
    lower === "null" ||
    lower === "undefined" ||
    lower.includes("restaurant in") ||
    lower.includes("hotel in") ||
    lower.includes("hotel on") ||
    lower.includes("landmark in") ||
    lower.length < 12
  ) {
    return "";
  }

  return raw.replace(/\s+/g, " ").replace(/\.$/, "");
}

function placeMood(category: string, subcategory: string | undefined, language: string) {
  const c = normalizeCategory(category);
  const s = String(subcategory || "").toLowerCase();

  if (language === "tr") {
    if (c === "restaurant") return "yemek molası, dinlenme ve çevreyi hissetmek için güzel bir durak";
    if (c === "hotel") return "rotanı daha rahat planlamak ve konaklamayı kolaylaştırmak için uygun bir nokta";
    if (s.includes("nature") || s.includes("beach") || s.includes("view")) return "açık hava, manzara ve sakin bir keşif için güzel bir seçenek";
    if (s.includes("museum") || s.includes("historical") || s.includes("landmark")) return "tarih, kültür ve mimari dokuyu hissetmek için öne çıkan bir durak";
    return "şehir rotana keyifli bir keşif molası ekleyebilecek bir nokta";
  }

  if (language === "de") {
    if (c === "restaurant") return "ein guter Stopp für eine Essenspause und eine kurze Erholung";
    if (c === "hotel") return "ein praktischer Punkt, um deine Reise entspannter zu planen";
    if (s.includes("nature") || s.includes("beach") || s.includes("view")) return "eine schöne Option für Natur, Aussicht und eine ruhige Entdeckung";
    if (s.includes("museum") || s.includes("historical") || s.includes("landmark")) return "ein besonderer Stopp für Geschichte, Kultur und Architektur";
    return "ein angenehmer Entdeckungspunkt für deine Route";
  }

  if (language === "ru") {
    if (c === "restaurant") return "хорошая остановка для еды, отдыха и небольшой паузы";
    if (c === "hotel") return "удобная точка, чтобы сделать поездку спокойнее и комфортнее";
    if (s.includes("nature") || s.includes("beach") || s.includes("view")) return "хороший вариант для природы, видов и спокойной прогулки";
    if (s.includes("museum") || s.includes("historical") || s.includes("landmark")) return "интересная остановка для истории, культуры и архитектуры";
    return "приятная точка для короткого знакомства с маршрутом";
  }

  if (c === "restaurant") return "a good stop for food, rest and a short break";
  if (c === "hotel") return "a practical point for making your trip more comfortable";
  if (s.includes("nature") || s.includes("beach") || s.includes("view")) return "a good option for nature, views and a calm discovery";
  if (s.includes("museum") || s.includes("historical") || s.includes("landmark")) return "a strong stop for history, culture and architecture";
  return "a pleasant discovery point for your route";
}

function guideTextForPlace(place: Place, language: string) {
  const city = place.city || "Türkiye";
  const district = place.district
    ? String(place.district).replace(/^\d{5}\s*/, "").split(/[\/,]/)[0].trim()
    : "";

  const name = place.name;
  const c = normalizeCategory(place.category);
  const sub = String(place.subcategory || "").toLowerCase();
  const tags = "";
  const visitTime = Number(place.estimated_visit_time || 45);

  const description = String(place.description || "").toLowerCase();

const isNature =
  sub.includes("nature") ||
  sub.includes("beach") ||
  sub.includes("park") ||
  description.includes("nature") ||
  description.includes("park") ||
  description.includes("forest") ||
  description.includes("beach");

const isHistorical =
  sub.includes("historical") ||
  sub.includes("museum") ||
  sub.includes("history") ||
  description.includes("historical") ||
  description.includes("history") ||
  description.includes("museum") ||
  description.includes("palace") ||
  description.includes("mosque");
  if (language === "tr") {
    if (c === "restaurant") {
      return `${name}, ${city}${district ? " " + district : ""} bölgesinde rotana keyifli bir mola ekleyebileceğin bir yeme içme durağı. Burayı özellikle gezi arasında dinlenmek, çevreyi izlemek ve kısa bir ara vermek için değerlendirebilirsin. Ortalama mola süresi yaklaşık ${visitTime} dakika.`;
    }

    if (c === "hotel") {
      return `${name}, ${city}${district ? " " + district : ""} bölgesinde konaklama planı yaparken değerlendirebileceğin bir nokta. Çevredeki gezilecek yerlere yakınlığına, ulaşım kolaylığına ve rotana uygunluğuna bakmanı öneririm.`;
    }

    if (isNature) {
      return `${name}, ${city}${district ? " " + district : ""} bölgesinde doğa, manzara ve sakin bir keşif için güzel bir durak. Burada acele etmeden yürüyebilir, fotoğraf çekebilir ve rotana daha huzurlu bir mola ekleyebilirsin. Ortalama ziyaret süresi yaklaşık ${visitTime} dakika.`;
    }

    if (isHistorical) {
      return `${name}, ${city}${district ? " " + district : ""} bölgesinin tarih ve kültür dokusunu hissedebileceğin önemli duraklardan biri. Burayı gezerken mimari detaylara, çevredeki tarihi izlere ve mekânın atmosferine dikkat etmeni öneririm. Ortalama ziyaret süresi yaklaşık ${visitTime} dakika.`;
    }

    return `${name}, ${city}${district ? " " + district : ""} rotanda kısa ama keyifli bir keşif durağı olabilir. Çevredeki diğer noktalarla birlikte planladığında daha dengeli ve akıcı bir gezi rotası oluşturabilirsin. Ortalama ziyaret süresi yaklaşık ${visitTime} dakika.`;
  }

  return `${name} is a useful stop in ${city}${district ? " " + district : ""}. You can add it to your route as a short and pleasant discovery point. Suggested visit time is around ${visitTime} minutes.`;
}

function getMarkerColor(category?: string) {
  const c = normalizeCategory(category);
  if (c === "restaurant") return COLORS.orange;
  if (c === "hotel") return COLORS.blue;
  if (c === "attraction") return COLORS.accent;
  return COLORS.purple;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function MapScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAccountReady = !!user;
  const storageKey = (key: string) => isAccountReady ? `${key}_${user.uid}` : key;

  const requireLogin = () => {
    if (isAccountReady) return true;
    Alert.alert(
      "Giriş gerekli",
      "Bu işlemi yapmak için giriş yapmalısın.",
      [
        { text: "Vazgeç" },
        { text: "Profil'e Git", onPress: () => router.push("/(tabs)/profile" as any) },
      ]
    );
    return false;
  };
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<Region>(TURKEY_REGION);
  const [places, setPlaces] = useState<Place[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [listVisible, setListVisible] = useState(false);
  const [usefulVisible, setUsefulVisible] = useState(false);
  const [nearbyVisible, setNearbyVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [weatherAdvice, setWeatherAdvice] = useState<string>("");
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const isCloseZoom = region.latitudeDelta < 2.2;
  const isMediumZoom = region.latitudeDelta < 5.0;

  const loadPlaces = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/places?language=${language}`);
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("places error", error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPlaces = async () => {
    try {
      if (!isAccountReady) {
        setSavedPlaces([]);
        return;
      }
      const raw = await AsyncStorage.getItem(storageKey("saved_places"));
      setSavedPlaces(raw ? JSON.parse(raw) : []);
    } catch (error) {
      setSavedPlaces([]);
    }
  };

  const loadRouteFromParams = () => {
    try {
      if (typeof params.route === "string") {
        const parsed = JSON.parse(params.route);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRoutePlaces(parsed);
          setSelectedCategory("all");

          setTimeout(() => {
            fitToPlaces(parsed);
          }, 350);
        }
      }
    } catch (error) {
      console.log("route params error", error);
    }
  };

  useEffect(() => {
    loadPlaces();
    loadSavedPlaces();
  }, [language, isAccountReady, user?.uid]);

  useEffect(() => {
    loadRouteFromParams();
  }, [params.route]);

  useEffect(() => {
    // Eğer ekrana rota parametresiyle gelindiyse Türkiye genel görünümüne geri zıplama.
    // Önceki sürümde bu kısım rota fit işlemini ezdiği için rota ekranda görünmüyordu.
    if (typeof params.route !== "string") {
      setTimeout(() => {
        mapRef.current?.animateToRegion(TURKEY_REGION, 650);
      }, 350);
    }
  }, []);

  useEffect(() => {
    if (routePlaces.length > 0) {
      setTimeout(() => fitToPlaces(routePlaces), 450);
    }
  }, [routePlaces.length]);

  const filteredPlaces = useMemo(() => {
    if (routePlaces.length > 0) return routePlaces;

    if (selectedCategory === "saved") {
      return savedPlaces.filter((p) => p.latitude && p.longitude);
    }

    if (selectedCategory === "all") {
      return places.filter((p) => p.latitude && p.longitude);
    }

    return places.filter(
      (p) => p.latitude && p.longitude && normalizeCategory(p.category) === selectedCategory
    );
  }, [places, savedPlaces, selectedCategory, routePlaces]);


  const nearbyPlaces = useMemo(() => {
    if (!userLocation) return [];

    return places
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        ...p,
        distance_km: distanceKm(
          userLocation.latitude,
          userLocation.longitude,
          Number(p.latitude),
          Number(p.longitude)
        ),
      }))
      .filter((p) => Number(p.distance_km) <= 10)
      .sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0))
      .slice(0, 8);
  }, [places, userLocation]);

  const stats = useMemo(() => {
    const attractions = places.filter((p) => normalizeCategory(p.category) === "attraction").length;
    const restaurants = places.filter((p) => normalizeCategory(p.category) === "restaurant").length;
    const hotels = places.filter((p) => normalizeCategory(p.category) === "hotel").length;

    return {
      attractions,
      restaurants,
      hotels,
    };
  }, [places]);

  const clusters = useMemo<Cluster[]>(() => {
    const cityMap = new Map<string, Place[]>();

    filteredPlaces.forEach((p) => {
      const key = p.city || "Other";
      const old = cityMap.get(key) || [];
      old.push(p);
      cityMap.set(key, old);
    });

    const allClusters = Array.from(cityMap.entries())
      .map(([city, list], index) => {
        const lat =
          list.reduce((sum, item) => sum + Number(item.latitude || 0), 0) / list.length;
        const lng =
          list.reduce((sum, item) => sum + Number(item.longitude || 0), 0) / list.length;

        return {
          id: `${city}-${index}`,
          title: city,
          city,
          latitude: lat,
          longitude: lng,
          count: list.length,
          color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
        };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // İlk açılışta harita temiz görünür: sadece en büyük kümeler.
    // Yakınlaştıkça daha fazla şehir kümesi açılır.
    const limit = region.latitudeDelta > 6.2 ? 9 : region.latitudeDelta > 4.0 ? 16 : 28;

    return allClusters.slice(0, limit);
  }, [filteredPlaces, region.latitudeDelta]);

  // Tek tek markerlar sadece gerçekten yakın zoomda açılır.
  // Böylece ilk ekranda yüzlerce pin görünmez.
  const routeCoordinates = routePlaces
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }));

  // Normal haritada markerlar sadece yakın zoomda açılır.
  // Ama rota geldiyse markerlar ve çizgi her zaman görünür.
  const visibleMarkers =
    routePlaces.length > 0
      ? routePlaces.filter((p) => p.latitude && p.longitude)
      : isCloseZoom
        ? filteredPlaces.slice(0, 250)
        : [];

  const fitToPlaces = (list: Place[]) => {
    const valid = list.filter((p) => p.latitude && p.longitude);
    if (!valid.length) return;

    mapRef.current?.fitToCoordinates(
      valid.map((p) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
      })),
      {
        edgePadding: { top: 190, right: 70, bottom: 300, left: 70 },
        animated: true,
      }
    );
  };

  const focusTurkey = () => {
    setSelectedPlace(null);
    setRoutePlaces([]);
    mapRef.current?.animateToRegion(TURKEY_REGION, 650);
  };

  const focusUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          safeT(t, "map.locationPermissionTitle", "İzin gerekli", language),
          safeT(t, "map.locationPermissionMessage", "Yakındaki yerleri bulmak için konum izni vermelisin.", language)
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);

      const nextRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 650);
      await getWeatherAdvice(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.log("location error", error);
    }
  };

  const getWeatherAdvice = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/weather-advice?lat=${lat}&lng=${lng}&language=${language}`
      );
      const data = await res.json();
      setWeatherAdvice(data.advice || "");
    } catch (error) {
      setWeatherAdvice("");
    }
  };

  const openUsefulInfo = async () => {
    if (!userLocation) {
      await focusUserLocation();
    }
    setUsefulVisible(true);
  };

  const openGoogleMapsSearch = async (query: string) => {
    const lat = userLocation?.latitude || 39.0;
    const lng = userLocation?.longitude || 35.2;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`;
    Linking.openURL(url);
  };

  const openNavigation = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const saveRoute = async () => {
    if (!requireLogin()) return;
    try {
      const list = routePlaces.length ? routePlaces : filteredPlaces.slice(0, 8);
      if (!list.length) return;

      const raw = await AsyncStorage.getItem(storageKey("saved_routes"));
      const old = raw ? JSON.parse(raw) : [];

      const route = {
        id: Date.now().toString(),
        title: `${safeT(t, "map.tripMap", "Gezi Haritası", language)} - ${new Date().toLocaleDateString()}`,
        places: list,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(storageKey("saved_routes"), JSON.stringify([route, ...(Array.isArray(old) ? old : [])]));
      Alert.alert(
        safeT(t, "map.routeSavedTitle", "Rota kaydedildi", language),
        safeT(t, "map.routeSavedMessage", "Bu rotayı Favoriler > Rotalar bölümünde görebilirsin.", language)
      );
    } catch (error) {
      Alert.alert(safeT(t, "common.error", "Hata", language), safeT(t, "map.routeSaveError", "Rota kaydedilemedi.", language));
    }
  };

  const shareRoute = async () => {
    try {
      const list = routePlaces.length ? routePlaces : filteredPlaces.slice(0, 8);
      const text = list.map((p, i) => `${i + 1}. ${p.name} - ${p.city}`).join("\n");

      await Share.share({
        message: `${safeT(t, "map.yourRoute", "Rotan", language)}\n\n${text}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const stopSpeech = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.log("speech stop error", error);
      setIsSpeaking(false);
    }
  };

  const speakPlace = async (place: Place) => {
    try {
      const currentlySpeaking = await Speech.isSpeakingAsync();

      if (currentlySpeaking || isSpeaking) {
        await stopSpeech();
        return;
      }

      let text = guideTextForPlace(place, language);

try {
  const res = await fetch(`${API_BASE_URL}/voice-guide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: place.name,
      city: place.city,
      district: place.district,
      category: place.category,
      subcategory: place.subcategory,
      description: place.description,
      language,
    }),
  });

  const data = await res.json();

  if (data?.guide) {
    text = data.guide;
  }
} catch (error) {
  console.log("AI voice guide error:", error);
}
      console.log("Voice guide text:", text.slice(0, 180));

      const preferredLanguage =
        language === "tr"
          ? "tr-TR"
          : language === "de"
          ? "de-DE"
          : language === "ru"
          ? "ru-RU"
          : "en-US";

      let speechLanguage = preferredLanguage;

      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const hasPreferredVoice = voices.some((voice: any) =>
          String(voice.language || "").toLowerCase().startsWith(
            preferredLanguage.toLowerCase().slice(0, 2)
          )
        );

        if (!hasPreferredVoice) {
          speechLanguage = "en-US";
        }
      } catch (voiceError) {
        console.log("voice list error", voiceError);
      }

      // iOS / Expo Go tarafında konuşma bazen çok hızlı tetiklenince ses çıkmayabiliyor.
      // Önce aktif konuşmayı temizleyip kısa gecikmeyle başlatıyoruz.
      await Speech.stop();

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (audioModeError) {
        console.log("audio mode error", audioModeError);
      }

      setIsSpeaking(true);

      setTimeout(() => {
        Speech.speak(text, {
          language: speechLanguage,
          rate: Platform.OS === "ios" ? 0.68 : 0.74,
          pitch: Platform.OS === "ios" ? 1.04 : 1.0,
          volume: 1.0,
          onStart: () => {
            console.log("Speech started:", speechLanguage);
            setIsSpeaking(true);
          },
          onDone: () => {
            console.log("Speech finished");
            setIsSpeaking(false);
          },
          onStopped: () => {
            console.log("Speech stopped");
            setIsSpeaking(false);
          },
          onError: (error) => {
            console.log("Speech error:", error);
            setIsSpeaking(false);
            Alert.alert(
              safeT(t, "common.error", "Hata", language),
              language === "tr"
                ? "Sesli rehber başlatılamadı. Telefon sesinin açık olduğundan ve sessiz modun kapalı olduğundan emin ol."
                : "Voice guide could not start. Please make sure device volume is on and silent mode is off."
            );
          },
        });
      }, 220);
    } catch (error) {
      console.log("speech general error", error);
      setIsSpeaking(false);
      Alert.alert(
        safeT(t, "common.error", "Hata", language),
        language === "tr"
          ? "Sesli rehber çalıştırılamadı."
          : "Voice guide could not be started."
      );
    }
  };

  const saveNote = async () => {
    if (!requireLogin()) return;
    try {
      if (!selectedPlace || !noteText.trim()) return;

      const raw = await AsyncStorage.getItem(storageKey("travel_journal"));
      const old = raw ? JSON.parse(raw) : [];

      const note = {
        id: Date.now().toString(),
        placeId: selectedPlace.id,
        placeName: selectedPlace.name,
        city: selectedPlace.city,
        note: noteText.trim(),
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(storageKey("travel_journal"), JSON.stringify([note, ...(Array.isArray(old) ? old : [])]));
      setNoteText("");

      Alert.alert(
        safeT(t, "map.noteSavedTitle", "Kaydedildi", language),
        safeT(t, "map.noteSavedMessage", "Seyahat notun başarıyla kaydedildi.", language)
      );
    } catch (error) {
      Alert.alert(safeT(t, "common.error", "Hata", language), "Not kaydedilemedi.");
    }
  };

  const zoomIntoCluster = (cluster: Cluster) => {
    const cityPlaces = filteredPlaces.filter((p) => p.city === cluster.city);

    if (cityPlaces.length > 1) {
      fitToPlaces(cityPlaces);
    } else {
      mapRef.current?.animateToRegion(
        {
          latitude: cluster.latitude,
          longitude: cluster.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        },
        650
      );
    }
  };

  const renderCategory = (item: typeof CATEGORY_CONFIG[number]) => {
    const label = safeT(t, item.labelKey, item.fallback);
    const isActive = selectedCategory === item.key;

    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={0.88}
        style={[styles.categoryButton, isActive && styles.categoryActive]}
        onPress={() => {
          setRoutePlaces([]);
          setSelectedCategory(item.key);
          setSelectedPlace(null);
        }}
      >
        {item.key !== "all" && (
          <Ionicons
            name={item.icon as any}
            size={17}
            color={isActive ? COLORS.white : COLORS.text}
          />
        )}
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderClusterMarker = (cluster: Cluster) => (
    <Marker
      key={cluster.id}
      coordinate={{
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      }}
      onPress={() => zoomIntoCluster(cluster)}
    >
      <View style={[styles.clusterOuter, { backgroundColor: `${cluster.color}33` }]}>
        <View style={[styles.clusterInner, { backgroundColor: cluster.color }]}>
          <Text style={styles.clusterText}>{cluster.count}</Text>
        </View>
      </View>
    </Marker>
  );

  const renderPlaceMarker = (place: Place) => {
    const color = getMarkerColor(place.category);

    return (
      <Marker
        key={`${place.id}-${place.name}`}
        coordinate={{
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
        }}
        onPress={() => setSelectedPlace(place)}
      >
        <View style={[styles.pin, { backgroundColor: color }]}>
          <View style={styles.pinDot} />
        </View>
      </Marker>
    );
  };


  const getRouteDistanceKm = () => {
    const list = routePlaces.filter((p) => p.latitude && p.longitude);
    if (list.length < 2) return 0;

    let total = 0;

    for (let i = 0; i < list.length - 1; i++) {
      total += distanceKm(
        Number(list[i].latitude),
        Number(list[i].longitude),
        Number(list[i + 1].latitude),
        Number(list[i + 1].longitude)
      );
    }

    return total;
  };

  const getRouteEstimatedMinutes = () => {
    const visitMinutes = routePlaces.reduce(
      (sum, p) => sum + Number(p.estimated_visit_time || 45),
      0
    );

    const travelMinutes = Math.round((getRouteDistanceKm() / 30) * 60);

    return visitMinutes + travelMinutes;
  };

  const getRouteScore = () => {
    return 0;
  };

  const getRouteBudget = () => {
    let food = 0;
    let hotel = 0;
    let transport = Math.max(350, Math.round(getRouteDistanceKm() * 65));
    let tickets = 0;

    routePlaces.forEach((p) => {
      const cat = normalizeCategory(p.category);

      if (cat === "restaurant") food += 700;
      else if (cat === "hotel") hotel += 3500;
      else tickets += 350;
    });

    const min = food + hotel + transport + tickets;
    const max = Math.round(min * 1.55);

    return {
      min,
      max,
      food,
      hotel,
      transport,
      tickets,
    };
  };

  const formatMoney = (value: number) => {
    const locale = language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "ru" ? "ru-RU" : "en-US";
    return `${Math.round(value).toLocaleString(locale)} TL`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      const minLabel = language === "de" ? "Min." : language === "ru" ? "мин" : language === "en" ? "min" : "dk";
      return `${minutes} ${minLabel}`;
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    const hourLabel = language === "de" ? "Std." : language === "ru" ? "ч" : language === "en" ? "h" : "sa";
    const minLabel = language === "de" ? "Min." : language === "ru" ? "мин" : language === "en" ? "min" : "dk";
    return m > 0 ? `${h} ${hourLabel} ${m} ${minLabel}` : `${h} ${hourLabel}`;
  };

  const nextStop = routePlaces[0] || null;
  const followingStop = routePlaces[1] || null;
  const routeDistanceKm = getRouteDistanceKm();
  const routeEstimatedMinutes = getRouteEstimatedMinutes();
  const routeScore = getRouteScore();
  const routeBudget = getRouteBudget();

  const openFullRouteDirections = () => {
    openRouteNavigationApp("google");
  };

  const openRouteNavigationApp = async (type: "google" | "apple" | "yandex") => {
    try {
      if (!routePlaces.length) return;

      const valid = routePlaces.filter((p) => p.latitude && p.longitude);
      const destination = valid[valid.length - 1];

      if (!destination) return;

      const waypoints = valid
        .slice(0, -1)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join("|");

      const appleWaypoints = valid
        .slice(0, -1)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join("+to:");

      const yandexRoute = valid.map((p) => `${p.latitude},${p.longitude}`).join("~");

      const urls = {
        google:
          `https://www.google.com/maps/dir/?api=1` +
          `&destination=${destination.latitude},${destination.longitude}` +
          (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""),
        apple:
          `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}` +
          (appleWaypoints ? `&saddr=${appleWaypoints}` : ""),
        yandex: `yandexmaps://maps.yandex.com/?rtext=${yandexRoute}&rtt=auto`,
      };

      const fallbackYandex = `https://yandex.com/maps/?rtext=${yandexRoute}&rtt=auto`;

      if (type === "yandex") {
        const supported = await Linking.canOpenURL(urls.yandex);
        await Linking.openURL(supported ? urls.yandex : fallbackYandex);
        return;
      }

      await Linking.openURL(urls[type]);
    } catch (error) {
      console.log(error);
    }
  };


  const focusRouteStop = (place: Place) => {
    setSelectedPlace(null);

    mapRef.current?.animateToRegion(
      {
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      650
    );
  };

  const addRouteToJournal = async () => {
    if (!requireLogin()) return;
    try {
      if (!routePlaces.length) return;

      const raw = await AsyncStorage.getItem(storageKey("travel_journal"));
      const old = raw ? JSON.parse(raw) : [];

      const note = {
        id: Date.now().toString(),
        placeId: "route",
        placeName: safeT(t, "map.yourRoute", "Rotan", language),
        city: routePlaces[0]?.city || "Turkey",
        note:
          routePlaces
            .map((p, index) => `${index + 1}. ${p.name} - ${p.city}`)
            .join("\\n") || "Rota",
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        "travel_journal",
        JSON.stringify([note, ...(Array.isArray(old) ? old : [])])
      );

      Alert.alert(safeT(t, "map.journalAddedTitle", "Günlüğe eklendi", language), safeT(t, "map.journalAddedMessage", "Bu rota seyahat günlüğüne kaydedildi.", language));
    } catch (error) {
      Alert.alert(safeT(t, "common.error", "Hata", language), safeT(t, "map.journalAddError", "Rota günlüğe eklenemedi.", language));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={TURKEY_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {routePlaces.length === 0 && !isCloseZoom && clusters.map(renderClusterMarker)}

        {routeCoordinates.length > 1 && (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={9}
              strokeColor="#FF2F5F"
              lineCap="round"
              lineJoin="round"
              zIndex={20}
            />

            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#FFFFFF"
              lineCap="round"
              lineJoin="round"
              zIndex={21}
            />
          </>
        )}

        {visibleMarkers.map(renderPlaceMarker)}

        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title={safeT(t, "map.youAreHere", "Konumun", language)}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.topOverlay}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_CONFIG.map(renderCategory)}
        </ScrollView>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={26} color={COLORS.accent} />
            <View>
              <Text style={styles.statNumber}>{stats.attractions}+</Text>
              <Text style={styles.statLabel}>{safeT(t, "map.attractions", "Gezilecek Yer", language)}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="restaurant" size={26} color={COLORS.orange} />
            <View>
              <Text style={styles.statNumber}>{stats.restaurants}+</Text>
              <Text style={styles.statLabel}>{safeT(t, "map.restaurant", "Restoran", language)}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="bed" size={26} color={COLORS.blue} />
            <View>
              <Text style={styles.statNumber}>{stats.hotels}+</Text>
              <Text style={styles.statLabel}>{safeT(t, "map.hotels", "Otel", language)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.emergencyButton} activeOpacity={0.88} onPress={openUsefulInfo}>
          <Ionicons name="medical-outline" size={22} color={COLORS.accent} />
          <Text style={styles.emergencyText}>{safeT(t, "map.emergencyInfo", "Emergency / Useful Info", language)}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.roundButton} onPress={focusUserLocation}>
          <Ionicons name="locate-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.roundButton} onPress={focusTurkey}>
          <Ionicons name="layers-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.roundButtonLarge} onPress={focusUserLocation}>
          <Ionicons name="navigate-outline" size={22} color={COLORS.text} />
          <Text style={styles.roundButtonText}>{safeT(t, "map.myLocation", "Konumum", language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roundButtonLarge}
          onPress={async () => {
            await focusUserLocation();
            setNearbyVisible(true);
          }}
        >
          <Ionicons name="walk-outline" size={22} color={COLORS.text} />
          <Text style={styles.roundButtonText}>{safeT(t, "map.showNearMe", "Yakınımda Ne Var?", language)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.sheetTitleRow}>
              <Ionicons name="map-outline" size={22} color={COLORS.text} />
              <Text style={styles.sheetTitle}>
                {routePlaces.length > 0
                  ? safeT(t, "map.yourRoute", "Rotan", language)
                  : safeT(t, "map.turkey", "Türkiye", language)}
              </Text>
            </View>

            <Text style={styles.sheetSubtitle}>
              {routePlaces.length > 0
                ? `${routePlaces.length} ${safeT(t, "map.stopsInPlan", "durak planda", language)}`
                : safeT(t, "map.explorePlan", "Haritayı keşfet ve planını yap", language)}
            </Text>
          </View>

          <TouchableOpacity style={styles.filterButton} onPress={() => setListVisible(true)}>
            <Ionicons name="filter-outline" size={20} color={COLORS.white} />
            <Text style={styles.filterButtonText}>{safeT(t, "map.filter", "Filtrele", language)}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScrollContent}
        >

        {weatherAdvice ? (
          <View style={styles.infoBox}>
            <Ionicons name="partly-sunny-outline" size={24} color={COLORS.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{safeT(t, "map.weatherAdvice", "Hava Durumu Önerisi", language)}</Text>
              <Text style={styles.infoText}>{weatherAdvice}</Text>
            </View>
            <TouchableOpacity onPress={() => setWeatherAdvice("")}>
              <Ionicons name="close-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        ) : showHelp ? (
          <View style={styles.infoBox}>
            <Ionicons name="bulb-outline" size={25} color={COLORS.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{safeT(t, "map.howToUse", "Nasıl Kullanılır?", language)}</Text>
              <Text style={styles.infoText}>
                {safeT(t, "map.helpText", "Kümelere tıklayarak daha fazla yeri görüntüleyebilir, yakınlaştırarak detayları keşfedebilirsin.", language)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowHelp(false)}>
              <Ionicons name="close-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        ) : null}

        {routePlaces.length > 0 && (
          <>
            <View style={styles.routeSummaryGrid}>
              <View style={styles.routeMetricCard}>
                <Ionicons name="car-outline" size={18} color={COLORS.accent} />
                <Text style={styles.routeMetricValue}>{routeDistanceKm.toFixed(1)} km</Text>
                <Text style={styles.routeMetricLabel}>{safeT(t, "map.approxDistance", "Yaklaşık Mesafe", language)}</Text>
              </View>

              <View style={styles.routeMetricCard}>
                <Ionicons name="time-outline" size={18} color={COLORS.blue} />
                <Text style={styles.routeMetricValue}>{formatDuration(routeEstimatedMinutes)}</Text>
                <Text style={styles.routeMetricLabel}>{safeT(t, "map.estimatedTime", "Tahmini Süre", language)}</Text>
              </View>

              <View style={styles.routeMetricCard}>
                <Ionicons name="sparkles-outline" size={18} color={COLORS.orange} />
                <Text style={styles.routeMetricValue}>{routeScore}/100</Text>
                <Text style={styles.routeMetricLabel}>{safeT(t, "map.routeScore", "Rota Uygunluk Skoru", language)}</Text>
              </View>
            </View>

            <View style={styles.routeInfoNote}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#64748B"
              />
              <Text style={styles.routeInfoNoteText}>
                {safeT(t, "map.routeNote", "Mesafe ve süre yaklaşık hesaplanır. Gerçek yol ve trafik için Yol Tarifi kullan.", language)}
              </Text>
            </View>

            <View style={styles.navigationAppsCard}>
              <Text style={styles.navigationAppsTitle}>Navigasyon Uygulaması</Text>

              <View style={styles.navigationAppsRow}>
                <TouchableOpacity style={styles.navigationAppButton} onPress={() => openRouteNavigationApp("google")}>
                  <Ionicons name="logo-google" size={16} color={COLORS.accent} />
                  <Text style={styles.navigationAppText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navigationAppButton} onPress={() => openRouteNavigationApp("apple")}>
                  <Ionicons name="map-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.navigationAppText}>Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navigationAppButton} onPress={() => openRouteNavigationApp("yandex")}>
                  <Ionicons name="navigate-circle-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.navigationAppText}>Yandex</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.nextStopCard}>
              <View style={styles.nextStopIcon}>
                <Ionicons name="flag-outline" size={20} color={COLORS.white} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.nextStopLabel}>{safeT(t, "map.nextStop", "Sıradaki Durak", language)}</Text>
                <Text style={styles.nextStopTitle} numberOfLines={1}>
                  {nextStop?.name || "-"}
                </Text>

                {followingStop ? (
                  <Text style={styles.nextStopSub} numberOfLines={1}>
                    {safeT(t, "map.followingStop", "Sonraki", language)}: {followingStop.name}
                  </Text>
                ) : (
                  <Text style={styles.nextStopSub}>{safeT(t, "map.lastStop", "Rotanın son durağı", language)}</Text>
                )}
              </View>
            </View>

            <View style={styles.routeStopsCard}>
              <View style={styles.routeStopsHeader}>
                <Text style={styles.routeStopsTitle}>{safeT(t, "map.routeStops", "Rota Durakları", language)}</Text>
                <Text style={styles.routeStopsCount}>{routePlaces.length} {safeT(t, "map.stops", "durak", language)}</Text>
              </View>

              {routePlaces.map((stop, index) => (
                <TouchableOpacity
                  key={`${stop.id}-${index}`}
                  style={styles.routeStopItem}
                  activeOpacity={0.86}
                  onPress={() => focusRouteStop(stop)}
                >
                  <View style={styles.routeStopNumber}>
                    <Text style={styles.routeStopNumberText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeStopName} numberOfLines={1}>
                      {stop.name}
                    </Text>
                    <Text style={styles.routeStopMeta} numberOfLines={1}>
                      {stop.city} • {categoryDisplay(stop.category, language)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.routeStopNavigate}
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      openNavigation(stop);
                    }}
                  >
                    <Ionicons name="navigate-outline" size={17} color={COLORS.white} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.budgetMiniCard}>
              <View style={styles.budgetTopRow}>
                <View>
                  <Text style={styles.budgetTitle}>{safeT(t, "map.budgetSummary", "AI Bütçe Özeti", language)}</Text>
                  <Text style={styles.budgetTotal}>
                    {formatMoney(routeBudget.min)} - {formatMoney(routeBudget.max)}
                  </Text>
                </View>

                <View style={styles.budgetIcon}>
                  <Ionicons name="wallet-outline" size={22} color={COLORS.accent} />
                </View>
              </View>

              <View style={styles.budgetBreakdown}>
                <Text style={styles.budgetItem}>{safeT(t, "map.foodCost", "Yemek", language)}: {formatMoney(routeBudget.food)}</Text>
                <Text style={styles.budgetItem}>{safeT(t, "map.hotelCost", "Otel", language)}: {formatMoney(routeBudget.hotel)}</Text>
                <Text style={styles.budgetItem}>{safeT(t, "map.transportCost", "Ulaşım", language)}: {formatMoney(routeBudget.transport)}</Text>
                <Text style={styles.budgetItem}>{safeT(t, "map.entryCost", "Giriş", language)}: {formatMoney(routeBudget.tickets)}</Text>
              </View>
            </View>

            <View style={styles.routeActions}>
              <TouchableOpacity style={styles.routeActionPrimary} onPress={openFullRouteDirections}>
                <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
                <Text style={styles.routeActionPrimaryText}>{safeT(t, "map.directions", "Yol Tarifi", language)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.routeActionButton} onPress={shareRoute}>
                <Ionicons name="share-social-outline" size={16} color={COLORS.text} />
                <Text style={styles.routeActionText}>{safeT(t, "map.share", "Paylaş", language)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.routeActionButton} onPress={() => fitToPlaces(routePlaces)}>
                <Ionicons name="scan-outline" size={16} color={COLORS.text} />
                <Text style={styles.routeActionText}>{safeT(t, "map.refit", "Ortala", language)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.routeActionButton} onPress={saveRoute}>
                <Ionicons name="download-outline" size={16} color={COLORS.text} />
                <Text style={styles.routeActionText}>{safeT(t, "map.saveRoute", "Kaydet", language)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.routeActionButton} onPress={addRouteToJournal}>
                <Ionicons name="journal-outline" size={16} color={COLORS.text} />
                <Text style={styles.routeActionText}>{safeT(t, "map.addToJournal", "Günlüğe Ekle", language)}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        </ScrollView>
      </View>

      {selectedPlace && routePlaces.length === 0 && (
        <View style={styles.placePreview}>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName} numberOfLines={1}>{selectedPlace.name}</Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {selectedPlace.city} • {categoryDisplay(selectedPlace.category, language)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.previewIconButton, isSpeaking && styles.previewStopButton]}
            onPress={() => speakPlace(selectedPlace)}
          >
            <Ionicons
              name={isSpeaking ? "stop-outline" : "volume-high-outline"}
              size={19}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewIconButton}
            onPress={() => router.push({ pathname: "/place", params: { id: String(selectedPlace.id) } })}
          >
            <Ionicons name="information-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewIconButton} onPress={() => openNavigation(selectedPlace)}>
            <Ionicons name="navigate-outline" size={19} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={listVisible} transparent animationType="slide" onRequestClose={() => setListVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.listModal}>
            <View style={styles.listHeaderRow}>
              <View>
                <Text style={styles.listTitle}>{safeT(t, "map.nearbyPlaces", "Yerler", language)}</Text>
                <Text style={styles.listSubtitle}>{filteredPlaces.length} {safeT(t, "map.found", "bulundu", language)}</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setListVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredPlaces.slice(0, 80)}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  activeOpacity={0.85}
                  onPress={() => {
                    setListVisible(false);
                    setSelectedPlace(item);
                    mapRef.current?.animateToRegion(
                      {
                        latitude: item.latitude,
                        longitude: item.longitude,
                        latitudeDelta: 0.06,
                        longitudeDelta: 0.06,
                      },
                      650
                    );
                  }}
                >
                  <View style={[styles.listIcon, { backgroundColor: getMarkerColor(item.category) }]}>
                    <Ionicons name="location" size={18} color={COLORS.white} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.listMeta} numberOfLines={1}>{item.city} • {categoryDisplay(item.category, language)}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSoft} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {nearbyVisible && userLocation && nearbyPlaces.length > 0 && routePlaces.length === 0 && (
        <View style={styles.nearbyCard}>
          <View style={styles.nearbyHeader}>
            <View>
              <Text style={styles.nearbyTitle}>
                {safeT(t, "map.nearMeTitle", "Yakınımdaki Yerler", language)}
              </Text>
              <Text style={styles.nearbySubtitle}>
                {safeT(t, "map.nearMeSubtitle", "Konumuna en yakın gezi noktaları", language)}
              </Text>
            </View>
            <View style={styles.nearbyHeaderActions}>
              <TouchableOpacity onPress={() => setListVisible(true)}>
                <Text style={styles.nearbySeeAll}>{safeT(t, "home.seeAll", "Tümünü Gör", language)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nearbyCloseButton} onPress={() => setNearbyVisible(false)}>
                <Ionicons name="close-outline" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyPlaces.slice(0, 5).map((place) => (
              <TouchableOpacity
                key={`nearby-${place.id}`}
                style={styles.nearbyMiniCard}
                activeOpacity={0.88}
                onPress={() => {
                  setNearbyVisible(false);
                  setSelectedPlace(place);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: Number(place.latitude),
                      longitude: Number(place.longitude),
                      latitudeDelta: 0.035,
                      longitudeDelta: 0.035,
                    },
                    650
                  );
                }}
              >
                {place.image ? (
                  <Image source={{ uri: String(place.image) }} style={styles.nearbyThumb} />
                ) : (
                  <View style={styles.nearbyThumbPlaceholder}>
                    <Ionicons name="image-outline" size={22} color={COLORS.accent} />
                  </View>
                )}

                <View style={styles.nearbyDistancePill}>
                  <Ionicons name="walk-outline" size={12} color={COLORS.accent} />
                  <Text style={styles.nearbyDistanceText}>
                    {Number(place.distance_km || 0).toFixed(1)} km
                  </Text>
                </View>
                <Text style={styles.nearbyPlaceName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.nearbyPlaceMeta} numberOfLines={1}>
                  {place.city} • {categoryDisplay(place.category, language)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal visible={usefulVisible} transparent animationType="slide" onRequestClose={() => setUsefulVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.usefulModal}>
            <View style={styles.listHeaderRow}>
              <View>
                <Text style={styles.listTitle}>{safeT(t, "map.emergencyInfo", "Acil / Faydalı Bilgiler", language)}</Text>
                <Text style={styles.listSubtitle}>{safeT(t, "map.usefulInfoSubtitle", "Yakındaki önemli yerleri aç", language)}</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setUsefulVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {[
              { icon: "medical-outline", title: safeT(t, "map.nearbyHospitals", "Yakındaki hastaneler", language), q: "hospital" },
              { icon: "medkit-outline", title: safeT(t, "map.nearbyPharmacies", "Yakındaki eczaneler", language), q: "pharmacy" },
              { icon: "shield-checkmark-outline", title: safeT(t, "map.nearbyPolice", "Yakındaki polis merkezleri", language), q: "police" },
              { icon: "bus-outline", title: safeT(t, "map.nearbyTransport", "Yakındaki toplu taşıma", language), q: "public transport" },
            ].map((item) => (
              <TouchableOpacity key={item.q} style={styles.usefulItem} onPress={() => openGoogleMapsSearch(item.q)}>
                <View style={styles.usefulIcon}>
                  <Ionicons name={item.icon as any} size={22} color={COLORS.accent} />
                </View>
                <Text style={styles.usefulTitle}>{item.title}</Text>
                <Ionicons name="open-outline" size={20} color={COLORS.textSoft} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {selectedPlace && (
        <Modal visible={false} transparent>
          <View />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  map: {
    flex: 1,
  },

  topOverlay: {
    position: "absolute",
    top: 42,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
  },

  categoryScroll: {
    paddingRight: 24,
    alignItems: "center",
  },

  categoryButton: {
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  categoryActive: {
    backgroundColor: COLORS.accent,
  },

  categoryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 6,
  },

  categoryTextActive: {
    color: COLORS.white,
    marginLeft: 0,
  },

  statsCard: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  statNumber: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  statLabel: {
    color: "#5D647F",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(19,22,34,0.12)",
  },

  emergencyButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FFF1F4",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  emergencyText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: "800",
  },

  rightControls: {
    position: "absolute",
    right: 16,
    bottom: 210,
    alignItems: "center",
    gap: 12,
  },

  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  roundButtonLarge: {
    minWidth: 74,
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  roundButtonText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  clusterOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },

  clusterInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
  },

  clusterText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  pin: {
    width: 31,
    height: 31,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },

  pinDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.22)",
  },

  userMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(47,128,237,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  userMarkerDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 74,
    maxHeight: "40%",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(19,22,34,0.18)",
    marginBottom: 10,
  },

  sheetScrollContent: {
    paddingBottom: 18,
  },

  sheetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },

  sheetSubtitle: {
    color: "#5D647F",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },

  filterButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  filterButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },

  infoBox: {
    marginTop: 8,
    backgroundColor: "#EAF5FF",
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },

  infoText: {
    color: "#3F4A66",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },

  routeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },

  routeActionButton: {
    backgroundColor: "#F2F4FA",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  routeActionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  placePreview: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 190,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },

  previewName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 3,
  },

  previewMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },

  previewIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  previewStopButton: {
    backgroundColor: "#EF4444",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31,41,55,0.22)",
    justifyContent: "flex-end",
  },

  listModal: {
    maxHeight: "78%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  usefulModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },

  listSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listItem: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  listName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },

  listMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },

  usefulItem: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 20,
    padding: 15,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  usefulIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(239,79,90,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  usefulTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  routeSummaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  routeMetricCard: {
    flex: 1,
    backgroundColor: "#F2F4FA",
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: "center",
  },

  routeMetricValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },

  routeMetricLabel: {
    color: "#5D647F",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },

  nextStopCard: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  nextStopIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  nextStopLabel: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },

  nextStopTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  nextStopSub: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  budgetMiniCard: {
    marginTop: 8,
    backgroundColor: "#F8F0F1",
    borderRadius: 18,
    padding: 12,
  },

  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  budgetTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  budgetTotal: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },

  budgetIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(239,79,90,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  budgetBreakdown: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  budgetItem: {
    color: "#5D647F",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  routeActionPrimary: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  routeActionPrimaryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },


  routeStopsCard: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 8,
  },

  routeStopsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  routeStopsTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  routeStopsCount: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },

  routeStopItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    padding: 10,
    marginTop: 8,
    gap: 10,
  },

  routeStopNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  routeStopNumberText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },

  routeStopName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  routeStopMeta: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  routeStopNavigate: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  routeInfoNote: {
    marginTop: 12,
    backgroundColor: "#EEF6FF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  routeInfoNoteText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },


  navigationAppsCard: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  navigationAppsTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  navigationAppsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  navigationAppButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  navigationAppText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },



  nearbyCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 112,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  nearbyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  nearbyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  nearbySubtitle: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  nearbyHeaderActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

nearbyCloseButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: COLORS.surfaceSoft,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: COLORS.border,
},
  nearbySeeAll: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  nearbyMiniCard: {
    width: 150,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  nearbyThumb: {
    width: "100%",
    height: 76,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  nearbyThumbPlaceholder: {
    width: "100%",
    height: 76,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#FFF1F4",
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyDistancePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F4",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  nearbyDistanceText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 4,
  },
  nearbyPlaceName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  nearbyPlaceMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
