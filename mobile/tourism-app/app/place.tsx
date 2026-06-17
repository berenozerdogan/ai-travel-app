import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { readJson, writeJson, STORAGE_KEYS } from "../services/storageService";

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE PLACE DETAILS RENKLERİ
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


const WEATHER_TEXTS: Record<string, Record<string, string>> = {
  title: {
    tr: "Hava Durumu Önerisi",
    en: "Weather Advice",
    de: "Wetterempfehlung",
    ru: "Совет по погоде",
  },
  loading: {
    tr: "Hava durumu önerisi hazırlanıyor...",
    en: "Preparing weather advice...",
    de: "Wetterempfehlung wird vorbereitet...",
    ru: "Готовится совет по погоде...",
  },
  unavailable: {
    tr: "Bu mekan için hava durumu önerisi alınamadı.",
    en: "Weather advice is not available for this place.",
    de: "Für diesen Ort ist keine Wetterempfehlung verfügbar.",
    ru: "Совет по погоде для этого места недоступен.",
  },
};

function weatherText(key: string, language: string) {
  const lang = String(language || "en").toLowerCase();
  return WEATHER_TEXTS[key]?.[lang] || WEATHER_TEXTS[key]?.en || "";
}

const PLACE_UI: Record<string, Record<string, string>> = {
  routeRole: {
    tr: "Rota Rolü",
    en: "Route Role",
    de: "Routenrolle",
    ru: "Роль в маршруте",
  },
  routeRoleRestaurant: {
    tr: "Yemek Molası",
    en: "Food Stop",
    de: "Essenspause",
    ru: "Остановка для еды",
  },
  routeRoleHotel: {
    tr: "Konaklama",
    en: "Stay Point",
    de: "Unterkunft",
    ru: "Проживание",
  },
  routeRoleDefault: {
    tr: "Gezi Durağı",
    en: "Sightseeing Stop",
    de: "Besichtigungsstopp",
    ru: "Туристическая остановка",
  },
  aiRouteSuggestion: {
    tr: "AI Rota Önerisi",
    en: "AI Route Suggestion",
    de: "AI-Routenempfehlung",
    ru: "AI-рекомендация маршрута",
  },
  restaurantSuggestion: {
    tr: "Bu mekanı gezi rotana yemek molası olarak ekleyebilirsin. Yakındaki turistik duraklardan sonra kısa bir dinlenme noktası olabilir.",
    en: "You can add this place to your route as a food stop. It may work well as a short break after nearby attractions.",
    de: "Du kannst diesen Ort als Essenspause in deine Route aufnehmen. Er eignet sich gut als kurze Pause nach nahegelegenen Sehenswürdigkeiten.",
    ru: "Это место можно добавить в маршрут как остановку для еды. Оно подойдет для короткого отдыха после ближайших достопримечательностей.",
  },
  hotelSuggestion: {
    tr: "Bu mekanı konaklama noktası olarak değerlendirebilirsin. Rota planını şehir merkezi ve ulaşım kolaylığına göre şekillendirmek iyi olur.",
    en: "You can consider this place as a stay point. It is useful to plan your route around city access and transportation convenience.",
    de: "Du kannst diesen Ort als Unterkunftspunkt betrachten. Plane deine Route am besten nach Stadtlage und Verkehrsanbindung.",
    ru: "Это место можно рассмотреть для проживания. Маршрут лучше планировать с учетом центра города и удобства транспорта.",
  },
  defaultSuggestion: {
    tr: "Bu mekanı rotanda ana durak veya kısa keşif noktası olarak kullanabilirsin. Yakındaki yerlerle birlikte planlandığında rota daha verimli olur.",
    en: "You can use this place as a main stop or a short discovery point. Planning it together with nearby places makes the route more efficient.",
    de: "Du kannst diesen Ort als Hauptstopp oder kurzen Entdeckungspunkt nutzen. Mit nahegelegenen Orten wird die Route effizienter.",
    ru: "Это место можно использовать как основную или короткую остановку. Вместе с ближайшими местами маршрут будет удобнее.",
  },
  practicalInfo: {
    tr: "Pratik Bilgiler",
    en: "Practical Info",
    de: "Praktische Infos",
    ru: "Практическая информация",
  },
  city: {
    tr: "Şehir",
    en: "City",
    de: "Stadt",
    ru: "Город",
  },
  district: {
    tr: "İlçe",
    en: "District",
    de: "Bezirk",
    ru: "Район",
  },
  category: {
    tr: "Kategori",
    en: "Category",
    de: "Kategorie",
    ru: "Категория",
  },
  subcategory: {
    tr: "Alt Kategori",
    en: "Subcategory",
    de: "Unterkategorie",
    ru: "Подкатегория",
  },
  price: {
    tr: "Fiyat Seviyesi",
    en: "Price Level",
    de: "Preisniveau",
    ru: "Уровень цен",
  },
  visitTime: {
    tr: "Ziyaret Süresi",
    en: "Visit Time",
    de: "Besuchszeit",
    ru: "Время посещения",
  },
  navigation: {
    tr: "Navigasyon",
    en: "Navigation",
    de: "Navigation",
    ru: "Навигация",
  },
  navigationSubtitle: {
    tr: "Yol tarifi almak için harita uygulaması seç.",
    en: "Choose a map app to get directions.",
    de: "Wähle eine Karten-App für die Wegbeschreibung.",
    ru: "Выберите приложение карты для маршрута.",
  },
  description: {
    tr: "Açıklama",
    en: "Description",
    de: "Beschreibung",
    ru: "Описание",
  },
  hotel: {
    tr: "Otel",
    en: "Hotel",
    de: "Hotel",
    ru: "Отель",
  },
  restaurant: {
    tr: "Restoran",
    en: "Restaurant",
    de: "Restaurant",
    ru: "Ресторан",
  },
  cafe: {
    tr: "Kafe",
    en: "Cafe",
    de: "Café",
    ru: "Кафе",
  },
  attraction: {
    tr: "Gezilecek Yer",
    en: "Attraction",
    de: "Sehenswürdigkeit",
    ru: "Достопримечательность",
  },
  museum: {
    tr: "Müze",
    en: "Museum",
    de: "Museum",
    ru: "Музей",
  },
  shopping: {
    tr: "Alışveriş",
    en: "Shopping",
    de: "Shopping",
    ru: "Шопинг",
  },
  expensive: {
    tr: "Yüksek",
    en: "Expensive",
    de: "Teuer",
    ru: "Дорого",
  },
  moderate: {
    tr: "Orta",
    en: "Moderate",
    de: "Mittel",
    ru: "Средний",
  },
  cheap: {
    tr: "Uygun",
    en: "Affordable",
    de: "Günstig",
    ru: "Доступно",
  },
  wikipediaTitle: {
    tr: "Wikipedia Bilgisi",
    en: "Wikipedia Info",
    de: "Wikipedia-Info",
    ru: "Информация из Wikipedia",
  },
  wikipediaSource: {
    tr: "Kaynak: Wikipedia",
    en: "Source: Wikipedia",
    de: "Quelle: Wikipedia",
    ru: "Источник: Wikipedia",
  },
  readMore: {
    tr: "Devamını Oku",
    en: "Read More",
    de: "Weiterlesen",
    ru: "Читать дальше",
  },
  nearbyTitle: {
    tr: "Yakında",
    en: "Nearby",
    de: "In der Nähe",
    ru: "Рядом",
  },
  nearbyFood: {
    tr: "Yakındaki Yeme İçme",
    en: "Nearby Food & Drinks",
    de: "Essen & Trinken in der Nähe",
    ru: "Еда и напитки рядом",
  },
  nearbyUseful: {
    tr: "Pratik Yerler",
    en: "Useful Places",
    de: "Praktische Orte",
    ru: "Полезные места",
  },
  nearbySimilar: {
    tr: "Benzer Yerler",
    en: "Similar Places",
    de: "Ähnliche Orte",
    ru: "Похожие места",
  },
  all: {
    tr: "Tümü",
    en: "All",
    de: "Alle",
    ru: "Все",
  },
  distanceMeter: {
    tr: "m",
    en: "m",
    de: "m",
    ru: "м",
  },
};

