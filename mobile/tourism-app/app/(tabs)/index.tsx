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

const HERO_MAX_HEIGHT = 300;
const HERO_MIN_HEIGHT = 176;
const HERO_SCROLL_DISTANCE = HERO_MAX_HEIGHT - HERO_MIN_HEIGHT;

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  surfaceSoft: "#EFE7D8",
  surfaceMuted: "#E9E1D2",
  text: "#1E2418",
  textSoft: "#5F6656",
  accent: "#B8CC2A",
  accentDark: "#28310F",
  white: "#FFFFFF",
  shadow: "#9E9688",
};

const categories = [
  {
    key: "attractions",
    title: "Attractions",
    icon: <Ionicons name="business-outline" size={24} color="#2E351F" />,
    filter: "Attractions",
  },
  {
    key: "hotels",
    title: "Hotels",
    icon: <Ionicons name="bed-outline" size={24} color="#2E351F" />,
    filter: "Hotels",
  },
  {
    key: "food",
    title: "Food",
    icon: <Ionicons name="restaurant-outline" size={24} color="#2E351F" />,
    filter: "Restaurants",
  },
  {
    key: "nature",
    title: "Nature",
    icon: <Ionicons name="leaf-outline" size={24} color="#2E351F" />,
    filter: "Attractions",
  },
  {
    key: "events",
    title: "Events",
    icon: (
      <MaterialCommunityIcons name="drama-masks" size={24} color="#2E351F" />
    ),
    filter: "All",
  },
  {
    key: "beaches",
    title: "Beaches",
    icon: <FontAwesome5 name="umbrella-beach" size={18} color="#2E351F" />,
    filter: "Attractions",
  },
  {
    key: "shopping",
    title: "Shopping",
    icon: <Ionicons name="cart-outline" size={24} color="#2E351F" />,
    filter: "All",
  },
  {
    key: "cities",
    title: "Cities",
    icon: <Ionicons name="location-outline" size={24} color="#2E351F" />,
    filter: "All",
  },
];

