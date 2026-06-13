import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

const HERO_MAX_HEIGHT = 330;
const HERO_MIN_HEIGHT = 190;
const HERO_SCROLL_DISTANCE = HERO_MAX_HEIGHT - HERO_MIN_HEIGHT;

// 🌤️ PREMIUM AÇIK TURİZM TEMASI
const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F1EEE8",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  accentDark: "#7C3AED",
  white: "#FFFFFF",
  shadow: "#C9BFB3",
};

function isValidImageUrl(uri?: string) {
  if (!uri) return false;
  const value = String(uri).trim();

  if (
    !value ||
    value === "unknown" ||
    value === "null" ||
    value === "undefined"
  ) {
    return false;
  }

  return value.startsWith("http://") || value.startsWith("https://");
}


function homeText(key: string, language: string) {
  const texts: Record<string, Record<string, string>> = {
    aiRecommended: {
      tr: "AI tarafından önerildi",
      en: "Recommended by AI",
      de: "Von AI empfohlen",
      ru: "Рекомендовано AI",
    },
    whyRecommended: {
      tr: "Neden önerildi?",
      en: "Why recommended?",
      de: "Warum empfohlen?",
      ru: "Почему рекомендовано?",
    },
    reasonHotel: {
      tr: "Konaklama planlarına uygun",
      en: "Fits stay planning",
      de: "Passt zur Unterkunftsplanung",
      ru: "Подходит для проживания",
    },
    reasonFood: {
      tr: "Yemek molası için uygun",
      en: "Good for a food stop",
      de: "Gut für eine Essenspause",
      ru: "Подходит для еды",
    },
    reasonAttraction: {
      tr: "Rota için güçlü durak",
      en: "Strong route stop",
      de: "Starker Routenstopp",
      ru: "Хорошая точка маршрута",
    },
    reasonCity: {
      tr: "İstanbul rotalarıyla uyumlu",
      en: "Fits Istanbul routes",
      de: "Passt zu Istanbul-Routen",
      ru: "Подходит к маршрутам Стамбула",
    },
    todayIstanbul: {
      tr: "İstanbul",
      en: "Istanbul",
      de: "Istanbul",
      ru: "Стамбул",
    },
    sunny: {
      tr: "Güneşli",
      en: "Sunny",
      de: "Sonnig",
      ru: "Солнечно",
    },
    todaySuggestions: {
      tr: "Bugün senin için öneriler",
      en: "Suggestions for today",
      de: "Vorschläge für heute",
      ru: "Рекомендации на сегодня",
    },
    weatherBased: {
      tr: "Hava Durumuna Göre Öneriler",
      en: "Weather-based Suggestions",
      de: "Wetterbasierte Empfehlungen",
      ru: "Рекомендации по погоде",
    },
    weatherBasedDesc: {
      tr: "Bugün açık alanlar ve sahil rotaları için uygun görünüyor.",
      en: "Today looks suitable for outdoor places and seaside routes.",
      de: "Heute eignen sich Außenbereiche und Küstenrouten.",
      ru: "Сегодня подходит для прогулок и маршрутов у воды.",
    },
    seeSuggestions: {
      tr: "Tüm önerileri gör",
      en: "See all suggestions",
      de: "Alle Vorschläge ansehen",
      ru: "Показать все",
    },
  };

  const lang = String(language || "en").toLowerCase();
  return texts[key]?.[lang] || texts[key]?.en || key;
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

function recommendationReason(item: any, language: string) {
  const c = String(item?.category || "").toLowerCase();

  if (c.includes("hotel")) return homeText("reasonHotel", language);
  if (c.includes("restaurant") || c.includes("food") || c.includes("cafe")) return homeText("reasonFood", language);
  return homeText("reasonAttraction", language);
}

function getPlaceholderIcon(category?: string) {
  const cat = String(category || "").toLowerCase();

  if (cat.includes("hotel")) return "bed-outline";
  if (cat.includes("restaurant") || cat.includes("food")) return "restaurant-outline";
  if (cat.includes("cafe")) return "cafe-outline";
  if (cat.includes("museum") || cat.includes("historical")) return "business-outline";
  if (cat.includes("nature") || cat.includes("park")) return "leaf-outline";
  if (cat.includes("tourism") || cat.includes("attraction")) return "map-outline";

  return "image-outline";
}

function getPlaceholderLabel(category?: string) {
  const cat = String(category || "").toLowerCase();

  if (cat.includes("hotel")) return "Hotel";
  if (cat.includes("restaurant") || cat.includes("food")) return "Restaurant";
  if (cat.includes("cafe")) return "Cafe";
  if (cat.includes("museum")) return "Museum";
  if (cat.includes("historical")) return "Historical";
  if (cat.includes("nature") || cat.includes("park")) return "Nature";
  if (cat.includes("tourism") || cat.includes("attraction")) return "Travel Spot";

  return "No Image";
}

function SmartImageBackground({
  uri,
  category,
  style,
  imageStyle,
  children,
}: any) {
  const [imageFailed, setImageFailed] = useState(false);
  const showRealImage = isValidImageUrl(uri) && !imageFailed;

  if (showRealImage) {
    return (
      <ImageBackground
        source={{ uri: String(uri).trim() }}
        style={style}
        imageStyle={imageStyle}
        onError={() => setImageFailed(true)}
      >
        {children}
      </ImageBackground>
    );
  }

  return (
    <LinearGradient
      colors={["#FFFFFF", "#F1EEE8", "#EDE7DD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[style, imageStyle, styles.placeholderImage]}
    >
      <View style={styles.placeholderCenter}>
        <View style={styles.placeholderIconWrap}>
          <Ionicons
            name={getPlaceholderIcon(category) as any}
            size={34}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.placeholderTitle}>{getPlaceholderLabel(category)}</Text>
        <Text style={styles.placeholderText}>Image not available</Text>
      </View>

      {children}
    </LinearGradient>
  );
}


export default function Home() {
  const { language, t } = useLanguage();
  const categories = [
    {
      key: "attractions",
      title: t("home.attractions"),
      icon: <Ionicons name="business-outline" size={19} color={COLORS.accent} />,
      filter: t("explore.attractions"),
    },
    {
      key: "hotels",
      title: t("home.hotels"),
      icon: <Ionicons name="bed-outline" size={19} color={COLORS.accent} />,
      filter: t("explore.hotels"),
    },
    {
      key: "food",
      title: t("home.food"),
      icon: <Ionicons name="restaurant-outline" size={19} color={COLORS.accent} />,
      filter: t("explore.restaurants"),
    },
    {
      key: "nature",
      title: t("home.nature"),
      icon: <Ionicons name="leaf-outline" size={19} color={COLORS.accent} />,
      filter: t("home.nature"),
    },
    {
      key: "events",
      title: t("home.events"),
      icon: <MaterialCommunityIcons name="drama-masks" size={19} color={COLORS.accent} />,
      filter: t("explore.all"),
    },
    {
      key: "beaches",
      title: t("home.beaches"),
      icon: <FontAwesome5 name="umbrella-beach" size={15} color={COLORS.accent} />,
      filter: t("home.beaches"),
    },
    {
      key: "shopping",
      title: t("home.shopping"),
      icon: <Ionicons name="bag-outline" size={19} color={COLORS.accent} />,
      filter: t("home.shopping"),
    },
    {
      key: "cities",
      title: t("home.cities"),
      icon: <Ionicons name="location-outline" size={19} color={COLORS.accent} />,
      filter: t("explore.all"),
    },
  ];

  const [places, setPlaces] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [aiPicks, setAiPicks] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);

  // 🌀 EFEKTLER İÇİN ANIMASYON DEĞERLERİ
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const translateYAnim = useRef(new Animated.Value(25)).current; 
  const aiPulseAnim = useRef(new Animated.Value(0)).current;

  const plannerScale = useRef(new Animated.Value(1)).current;
  const chatScale = useRef(new Animated.Value(1)).current;

  const loadSavedIds = async () => {
    try {
      const raw = await AsyncStorage.getItem("saved_places");
      const list = raw ? JSON.parse(raw) : [];
      setSavedIds(Array.isArray(list) ? list.map((p: any) => Number(p.id)).filter(Boolean) : []);
    } catch (error) {
      console.log("Saved load error:", error);
    }
  };

  const toggleFavorite = async (place: any) => {
    try {
      if (!place?.id) return;
      const raw = await AsyncStorage.getItem("saved_places");
      const list = raw ? JSON.parse(raw) : [];
      const exists = Array.isArray(list) && list.some((p: any) => Number(p.id) === Number(place.id));
      const updated = exists
        ? list.filter((p: any) => Number(p.id) !== Number(place.id))
        : [...(Array.isArray(list) ? list : []), place];
      await AsyncStorage.setItem("saved_places", JSON.stringify(updated));
      setSavedIds(updated.map((p: any) => Number(p.id)).filter(Boolean));
      Alert.alert(exists ? "Favorilerden çıkarıldı" : "Favorilere eklendi", place.name || "Mekan");
    } catch (error) {
      console.log("Favorite error:", error);
      Alert.alert("Hata", "Favori işlemi yapılamadı.");
    }
  };


  useEffect(() => {
  loadSavedIds();
  fetch("http://10.0.2.2:8000/places")
    .then((res) => res.json())
    .then((data) => {
      // Backend artık direkt liste dönüyor, o yüzden {data: ...} kısmını sildik
      console.log("Gelen liste:", data);
      setPlaces(Array.isArray(data) ? data : []);
    })
    .catch((err) => console.log("Hata:", err));
}, []);

  useEffect(() => {
    fetch("http://10.0.2.2:8000/hidden-gems?city=Istanbul")
      .then((res) => res.json())
      .then((data) => setAiPicks(data.places || []))
      .catch((err) => console.log("AI picks error:", err));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetch(`http://10.0.2.2:8000/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data))
        .catch((err) => console.log("Search error:", err));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(aiPulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(aiPulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const featuredAttractions = useMemo(() => {
    const list = places.filter((p) => p.is_featured === true);
    const seen = new Set();
    return list.filter((place: any) => {
      if (!place || !place.name) return false;
      const isDuplicate = seen.has(place.name.toLowerCase().trim());
      seen.add(place.name.toLowerCase().trim());
      return !isDuplicate;
    }).slice(0, 4);
  }, [places]);

  const featuredHotels = useMemo(() => 
    places
      .filter((p) => p.category === "hotel")
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3),
    [places]
  );

  const featuredRestaurants = useMemo(() => 
    places
      .filter((p) => p.category === "restaurant" || p.category === "cafe")
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3),
    [places]
  );

  const handleCategoryPress = (item: (typeof categories)[0]) => {
    if (item.key === "events") {
      router.push("/events");
      return;
    }
    router.push(`/(tabs)/explore?filter=${item.filter}`);
  };

  const getFeaturedImage = (item: any) => {
    return isValidImageUrl(item?.image) ? item.image : "";
  };

  const heroHeight = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [HERO_MAX_HEIGHT, HERO_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const heroTitleOpacity = scrollY.interpolate({
    inputRange: [0, 75, 125],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const heroSubtitleOpacity = scrollY.interpolate({
    inputRange: [0, 45, 95],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [0, -18],
    extrapolate: "clamp",
  });

  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [1, 1.06],
    extrapolate: "clamp",
  });

  const sparkleScale = aiPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const sparkleRotate = aiPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.heroContainer, { height: heroHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: imageScale }] }]}>
          <ImageBackground
            source={{ uri: "https://i.pinimg.com/1200x/93/af/47/93af47827880685eb12233087999a922.jpg" }}
            style={styles.heroImageBackground}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.38)", "rgba(247,244,239,0.98)"]}
              style={styles.heroOverlay}
            />
          </ImageBackground>
        </Animated.View>

        <Animated.View style={[styles.heroContent, { transform: [{ translateY: heroTranslateY }] }]}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.heroIconButton}>
              <Ionicons name="menu-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.heroRightActions}>
              <TouchableOpacity style={styles.heroCircleButton}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroCircleButton}>
                <Ionicons name="person-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: heroSubtitleOpacity }}>
            <Text style={styles.greeting}>{t("home.greeting")} ✨</Text>
          </Animated.View>

          <Animated.View style={{ opacity: heroTitleOpacity }}>
            <Text style={styles.heroTitle}>{t("home.whereNext")}</Text>
          </Animated.View>

          <Animated.View style={[styles.searchWrapper, { transform: [{ translateY: searchTranslateY }] }]}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={COLORS.textSoft} />
              <TextInput
                placeholder={t("home.searchPlaceholder")}
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
              />
              <TouchableOpacity style={styles.searchFilterButton}>
                <Ionicons name="options-outline" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        <View style={{ height: HERO_MAX_HEIGHT - 12 }} />

        <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>
          {query.trim() ? (
            <View style={styles.searchSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.searchResults")}</Text>
              </View>

              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchCard}
                    onPress={() => router.push({
    pathname: "/place", // Senin detay sayfanın adı (dosya yapına göre /place veya /(tabs)/place-detail olabilir)
    params: { id: item.id } 
  })}
                  >
                  
                    <View style={styles.searchCardIcon}>
                      <Ionicons name="location-outline" size={19} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchCardTitle}>{item.name}</Text>
                      <Text style={styles.searchCardMeta}>
  {item.city} • {categoryDisplay(item.category, language)}
</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.noResultText}>{t("home.noResults")}</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.categories")}</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
                  <Text style={styles.viewAllText}>{t("home.seeAll")}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.categoryPillCard}
                    onPress={() => handleCategoryPress(item)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.categoryPillIcon}>{item.icon}</View>
                    <Text style={styles.categoryPillTitle}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>


              <TouchableOpacity
                style={styles.todayWeatherCard}
                activeOpacity={0.88}
                onPress={() => router.push("/(tabs)/explore")}
              >
                <View style={styles.weatherLeft}>
                  <Ionicons name="sunny" size={34} color="#F59E0B" />
                  <View>
                    <Text style={styles.weatherCity}>{homeText("todayIstanbul", language)}</Text>
                    <Text style={styles.weatherTemp}>28°C</Text>
                    <Text style={styles.weatherStatus}>{homeText("sunny", language)}</Text>
                  </View>
                </View>

                <View style={styles.weatherDivider} />

                <View style={{ flex: 1 }}>
                  <View style={styles.weatherTopRow}>
                    <Text style={styles.weatherSuggestionTitle}>
                      {homeText("todaySuggestions", language)}
                    </Text>
                    <Ionicons name="chevron-forward" size={17} color={COLORS.text} />
                  </View>

                  <View style={styles.weatherChipsRow}>
                    {["Ortaköy", "Emirgan Korusu", "Galata Kulesi"].map((item) => (
                      <View key={item} style={styles.weatherChip}>
                        <Text style={styles.weatherChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Planlayıcı Kartı - Köprü Kırmızısı Esintili Degradeli Yeni Görünüm */}
              <Animated.View style={{ transform: [{ scale: plannerScale }] }}>
                <TouchableOpacity
                  style={styles.plannerHeroCard}
                  activeOpacity={1}
                  onPressIn={() => handlePressIn(plannerScale)}
                  onPressOut={() => handlePressOut(plannerScale)}
                  onPress={() => router.push("/(tabs)/trip-planner")}
                >
                  <LinearGradient
                    colors={["#FFF5F7", "#FFFFFF", "#F5F0EA"]} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.plannerGradient}
                  >
                    <View style={styles.plannerContent}>
                      <View style={styles.aiPoweredBadge}>
                        <Animated.View style={{ transform: [{ scale: sparkleScale }] }}>
                          <Ionicons name="sparkles" size={11} color={COLORS.accent} />
                        </Animated.View>
                        <Text style={styles.aiPoweredText}>{t("home.aiPowered")}</Text>
                      </View>

                      <Text style={styles.plannerHeroTitle}>
                        {t("home.planPerfectTrip")}
                      </Text>
                      <Text style={styles.plannerHeroText}>
                        {t("home.planPerfectTripText")}
                      </Text>

                      <View style={styles.plannerButton}>
                        <Text style={styles.plannerButtonText}>{t("home.planMyTrip")}</Text>
                        <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
                      </View>
                    </View>

                    <View style={styles.plannerIllustration}>
                      <View style={styles.suitcase}>
                        <Ionicons name="briefcase-outline" size={40} color={COLORS.accent} />
                      </View>
                      <View style={styles.mapPinBubble}>
                        <Ionicons name="location" size={18} color={COLORS.white} />
                      </View>
                      
                      <Animated.View style={[styles.sparkleOne, { transform: [{ scale: sparkleScale }, { rotate: sparkleRotate }] }]}>
                        <Ionicons name="sparkles" size={15} color={COLORS.accent} />
                      </Animated.View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {aiPicks.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>{t("home.aiForYou")}</Text>
                      <Text style={styles.sectionSubtitle}>
                        {t("home.hiddenGemsPicked")}
                      </Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={styles.viewAllText}>{t("home.seeAll")}</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 8 }}
                  >
                    {aiPicks.slice(0, 6).map((item, index) => (
                      <TouchableOpacity
                        key={item.id || index}
                        style={styles.aiPickCard}
                        activeOpacity={0.92}
                        onPress={() => router.push({ pathname: "/place", params: { id: String(item.id) } })}
                      >
                        <SmartImageBackground
                          uri={item.image}
                          category={item.category}
                          index={index}
                          style={styles.aiPickImage}
                          imageStyle={styles.aiPickImageStyle}
                        >
                          <LinearGradient
                            colors={["transparent", "rgba(19,22,34,0.2)", "rgba(19,22,34,0.96)"]}
                            style={styles.aiPickOverlay}
                          >
                            <View style={styles.aiPickTop}>
                              <View style={styles.hiddenGemBadge}>
                                <Text style={styles.hiddenGemText}>{t("home.aiPick")}</Text>
                              </View>
                              <TouchableOpacity style={styles.aiHeart} onPress={(e: any) => { e?.stopPropagation?.(); toggleFavorite(item); }}>
                                <Ionicons name={savedIds.includes(Number(item.id)) ? "heart" : "heart-outline"} size={18} color={COLORS.accent} />
                              </TouchableOpacity>
                            </View>

                            <View>
                              <Text style={styles.aiPickTitle} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.aiPickMeta}>
                                {item.city} • {categoryDisplay(item.category, language)}
                              </Text>
                              <View style={styles.recommendationBox}>
                                <Text style={styles.recommendationTitle}>
                                  {homeText("whyRecommended", language)}
                                </Text>
                                <Text style={styles.recommendationText}>
                                  ✓ {recommendationReason(item, language)}
                                </Text>
                                <Text style={styles.recommendationText}>
                                  ✓ {homeText("reasonCity", language)}
                                </Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </SmartImageBackground>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("home.featuredDestinations")}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
                  <Text style={styles.viewAllText}>{t("home.viewAll")}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8 }}
              >
                {featuredAttractions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.featuredCard}
                    onPress={() => router.push({ pathname: "/place", params: { id: String(item.id) } })}
                    activeOpacity={0.92}
                  >
                    <SmartImageBackground
                      uri={item.image}
                      category={item.category}
                      index={index}
                      style={styles.featuredImage}
                      imageStyle={styles.featuredImageStyle}
                    >
                      <LinearGradient
                        colors={["transparent", "rgba(19,22,34,0.15)", "rgba(19,22,34,0.85)"]}
                        style={styles.featuredOverlay}
                      >
                        <TouchableOpacity style={styles.favoriteButton} onPress={(e: any) => { e?.stopPropagation?.(); toggleFavorite(item); }}>
                          <Ionicons name={savedIds.includes(Number(item.id)) ? "heart" : "heart-outline"} size={18} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View>
                          <Text style={styles.featuredTitle} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={13} color={COLORS.accent} />
                            <Text style={styles.locationText}>{item.city || "Turkey"}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </SmartImageBackground>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AI Chat Kartı */}
              <Animated.View style={{ transform: [{ scale: chatScale }] }}>
                <TouchableOpacity
                  style={styles.aiChatCard}
                  activeOpacity={1}
                  onPressIn={() => handlePressIn(chatScale)}
                  onPressOut={() => handlePressOut(chatScale)}
                  onPress={() => router.push("/(tabs)/chat")}
                >
                  <View style={styles.aiLeft}>
                    <View style={styles.aiIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiTitle}>
                        {t("home.aiTravelCompanion")}
                      </Text>
                      <Text style={styles.aiText}>
                        {t("home.aiTravelText")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiButton}>
                    <Text style={styles.aiButtonText}>{t("home.startChat")}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
              </Animated.View>


              <View style={styles.featureGrid}>
                <TouchableOpacity style={styles.featureSmallCard} activeOpacity={0.88} onPress={() => router.push("/(tabs)/explore")}>
                  <Ionicons name="partly-sunny-outline" size={26} color={COLORS.accent} />
                  <Text style={styles.featureCardTitle}>{homeText("weatherBased", language)}</Text>
                  <Text style={styles.featureCardText}>{homeText("weatherBasedDesc", language)}</Text>
                  <View style={styles.featureButton}>
                    <Text style={styles.featureButtonText}>{homeText("seeSuggestions", language)}</Text>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.featureSmallCard} activeOpacity={0.88} onPress={() => router.push("/travel-journal" as any)}>
                  <View style={styles.journalPhotoPreview}>
                    <Image
                      source={{ uri: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=600" }}
                      style={[styles.journalPhoto, styles.journalPhotoOne]}
                    />
                    <Image
                      source={{ uri: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=600" }}
                      style={[styles.journalPhoto, styles.journalPhotoTwo]}
                    />
                    <View style={styles.journalCameraBadge}>
                      <Ionicons name="camera" size={20} color={COLORS.white} />
                    </View>
                  </View>
                  <Text style={styles.featureCardTitle}>Gezi Günlüğüne Fotoğraf</Text>
                  <Text style={styles.featureCardText}>Anılarını fotoğraf ve notlarla birlikte kaydet.</Text>
                  <View style={styles.featureOutlineButton}>
                    <Text style={styles.featureOutlineButtonText}>Fotoğraf Ekle</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.subSectionTitle}>{t("home.topHotels")}</Text>
              {featuredHotels.map((hotel, index) => (
                <TouchableOpacity
                  key={hotel.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push({ pathname: "/place", params: { id: String(hotel.id) } })}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons name="bed-outline" size={19} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{hotel.name}</Text>
                    <Text style={styles.infoCardText}>
  {hotel.city} • {categoryDisplay(hotel.category, language)}
</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
                </TouchableOpacity>
              ))}

              <Text style={styles.subSectionTitle}>{t("home.topFoodPicks")}</Text>
              {featuredRestaurants.map((restaurant, index) => (
                <TouchableOpacity
                  key={restaurant.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push({ pathname: "/place", params: { id: String(restaurant.id) } })}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons name="restaurant-outline" size={19} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{restaurant.name}</Text>
                    <Text style={styles.infoCardText}>
  {restaurant.city} • {categoryDisplay(restaurant.category, language)}
</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={{ height: 36 }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 18,
  },
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: COLORS.bg,
  },
  heroImageBackground: {
    flex: 1,
  },
  heroImage: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 54,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  heroCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  greeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  searchWrapper: {
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 6,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 10,
    marginRight: 10,
    fontSize: 15,
    fontWeight: "500",
  },
  searchFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 2,
    fontWeight: "400",
  },
  subSectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 16,
  },
  viewAllText: {
    color: COLORS.accent, 
    fontSize: 13,
    fontWeight: "700",
  },
  categoryRow: {
    paddingRight: 12,
    paddingBottom: 16,
  },
  categoryPillCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 46,
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
  },
  categoryPillIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  categoryPillTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  todayWeatherCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    marginBottom: 18,
  },
  weatherLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 122,
    gap: 10,
  },
  weatherCity: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  weatherTemp: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  weatherStatus: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  weatherDivider: {
    width: 1,
    height: 56,
    backgroundColor: "rgba(31,41,55,0.08)",
    marginHorizontal: 14,
  },
  weatherTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weatherSuggestionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  weatherChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  weatherChip: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.06)",
  },
  weatherChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  featureGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  featureSmallCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  featureCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  featureCardText: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    minHeight: 50,
  },

  journalPhotoPreview: {
    height: 78,
    marginBottom: 8,
    position: "relative",
  },
  journalPhoto: {
    position: "absolute",
    width: 82,
    height: 62,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.surfaceSoft,
  },
  journalPhotoOne: {
    left: 6,
    top: 8,
    transform: [{ rotate: "-8deg" }],
  },
  journalPhotoTwo: {
    right: 8,
    top: 2,
    transform: [{ rotate: "7deg" }],
  },
  journalCameraBadge: {
    position: "absolute",
    left: "50%",
    top: 26,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  featureButton: {
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
  },
  featureButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  featureOutlineButton: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  featureOutlineButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  plannerHeroCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
  },
  plannerGradient: {
    minHeight: 160,
    padding: 20,
    borderRadius: 24,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
  },
  plannerContent: {
    flex: 1.3,
    justifyContent: "center",
  },
  aiPoweredBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(232, 93, 117, 0.12)", 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  aiPoweredText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  plannerHeroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  plannerHeroText: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  plannerButton: {
    alignSelf: "flex-start",
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
  },
  plannerButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 6,
  },
  plannerIllustration: {
    flex: 0.7,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  suitcase: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "rgba(232, 93, 117, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinBubble: {
    position: "absolute",
    right: 8,
    bottom: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleOne: {
    position: "absolute",
    top: 14,
    right: 12,
  },
  aiPickCard: {
    width: width * 0.58,
    height: 250,
    borderRadius: 24,
    overflow: "hidden",
    marginRight: 14,
    marginBottom: 24,
    backgroundColor: COLORS.surface,
  },
  aiPickImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  aiPickImageStyle: {
    borderRadius: 24,
  },
  aiPickOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 24,
  },
  aiPickTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hiddenGemBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accentDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  hiddenGemText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  aiHeart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  aiPickTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  aiPickMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 6,
  },
  aiPickBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiPickScore: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  aiPickSmart: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
  },

  recommendationBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },

  recommendationTitle: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },

  recommendationText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },

  featuredCard: {
    width: width * 0.74,
    height: 250,
    marginRight: 14,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  featuredImageStyle: {
    borderRadius: 24,
  },
  featuredOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 24,
  },
  favoriteButton: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(19,22,34,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginLeft: 4,
    fontWeight: "500",
  },
  aiChatCard: {
    marginVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
  },
  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aiTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  aiText: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  aiButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
    gap: 6,
  },
  aiButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.07)",
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoCardText: {
    color: COLORS.textSoft,
    fontSize: 13,
  },
  searchSection: {
    paddingTop: 4,
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  searchCardMeta: {
    color: COLORS.textSoft,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
  },

  placeholderImage: {
    overflow: "hidden",
  },
  placeholderCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  placeholderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(232, 93, 117, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.08)",
  },
  placeholderTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  placeholderText: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  noResultText: {
    color: COLORS.textSoft,
    fontSize: 14,
    fontWeight: "500",
  },
});
