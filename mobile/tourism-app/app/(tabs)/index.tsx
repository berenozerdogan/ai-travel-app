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
} from "react-native";
import { router } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

const HERO_MAX_HEIGHT = 330;
const HERO_MIN_HEIGHT = 190;
const HERO_SCROLL_DISTANCE = HERO_MAX_HEIGHT - HERO_MIN_HEIGHT;

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE TEMASI (Muted Crimson & Midnight)
const COLORS = {
  bg: "#131622",          // Fotoğraftaki o derin, puslu gece denizi rengi
  surface: "#1C1F30",     // Gece mavisi-gri asil kart yüzeyi
  surfaceSoft: "#272B42", // İkon kutuları ve input için soft kontrast ton
  text: "#F1F3F9",        // Göz yormayan, net kirli beyaz başlıklar
  textSoft: "#8E95B2",    // Görseldeki sis bulutlarının puslu grisi
  accent: "#D65A5A",      // 🎯 Aradığın o büyüleyici köprü kırmızısı (Muted Crimson)
  accentDark: "#3F4463",  // Kategoriler ve yan ögeler için koyu lila-gri asalet tonu
  white: "#FFFFFF",
  shadow: "#090A10",
};

export default function Home() {
  const { t } = useLanguage();
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

  // 🌀 EFEKTLER İÇİN ANIMASYON DEĞERLERİ
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const translateYAnim = useRef(new Animated.Value(25)).current; 
  const aiPulseAnim = useRef(new Animated.Value(0)).current;

  const plannerScale = useRef(new Animated.Value(1)).current;
  const chatScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetch("http://10.0.2.2:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log("Places fetch error:", err));
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

  const getFeaturedImage = (item: any, index: number) => {
    if (item?.image) return item.image;
    const fallbackImages = [
      "https://i.pinimg.com/1200x/8d/d4/64/8dd4640d383f56a69a000561ad79bd36.jpg",
      "https://images.unsplash.com/photo-1570213489059-0aac6626cade?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    ];
    return fallbackImages[index % fallbackImages.length];
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
              colors={["rgba(19,22,34,0.15)", "rgba(19,22,34,0.55)", "#131622"]}
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
            <Text style={styles.greeting}>{t("home.greeting") || "Good morning"} ✨</Text>
          </Animated.View>

          <Animated.View style={{ opacity: heroTitleOpacity }}>
            <Text style={styles.heroTitle}>{t("home.whereNext") || "Where to next?"}</Text>
          </Animated.View>

          <Animated.View style={[styles.searchWrapper, { transform: [{ translateY: searchTranslateY }] }]}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={COLORS.textSoft} />
              <TextInput
                placeholder={t("home.searchPlaceholder") || "Search places, hotels, restaurants..."}
                placeholderTextColor="#5C627D"
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
                <Text style={styles.sectionTitle}>{t("home.searchResults") || "Search Results"}</Text>
              </View>

              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchCard}
                    onPress={() => router.push(`/place?name=${item.name}`)}
                  >
                    <View style={styles.searchCardIcon}>
                      <Ionicons name="location-outline" size={19} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchCardTitle}>{item.name}</Text>
                      <Text style={styles.searchCardMeta}>
                        {item.city} • {item.category} • ⭐ {item.rating}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.noResultText}>{t("home.noResults") || "No results found."}</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.categories") || "Categories"}</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
                  <Text style={styles.viewAllText}>{t("home.seeAll") || "See all"}</Text>
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
                    colors={["#3A242B", "#191B2A", "#1C1F30"]} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.plannerGradient}
                  >
                    <View style={styles.plannerContent}>
                      <View style={styles.aiPoweredBadge}>
                        <Animated.View style={{ transform: [{ scale: sparkleScale }] }}>
                          <Ionicons name="sparkles" size={11} color={COLORS.accent} />
                        </Animated.View>
                        <Text style={styles.aiPoweredText}>{t("home.aiPowered") || "AI POWERED"}</Text>
                      </View>

                      <Text style={styles.plannerHeroTitle}>
                        {t("home.planPerfectTrip") || "Plan your perfect trip"}
                      </Text>
                      <Text style={styles.plannerHeroText}>
                        {t("home.planPerfectTripText") || "Create a personalized itinerary based on your city, days and interests."}
                      </Text>

                      <View style={styles.plannerButton}>
                        <Text style={styles.plannerButtonText}>{t("home.planMyTrip") || "Plan My Trip"}</Text>
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
                      <Text style={styles.sectionTitle}>{t("home.aiForYou") || "AI For You"}</Text>
                      <Text style={styles.sectionSubtitle}>
                        {t("home.hiddenGemsPicked") || "Hidden gems picked just for you"}
                      </Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={styles.viewAllText}>See all</Text>
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
                        onPress={() => router.push(`/place?name=${item.name}`)}
                      >
                        <ImageBackground
                          source={{ uri: getFeaturedImage(item, index) }}
                          style={styles.aiPickImage}
                          imageStyle={styles.aiPickImageStyle}
                        >
                          <LinearGradient
                            colors={["transparent", "rgba(19,22,34,0.2)", "rgba(19,22,34,0.96)"]}
                            style={styles.aiPickOverlay}
                          >
                            <View style={styles.aiPickTop}>
                              <View style={styles.hiddenGemBadge}>
                                <Text style={styles.hiddenGemText}>{t("home.aiPick") || "AI Pick"}</Text>
                              </View>
                              <TouchableOpacity style={styles.aiHeart}>
                                <Ionicons name="heart" size={18} color={COLORS.accent} />
                              </TouchableOpacity>
                            </View>

                            <View>
                              <Text style={styles.aiPickTitle} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.aiPickMeta}>
                                {item.city} • {item.category}
                              </Text>
                              <View style={styles.aiPickBottom}>
                                <Text style={styles.aiPickScore}>⭐ {item.rating || "-"}</Text>
                                <Text style={styles.aiPickSmart}>🧠 {item.hidden_gem_score || "-"} match</Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("home.featuredDestinations") || "Featured Destinations"}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
                  <Text style={styles.viewAllText}>{t("home.viewAll") || "View all"}</Text>
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
                    onPress={() => router.push(`/place?name=${item.name}`)}
                    activeOpacity={0.92}
                  >
                    <ImageBackground
                      source={{ uri: getFeaturedImage(item, index) }}
                      style={styles.featuredImage}
                      imageStyle={styles.featuredImageStyle}
                    >
                      <LinearGradient
                        colors={["transparent", "rgba(19,22,34,0.15)", "rgba(19,22,34,0.85)"]}
                        style={styles.featuredOverlay}
                      >
                        <TouchableOpacity style={styles.favoriteButton}>
                          <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
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
                    </ImageBackground>
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
                        {t("home.aiTravelCompanion") || "AI Travel Companion"}
                      </Text>
                      <Text style={styles.aiText}>
                        {t("home.aiTravelText") || "Ask for hotels, routes, events and hidden gems."}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiButton}>
                    <Text style={styles.aiButtonText}>{t("home.startChat") || "Start Chat"}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.subSectionTitle}>{t("home.topHotels") || "Top Hotels"}</Text>
              {featuredHotels.map((hotel, index) => (
                <TouchableOpacity
                  key={hotel.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push(`/place?name=${hotel.name}`)}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons name="bed-outline" size={19} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{hotel.name}</Text>
                    <Text style={styles.infoCardText}>
                      {hotel.city} • {hotel.subcategory} • ⭐ {hotel.rating}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
                </TouchableOpacity>
              ))}

              <Text style={styles.subSectionTitle}>{t("home.topFoodPicks") || "Top Food Picks"}</Text>
              {featuredRestaurants.map((restaurant, index) => (
                <TouchableOpacity
                  key={restaurant.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push(`/place?name=${restaurant.name}`)}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons name="restaurant-outline" size={19} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{restaurant.name}</Text>
                    <Text style={styles.infoCardText}>
                      {restaurant.city} • {restaurant.subcategory} • ⭐ {restaurant.rating}
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    borderColor: "rgba(255,255,255,0.03)",
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
    borderColor: "rgba(255,255,255,0.03)",
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
    borderColor: "rgba(255,255,255,0.04)",
  },
  plannerContent: {
    flex: 1.3,
    justifyContent: "center",
  },
  aiPoweredBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(214, 90, 90, 0.15)", 
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
    backgroundColor: "rgba(214, 90, 90, 0.08)",
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
    color: COLORS.text,
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
    backgroundColor: "rgba(19,22,34,0.4)",
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
    color: "#D1D5DB",
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
    borderColor: "rgba(255,255,255,0.03)",
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
    borderColor: "rgba(255,255,255,0.02)",
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
  noResultText: {
    color: COLORS.textSoft,
    fontSize: 14,
    fontWeight: "500",
  },
});