function placeText(key: string, language: string) {
  const lang = String(language || "en").toLowerCase();
  return PLACE_UI[key]?.[lang] || PLACE_UI[key]?.en || key;
}

function readablePrice(value: string | undefined, language: string) {
  const raw = String(value || "").toLowerCase();
  if (!raw || raw === "unknown") return "-";
  if (raw.includes("expensive")) return placeText("expensive", language);
  if (raw.includes("moderate")) return placeText("moderate", language);
  if (raw.includes("cheap") || raw.includes("low")) return placeText("cheap", language);
  return value || "-";
}

function visitedText(language: string, isVisited: boolean) {
  if (isVisited) {
    if (language === "tr") return "Ziyaret Edildi";
    if (language === "de") return "Besucht";
    if (language === "ru") return "Посещено";
    return "Visited";
  }

  if (language === "tr") return "Ziyaret Edildi";
  if (language === "de") return "Besucht";
  if (language === "ru") return "Посещено";
  return "Visited";
}

function visitedAlertTitle(language: string) {
  if (language === "tr") return "Kaydedildi";
  if (language === "de") return "Gespeichert";
  if (language === "ru") return "Сохранено";
  return "Saved";
}

function visitedAlertMessage(language: string, removed: boolean) {
  if (removed) {
    if (language === "tr") return "Bu yer ziyaret edildi listesinden kaldırıldı.";
    if (language === "de") return "Dieser Ort wurde aus der Besuchsliste entfernt.";
    if (language === "ru") return "Это место удалено из списка посещённых.";
    return "This place was removed from visited places.";
  }

  if (language === "tr") return "Bu yer ziyaret edildi olarak işaretlendi.";
  if (language === "de") return "Dieser Ort wurde als besucht markiert.";
  if (language === "ru") return "Это место отмечено как посещённое.";
  return "This place was marked as visited.";
}