export default function Home() {
  const { t } = useLanguage();

  const [places, setPlaces] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetch("http://192.168.1.102:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log("Places fetch error:", err));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetch(`http://192.168.1.102:8000/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data))
        .catch((err) => console.log("Search error:", err));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const featuredAttractions = useMemo(
    () => places.filter((p) => p.category === "attraction").slice(0, 4),
    [places]
  );

  const featuredHotels = useMemo(
    () => places.filter((p) => p.category === "hotel").slice(0, 2),
    [places]
  );

  const featuredRestaurants = useMemo(
    () => places.filter((p) => p.category === "restaurant").slice(0, 2),
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
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1200&auto=format&fit=crop",
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
    inputRange: [0, 70, 120],
    outputRange: [1, 0.55, 0],
    extrapolate: "clamp",
  });

  const heroSubtitleOpacity = scrollY.interpolate({
    inputRange: [0, 40, 90],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [0, -16],
    extrapolate: "clamp",
  });

  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [0, -8],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [0, HERO_SCROLL_DISTANCE],
    outputRange: [1, 1.06],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={[styles.heroContainer, { height: heroHeight }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [{ scale: imageScale }],
            },
          ]}
        >
          <ImageBackground
            source={{
              uri: "https://images.openai.com/static-rsc-4/AvwWetV3Es1D7uelW2Ie4q9jsfYvydODXKld93ApiypSN4vwsq9CgcAfmHcH1Yu9DdFiKifZeB97gdCamFvbOAuEu2kuTTa_qIiBOxjoqdzNO9qPOt-Ht5piSXOmnjnWo-rxAgfAMwltTMKMCt9eR4xoEECz0H94KB2YV7D2X6beRZFrhGp6BGTxbURSKaIY?purpose=fullsize",
            }}
            style={styles.heroImageBackground}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={[
                "rgba(34,39,22,0.05)",
                "rgba(34,39,22,0.20)",
                "rgba(217,210,195,0.92)",
              ]}
              style={styles.heroOverlay}
            />
          </ImageBackground>
        </Animated.View>

        <Animated.View
          style={[
            styles.heroContent,
            {
              transform: [{ translateY: heroTranslateY }],
            },
          ]}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="menu-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: heroTitleOpacity }}>
            <Text style={styles.heroTitle}>
              {t("home.title") || "Explore Turkey"}
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: heroSubtitleOpacity }}>
            <Text style={styles.heroSubtitle}>
              {t("home.subtitle") ||
                "Discover elegant stays, scenic routes and unforgettable places."}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.searchWrapper,
              {
                transform: [{ translateY: searchTranslateY }],
              },
            ]}
          >
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={22} color="#7D806F" />
              <TextInput
                placeholder={
                  t("home.searchPlaceholder") || "Search destinations..."
                }
                placeholderTextColor="#7D806F"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
              />
              <Ionicons name="mic-outline" size={20} color="#7D806F" />
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
        <View style={{ height: HERO_MAX_HEIGHT - 28 }} />

        <View style={styles.body}>
          {query.trim() ? (
            <View style={styles.searchSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Search Results</Text>
              </View>

              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchCard}
                    onPress={() => router.push(`/place?name=${item.name}`)}
                  >
                    <View style={styles.searchCardIcon}>
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color={COLORS.accentDark}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchCardTitle}>{item.name}</Text>
                      <Text style={styles.searchCardMeta}>
                        {item.city} • {item.category} • ⭐ {item.rating}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#8B8D82"
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.noResultText}>No results found.</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("home.categories") || "Categories"}
                </Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.categoryGrid}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(item)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.categoryIconWrap}>{item.icon}</View>
                    <Text style={styles.categoryText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("home.featured") || "Featured Destinations"}
                </Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>
                    {t("home.seeAll") || "View all"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Animated.ScrollView
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
                        colors={[
                          "rgba(24,25,18,0.04)",
                          "rgba(24,25,18,0.18)",
                          "rgba(24,25,18,0.68)",
                        ]}
                        style={styles.featuredOverlay}
                      >
                        <TouchableOpacity style={styles.favoriteButton}>
                          <Ionicons
                            name="heart-outline"
                            size={18}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>

                        <View>
                          <Text style={styles.featuredTitle}>{item.name}</Text>
                          <Text style={styles.featuredSubtitle}>
                            {item.subcategory || "Curated destination"}
                          </Text>
                          <View style={styles.locationRow}>
                            <Ionicons
                              name="location-sharp"
                              size={14}
                              color="#E8E8DE"
                            />
                            <Text style={styles.locationText}>
                              {item.city || "Turkey"}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>

              <TouchableOpacity
                style={styles.aiCard}
                onPress={() => router.push("/(tabs)/chat")}
                activeOpacity={0.92}
              >
                <View style={styles.aiLeft}>
                  <View style={styles.aiIcon}>
                    <Ionicons
                      name="sparkles-outline"
                      size={22}
                      color={COLORS.accentDark}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiTitle}>AI Travel Companion</Text>
                    <Text style={styles.aiText}>
                      Get smart recommendations for hotels, routes and hidden gems.
                    </Text>
                  </View>
                </View>

                <View style={styles.aiButton}>
                  <Text style={styles.aiButtonText}>Start Chat</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
                </View>
              </TouchableOpacity>

              <Text style={styles.subSectionTitle}>Top Hotels</Text>
              {featuredHotels.map((hotel, index) => (
                <TouchableOpacity
                  key={hotel.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push(`/place?name=${hotel.name}`)}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons
                      name="bed-outline"
                      size={20}
                      color={COLORS.accentDark}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{hotel.name}</Text>
                    <Text style={styles.infoCardText}>
                      {hotel.city} • {hotel.subcategory} • ⭐ {hotel.rating}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#8F8A7E"
                  />
                </TouchableOpacity>
              ))}

              <Text style={styles.subSectionTitle}>Top Food Picks</Text>
              {featuredRestaurants.map((restaurant, index) => (
                <TouchableOpacity
                  key={restaurant.id || index}
                  style={styles.infoCard}
                  onPress={() => router.push(`/place?name=${restaurant.name}`)}
                >
                  <View style={styles.infoIconBox}>
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color={COLORS.accentDark}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>{restaurant.name}</Text>
                    <Text style={styles.infoCardText}>
                      {restaurant.city} • {restaurant.subcategory} • ⭐{" "}
                      {restaurant.rating}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#8F8A7E"
                  />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={{ height: 36 }} />
        </View>
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
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: COLORS.bg,
  },

  heroImageBackground: {
    flex: 1,
  },

  heroImage: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
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
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 18,
  },

  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,241,231,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.40)",
  },

  heroTitle: {
    color: COLORS.text,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    marginBottom: 8,
    maxWidth: "78%",
  },

  heroSubtitle: {
    color: COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
    maxWidth: "85%",
  },

  searchWrapper: {
    marginTop: 2,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(246,241,231,0.96)",
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    fontWeight: "500",
  },

  body: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
  },

  subSectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 8,
  },

  viewAllText: {
    color: "#60624F",
    fontSize: 15,
    fontWeight: "700",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  categoryCard: {
    width: "23%",
    aspectRatio: 0.95,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEE7D8",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  categoryIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  categoryText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  featuredCard: {
    width: width * 0.62,
    height: 280,
    marginRight: 14,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },

  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },

  featuredImageStyle: {
    borderRadius: 28,
  },

  featuredOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 28,
  },

  favoriteButton: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(246,241,231,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  featuredSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    color: "#ECECDD",
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "600",
  },

  aiCard: {
    marginTop: 22,
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  aiTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },

  aiText: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: "92%",
  },

  aiButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 999,
    gap: 8,
  },

  aiButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE7D8",
  },

  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoCardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },

  infoCardText: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  searchSection: {
    paddingTop: 4,
  },

  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE7D8",
  },

  searchCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  searchCardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },

  searchCardMeta: {
    color: COLORS.textSoft,
    fontSize: 14,
  },

  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
  },

  noResultText: {
    color: COLORS.textSoft,
    fontSize: 15,
    fontWeight: "500",
  },
});