export default function Place() {
  const { id, name, from } = useLocalSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isAccountReady = !!user;

  const requireLogin = () => {
    if (isAccountReady) return true;

    Alert.alert(
      language === "tr" ? "Giriş gerekli" : language === "de" ? "Anmeldung erforderlich" : language === "ru" ? "Требуется вход" : "Login required",
      language === "tr"
        ? "Bu işlemi yapmak için giriş yapmalısın."
        : language === "de"
        ? "Du musst dich anmelden, um diese Funktion zu nutzen."
        : language === "ru"
        ? "Чтобы использовать эту функцию, необходимо войти."
        : "You need to log in to use this feature.",
      [
        { text: language === "tr" ? "Vazgeç" : language === "de" ? "Abbrechen" : language === "ru" ? "Отмена" : "Cancel" },
        {
          text: language === "tr" ? "Profil'e Git" : language === "de" ? "Zum Profil" : language === "ru" ? "В профиль" : "Go to Profile",
          onPress: () => router.push("/(tabs)/profile" as any),
        },
      ]
    );

    return false;
  };

  const [place, setPlace] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [insightData, setInsightData] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [isVisited, setIsVisited] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [weatherAdvice, setWeatherAdvice] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [wikiSummary, setWikiSummary] = useState<any>(null);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [selectedNearbyTab, setSelectedNearbyTab] = useState<"food" | "useful" | "similar">("food");

  useEffect(() => {
    const safeId = Array.isArray(id) ? id[0] : id;
    const safeName = Array.isArray(name) ? name[0] : name;

    if (!safeId && !safeName) {
      console.log("Place sayfasına id veya name parametresi gelmedi.");
      setPlace({
        error: true,
        name: "Mekan bilgisi eksik",
        city: "",
        category: "",
        subcategory: "",
        rating: "-",
        district: "",
        description: "Bu sayfa id veya name parametresi olmadan açıldı. Karttan detay sayfasına giderken id gönderdiğinden emin ol.",
        reviews: [],
        estimated_visit_time: "-",
      });
      return;
    }

    const url = safeId
  ? `${API_BASE_URL}/place-by-id/${encodeURIComponent(
      String(safeId)
    )}?language=${encodeURIComponent(language)}`
  : `${API_BASE_URL}/places/${encodeURIComponent(
      String(safeName)
    )}?language=${encodeURIComponent(language)}`;

    console.log("Fetcher URL:", url);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        console.log("Backend'den gelen veri:", data);
        if (data && !data.error) {
          setPlace(data);
        } else {
          Alert.alert("Hata", "Mekan bulunamadı.");
          setPlace({
            error: true,
            name: "Mekan bulunamadı",
            city: "",
            category: "",
            subcategory: "",
            rating: "-",
            district: "",
            description: "Backend bu mekan için veri döndürmedi. Gelen parametreyi kontrol et: " + (safeId || safeName),
            reviews: [],
            estimated_visit_time: "-",
          });
        }
      })
      .catch((err) => {
        console.error("Fetch Hatası:", err);
        Alert.alert("Hata", "Backend bağlantısı kurulamadı.");
        setPlace({
          error: true,
          name: "Bağlantı hatası",
          city: "",
          category: "",
          subcategory: "",
          rating: "-",
          district: "",
          description: "Backend çalışıyor mu kontrol et. Terminalde uvicorn açık olmalı.",
          reviews: [],
          estimated_visit_time: "-",
        });
      });
  }, [id, name, language]);

  useEffect(() => {
    if (!place?.name || place?.error) return;

    setLoadingInsight(true);


    fetch(
      `${API_BASE_URL}/place-insight?place=${encodeURIComponent(
        place.name
      )}&city=${encodeURIComponent(place.city || "")}&language=${encodeURIComponent(
        language
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setInsightData(data);
        setLoadingInsight(false);
      })
      .catch((err) => {
        console.log(err);
        setLoadingInsight(false);
      });
  }, [place, language]);

  useEffect(() => {
    if (!place?.latitude || !place?.longitude || place?.error) {
      setWeatherAdvice("");
      return;
    }

    setLoadingWeather(true);

    fetch(
      `${API_BASE_URL}/weather-advice?lat=${encodeURIComponent(
        String(place.latitude)
      )}&lng=${encodeURIComponent(String(place.longitude))}&language=${encodeURIComponent(
        language
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setWeatherAdvice(data?.advice || "");
      })
      .catch((err) => {
        console.log("weather advice error", err);
        setWeatherAdvice("");
      })
      .finally(() => {
        setLoadingWeather(false);
      });
  }, [place?.latitude, place?.longitude, place?.error, language]);

  useEffect(() => {
    if (!place?.name || place?.error) {
      setWikiSummary(null);
      return;
    }

    setLoadingWiki(true);

    fetch(
      `${API_BASE_URL}/wikipedia-summary?title=${encodeURIComponent(
        place.name
      )}&language=${encodeURIComponent(language)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error && data.extract) {
          setWikiSummary(data);
        } else {
          setWikiSummary(null);
        }
      })
      .catch((err) => {
        console.log("Wikipedia summary error:", err);
        setWikiSummary(null);
      })
      .finally(() => setLoadingWiki(false));
  }, [place?.name, place?.error, language]);

  useEffect(() => {
    if (!place?.id || place?.error) {
      setNearbyPlaces([]);
      return;
    }

    fetch(
      `${API_BASE_URL}/nearby-places?id=${encodeURIComponent(
        String(place.id)
      )}&language=${encodeURIComponent(language)}`
    )
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.places) ? data.places : [];
        setNearbyPlaces(list);
      })
      .catch((err) => {
        console.log("Nearby places error:", err);
        setNearbyPlaces([]);
      });
  }, [place?.id, place?.error, language]);

  const loadUserPlaceState = async (currentPlace: any) => {
    try {
      if (!isAccountReady || !currentPlace?.id) {
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      const savedList = await readJson<any[]>(STORAGE_KEYS.savedPlaces, []);
      setIsSaved(
        Array.isArray(savedList) &&
          savedList.some((item: any) => Number(item.id) === Number(currentPlace.id))
      );

      const visitedList = await readJson<any[]>(STORAGE_KEYS.visitedPlaces, []);
      setIsVisited(
        Array.isArray(visitedList) &&
          visitedList.some((item: any) => Number(item.id) === Number(currentPlace.id))
      );
    } catch (error) {
      console.log("Place state load error:", error);
      setIsSaved(false);
      setIsVisited(false);
    }
  };

  useEffect(() => {
    loadUserPlaceState(place);
  }, [place?.id, isAccountReady, user?.uid]);

  const savePlace = async () => {
    try {
      if (!requireLogin()) return;
      if (!place?.id) return;

      const savedPlaces = await readJson<any[]>(STORAGE_KEYS.savedPlaces, []);
      const safeList = Array.isArray(savedPlaces) ? savedPlaces : [];

      const alreadySaved = safeList.some(
        (item: any) => Number(item.id) === Number(place.id)
      );

      if (alreadySaved) {
        setIsSaved(true);
        Alert.alert(
          t("place.alreadySavedTitle") || "Kaydedildi",
          t("place.alreadySavedMessage") || "Bu yer zaten favorilerinde."
        );
        return;
      }

      const updatedPlaces = [place, ...safeList];
      await writeJson(STORAGE_KEYS.savedPlaces, updatedPlaces);
      setIsSaved(true);

      Alert.alert(t("place.savedTitle") || "Kaydedildi", t("place.savedMessage") || "Bu yer favorilerine eklendi.");
    } catch (error) {
      console.log(error);
      Alert.alert(t("place.errorTitle") || "Hata", t("place.saveError") || "Kayıt işlemi yapılamadı.");
    }
  };

  const toggleVisited = async () => {
    try {
      if (!requireLogin()) return;
      if (!place?.id) return;

      const list = await readJson<any[]>(STORAGE_KEYS.visitedPlaces, []);
      const safeList = Array.isArray(list) ? list : [];

      const exists = safeList.some(
        (item: any) => Number(item.id) === Number(place.id)
      );

      const updated = exists
        ? safeList.filter((item: any) => Number(item.id) !== Number(place.id))
        : [place, ...safeList];

      await writeJson(STORAGE_KEYS.visitedPlaces, updated);
      setIsVisited(!exists);

      Alert.alert(
        visitedAlertTitle(language),
        visitedAlertMessage(language, exists)
      );
    } catch (error) {
      console.log(error);
      Alert.alert(t("place.errorTitle") || "Hata", t("place.saveError") || "İşlem yapılamadı.");
    }
  };

  const showOnMap = () => {
    try {
      if (!place) return;

      router.push({
        pathname: "/(tabs)/map",
        params: {
          route: JSON.stringify([place]),
        },
      });
    } catch (error) {
      console.log(error);
      Alert.alert(t("place.errorTitle"), t("place.mapError"));
    }
  };

  const openNavigationApp = async (type: "google" | "apple" | "yandex") => {
    try {
      if (!place?.latitude || !place?.longitude) return;

      const lat = Number(place.latitude);
      const lng = Number(place.longitude);
      const label = encodeURIComponent(place.name || "Destination");

      const urls = {
        google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        apple: `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
        yandex: `yandexmaps://maps.yandex.com/?rtext=~${lat},${lng}&rtt=auto`,
      };

      const fallbackYandex = `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`;

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

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const cleanDistrict = (district?: string) => {
    if (!district) return "";
    let value = String(district).trim();
    value = value.replace(/^\d{5}\s*/, "").trim();

    if (value.includes("/")) {
      value = value.split("/")[0].trim();
    }
    if (value.includes(",")) {
      value = value.split(",")[0].trim();
    }
    return value;
  };

  const categoryLabel = (category?: string) => {
    if (!category) return "";
    const key = String(category).toLowerCase();
    if (key === "attraction") return placeText("attraction", language);
    if (key === "restaurant") return placeText("restaurant", language);
    if (key === "hotel") return placeText("hotel", language);
    if (key === "cafe") return placeText("cafe", language);
    if (key === "museum") return placeText("museum", language);
    if (key === "shopping") return placeText("shopping", language);
    return category;
  };

  const subcategoryLabel = (subcategory?: string) => {
    if (!subcategory) return "";
    const key = String(subcategory).toLowerCase();
    const map: any = {
      beach: language === "tr" ? "🏖️ Plaj" : language === "de" ? "🏖️ Strand" : language === "ru" ? "🏖️ Пляж" : "🏖️ Beach",
      nature: language === "tr" ? "🌿 Doğa" : language === "de" ? "🌿 Natur" : language === "ru" ? "🌿 Природа" : "🌿 Nature",
      shopping: placeText("shopping", language),
      historical: language === "tr" ? "🏛️ Tarihi" : language === "de" ? "🏛️ Historisch" : language === "ru" ? "🏛️ Историческое" : "🏛️ Historical",
      luxury: language === "tr" ? "Lüks" : language === "de" ? "Luxus" : language === "ru" ? "Люкс" : "Luxury",
      museum: placeText("museum", language),
      cafe: placeText("cafe", language),
      hotel: placeText("hotel", language),
      restaurant: placeText("restaurant", language),
      attraction: placeText("attraction", language),
    };
    return map[key] || subcategory;
  };

  const nearbyTabs = [
    { key: "food" as const, label: placeText("nearbyFood", language), icon: "restaurant-outline" },
    { key: "useful" as const, label: placeText("nearbyUseful", language), icon: "compass-outline" },
    { key: "similar" as const, label: placeText("nearbySimilar", language), icon: "sparkles-outline" },
  ];

  const nearbyFiltered = nearbyPlaces.filter((item: any) => {
    const cat = String(item?.category || "").toLowerCase();
    const sub = String(item?.subcategory || "").toLowerCase();

    if (selectedNearbyTab === "food") {
      return cat.includes("restaurant") || cat.includes("cafe") || sub.includes("restaurant") || sub.includes("cafe");
    }

    if (selectedNearbyTab === "useful") {
      return cat.includes("shopping") || cat.includes("hotel") || cat.includes("museum") || sub.includes("shopping") || sub.includes("museum");
    }

    return item?.category === place?.category || item?.subcategory === place?.subcategory;
  });

  const nearbyToShow = nearbyFiltered.length > 0 ? nearbyFiltered : nearbyPlaces.slice(0, 10);

  const nearbyIcon = (category?: string) => {
    const c = String(category || "").toLowerCase();
    if (c.includes("restaurant")) return "restaurant-outline";
    if (c.includes("cafe")) return "cafe-outline";
    if (c.includes("hotel")) return "bed-outline";
    if (c.includes("museum")) return "business-outline";
    if (c.includes("shopping")) return "bag-outline";
    return "location-outline";
  };

  const openNearbyPlace = (item: any) => {
    if (!item?.id) return;
    router.push({ pathname: "/place", params: { id: String(item.id) } });
  };

  const shouldShowPrice =
    place?.price_level &&
    place.price_level !== "unknown" &&
    place.price_level !== "UNKNOWN";

  if (!place) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const hasWebMentions = !!(
    insightData?.web_mentions && insightData.web_mentions.length > 0
  );
  const hasLocalReviews = !!(place.reviews && place.reviews.length > 0);
  const hasAiAnalysis = !!(analysis?.keywords && analysis.keywords.length > 0);
  const hasAiSummary = !!(
    summary?.summary &&
    typeof summary.summary === "string" &&
    summary.summary.trim() !== "" &&
    !summary.summary.toLowerCase().includes("no reviews") &&
    !summary.summary.toLowerCase().includes("yorum bulunamadı")
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.heroWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
  if (from === "map") {
    router.replace("/(tabs)/map");
  } else {
    router.back();
  }
}}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {place.image ? (
          <Image source={{ uri: place.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>{t("common.noImage")}</Text>
          </View>
        )}

        {/* Maske geçişi yeni koyu temaya kusursuzca entegre edildi */}
        <LinearGradient
          colors={[
            "rgba(19,22,34,0.05)",
            "rgba(19,22,34,0.25)",
            "rgba(19,22,34,0.85)",
          ]}
          style={styles.imageOverlay}
        />

        <View style={styles.heroInfo}>
          <Text style={styles.title}>{place.name}</Text>
          <Text style={styles.heroMeta}>
            {place.city} • {subcategoryLabel(place.subcategory) || categoryLabel(place.category)}
          </Text>
        </View>

        <View style={styles.floatingActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.saveButton, isSaved && styles.savedButton]}
            onPress={savePlace}
          >
            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={18} color={COLORS.white} />
            <Text style={styles.saveButtonText}>
              {isSaved
                ? language === "tr"
                  ? "Kaydedildi"
                  : language === "de"
                  ? "Gespeichert"
                  : language === "ru"
                  ? "Сохранено"
                  : "Saved"
                : t("common.save") || "Kaydet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.mapButton, isVisited && styles.visitedButton]}
            onPress={toggleVisited}
          >
            <Ionicons name={isVisited ? "checkmark-done" : "checkmark-done-outline"} size={18} color={isVisited ? COLORS.white : COLORS.text} />
            <Text style={[styles.mapButtonText, isVisited && styles.visitedButtonText]}>
              {visitedText(language, isVisited)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.mapButton}
            onPress={showOnMap}
          >
            <Ionicons name="map-outline" size={18} color={COLORS.text} />
            <Text style={styles.mapButtonText}>
              {t("common.showOnMap")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.weatherBox}>
          <View style={styles.weatherIconBox}>
            <Ionicons name="partly-sunny-outline" size={24} color={COLORS.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.weatherTitle}>{weatherText("title", language)}</Text>
            <Text style={styles.weatherText}>
              {loadingWeather
                ? weatherText("loading", language)
                : weatherAdvice || weatherText("unavailable", language)}
            </Text>
          </View>
        </View>

        {wikiSummary && (
          <View style={styles.wikipediaBox}>
            <View style={styles.wikipediaHeader}>
              <View style={styles.wikipediaIconBox}>
                <Ionicons name="book-outline" size={22} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wikipediaTitle}>{placeText("wikipediaTitle", language)}</Text>
                <Text style={styles.wikipediaSource}>{placeText("wikipediaSource", language)}</Text>
              </View>
            </View>

            <Text style={styles.wikipediaText} numberOfLines={5}>
              {wikiSummary.extract}
            </Text>

            {!!wikiSummary.url && (
              <TouchableOpacity style={styles.wikipediaReadMore} onPress={() => openLink(wikiSummary.url)}>
                <Text style={styles.wikipediaReadMoreText}>{placeText("readMore", language)}</Text>
                <Ionicons name="open-outline" size={15} color={COLORS.accent} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!loadingInsight && insightData ? (
          <>
            {insightData.ai_insight ? (
              <View style={styles.insightBox}>
                <Text style={styles.mainInsightTitle}>{t("place.aiInsight")}</Text>
                <Text style={styles.insightSummary}>
                  {insightData.ai_insight.summary}
                </Text>

                {insightData.ai_insight.best_for?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.bestFor")}</Text>
                    {insightData.ai_insight.best_for.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {insightData.ai_insight.strengths?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.strengths")}</Text>
                    {insightData.ai_insight.strengths.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {insightData.ai_insight.watch_out?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.watchOut")}</Text>
                    {insightData.ai_insight.watch_out.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}


        {nearbyPlaces.length > 0 && (
          <View style={styles.nearbyBox}>
            <View style={styles.nearbyHeader}>
              <View style={styles.nearbyTitleRow}>
                <Ionicons name="location-outline" size={24} color={COLORS.accent} />
                <Text style={styles.nearbyTitle}>{placeText("nearbyTitle", language)}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyTabsRow}
            >
              {nearbyTabs.map((tab) => {
                const active = selectedNearbyTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.nearbyTab, active && styles.nearbyTabActive]}
                    onPress={() => setSelectedNearbyTab(tab.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={active ? COLORS.white : COLORS.text}
                    />
                    <Text style={[styles.nearbyTabText, active && styles.nearbyTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyCardsRow}
            >
              {nearbyToShow.slice(0, 10).map((item: any, index: number) => (
                <TouchableOpacity
                  key={item.id || index}
                  style={styles.nearbyCard}
                  activeOpacity={0.88}
                  onPress={() => openNearbyPlace(item)}
                >
                  <View style={styles.nearbyCardIcon}>
                    <Ionicons name={nearbyIcon(item.category) as any} size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.nearbyCategory}>{categoryLabel(item.category)}</Text>
                  <Text style={styles.nearbyName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.nearbyDistance}>
                    {Math.round(Number(item.distance_m || 0))} {placeText("distanceMeter", language)}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={COLORS.textSoft} style={styles.nearbyArrow} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.practicalBox}>
          <View style={styles.practicalHeader}>
            <View style={styles.practicalIconBox}>
              <Ionicons name="sparkles-outline" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.practicalTitle}>{placeText("aiRouteSuggestion", language)}</Text>
              <Text style={styles.practicalText}>
                {place.category === "restaurant"
                  ? placeText("restaurantSuggestion", language)
                  : place.category === "hotel"
                  ? placeText("hotelSuggestion", language)
                  : placeText("defaultSuggestion", language)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitleCompact}>{placeText("practicalInfo", language)}</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{placeText("routeRole", language)}</Text>
            <Text style={styles.infoValue}>
              {place.category === "restaurant"
                ? placeText("routeRoleRestaurant", language)
                : place.category === "hotel"
                ? placeText("routeRoleHotel", language)
                : placeText("routeRoleDefault", language)}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{placeText("city", language)}</Text>
            <Text style={styles.infoValue}>{place.city}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{placeText("district", language)}</Text>
            <Text style={styles.infoValue}>
              {cleanDistrict(place.district) || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{placeText("category", language)}</Text>
            <Text style={styles.infoValue}>{categoryLabel(place.category)}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{placeText("subcategory", language)}</Text>
            <Text style={styles.infoValue}>
              {subcategoryLabel(place.subcategory) || "-"}
            </Text>
          </View>

          {shouldShowPrice && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{placeText("price", language)}</Text>
              <Text style={styles.infoValue}>{readablePrice(place.price_level, language)}</Text>
            </View>
          )}

          <View style={styles.infoCardWide}>
            <Text style={styles.infoLabel}>{placeText("visitTime", language)}</Text>
            <Text style={styles.infoValue}>
              ⏱ {place.estimated_visit_time} min
            </Text>
          </View>
        </View>

        <View style={styles.navigationBox}>
          <View style={styles.navigationHeader}>
            <View style={styles.navigationIconBox}>
              <Ionicons name="navigate-outline" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigationTitle}>{placeText("navigation", language)}</Text>
              <Text style={styles.navigationSubtitle}>{placeText("navigationSubtitle", language)}</Text>
            </View>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.navigationButton} onPress={() => openNavigationApp("google")}>
              <Ionicons name="logo-google" size={17} color={COLORS.accent} />
              <Text style={styles.navigationButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navigationButton} onPress={() => openNavigationApp("apple")}>
              <Ionicons name="map-outline" size={17} color={COLORS.accent} />
              <Text style={styles.navigationButtonText}>Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navigationButton} onPress={() => openNavigationApp("yandex")}>
              <Ionicons name="navigate-circle-outline" size={17} color={COLORS.accent} />
              <Text style={styles.navigationButtonText}>Yandex</Text>
            </TouchableOpacity>
          </View>
        </View>



        {hasWebMentions && (
          <>
            <Text style={styles.sectionTitle}>{t("place.webMentions")}</Text>
            {insightData.web_mentions.slice(0, 5).map((item: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.webCard}
                onPress={() => openLink(item.link)}
              >
                <Text style={styles.webTitle}>{item.title}</Text>
                <Text style={styles.webSnippet}>{item.snippet}</Text>
                <Text style={styles.webLink}>{item.displayLink}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {hasLocalReviews && (
          <>
            <Text style={styles.sectionTitle}>{t("place.localReviews")}</Text>
            <View style={styles.sectionCard}>
              {place.reviews.map((review: string, index: number) => (
                <Text key={index} style={styles.review}>
                  • {review}
                </Text>
              ))}
            </View>
          </>
        )}

        {hasAiAnalysis && (
          <>
            <Text style={styles.sectionTitle}>{t("place.aiAnalysis")}</Text>
            <View style={styles.keywordContainer}>
              {analysis.keywords.map((keyword: string, index: number) => (
                <Text key={index} style={styles.keyword}>
                  {keyword}
                </Text>
              ))}
            </View>
          </>
        )}

        {hasAiSummary && (
          <>
            <Text style={styles.sectionTitle}>{t("place.aiSummary")}</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.description}>{summary.summary}</Text>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wikipediaBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  wikipediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },

  wikipediaIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  wikipediaTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },

  wikipediaSource: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  wikipediaText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },

  wikipediaReadMore: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },

  wikipediaReadMoreText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "900",
  },

  nearbyBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  nearbyHeader: {
    marginBottom: 12,
  },

  nearbyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  nearbyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  nearbyTabsRow: {
    paddingRight: 16,
    paddingBottom: 12,
    gap: 8,
  },

  nearbyTab: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  nearbyTabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  nearbyTabText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  nearbyTabTextActive: {
    color: COLORS.white,
  },

  nearbyCardsRow: {
    paddingRight: 18,
    gap: 12,
  },

  nearbyCard: {
    width: 160,
    minHeight: 138,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    position: "relative",
  },

  nearbyCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  nearbyCategory: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  nearbyName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    paddingRight: 12,
  },

  nearbyDistance: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },

  nearbyArrow: {
    position: "absolute",
    right: 10,
    bottom: 12,
  },


  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },

  heroWrap: {
    position: "relative",
    margin: 18,
    marginBottom: 0,
    paddingBottom: 34,
  },

  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 3,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  image: {
    width: "100%",
    height: 280,
    borderRadius: 24,
  },

  imagePlaceholder: {
    width: "100%",
    height: 280,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 280,
    borderRadius: 24,
  },

  placeholderText: {
    color: COLORS.textSoft,
    fontSize: 16,
  },

  heroInfo: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 56,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  heroMeta: {
    fontSize: 15,
    color: "rgba(255,255,255,0.90)",
    fontWeight: "500",
  },

  floatingActions: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    flexDirection: "row",
    zIndex: 4,
  },

  saveButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 10,
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  mapButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  mapButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
  },

  visitedButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  visitedButtonText: {
    color: COLORS.white,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  weatherBox: {
    backgroundColor: "#EAF5FF",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  weatherIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  weatherTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },

  weatherText: {
    color: "#3F4A66",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  smartScoreBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  smartScoreLabel: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  smartScoreValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },

  smartScoreSub: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },

  insightBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  mainInsightTitle: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  insightSummary: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },

  insightSection: {
    marginTop: 8,
  },

  insightLabel: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  insightBullet: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },


  practicalBox: {
    backgroundColor: "#FFF1F4",
    borderWidth: 1,
    borderColor: "rgba(232,93,117,0.18)",
    borderRadius: 24,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  practicalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  practicalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  practicalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },

  practicalText: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },

  sectionTitleCompact: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 12,
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 0,
    marginBottom: 12,
  },

  infoCard: {
    width: "48.5%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    minHeight: 92,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  infoCardWide: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    minHeight: 86,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  infoLabel: {
    fontSize: 13,
    color: COLORS.textSoft,
    fontWeight: "800",
    marginBottom: 8,
  },

  infoValue: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: "900",
    lineHeight: 23,
  },

  navigationBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  navigationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },

  navigationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  navigationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  navigationSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  navigationButtons: {
    flexDirection: "row",
    gap: 8,
  },

  navigationButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  navigationButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  ratingBox: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  ratingTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },

  reviewCount: {
    color: COLORS.textSoft,
    marginTop: 4,
    fontSize: 14,
  },

  googleAddress: {
    color: COLORS.textSoft,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 10,
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSoft,
  },

  review: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
    color: COLORS.textSoft,
  },

  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  keyword: {
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  reviewCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  reviewAuthor: {
    color: COLORS.accent,
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 15,
  },

  reviewText: {
    color: COLORS.textSoft,
    lineHeight: 22,
    fontSize: 14,
  },

  reviewTime: {
    color: COLORS.textSoft,
    marginTop: 8,
    fontSize: 12,
  },

  webCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  webTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  webSnippet: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  webLink: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  reviewHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
  },

  reviewSectionSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -4,
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  reviewAvatarText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "700",
  },

  moreReviewsButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
  },

  moreReviewsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  savedButton: {
    backgroundColor: "#22C55E",
  },

});