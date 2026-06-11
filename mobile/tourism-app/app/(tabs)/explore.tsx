import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../../context/LanguageContext";

// 🌤️ PREMIUM AÇIK TEMA
const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31, 41, 55, 0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  accentSoft: "rgba(232, 93, 117, 0.12)",
  white: "#FFFFFF",
  shadow: "#D6CEC2",
};

export default function Explore() {
  const params = useLocalSearchParams();
  const { t } = useLanguage();

  const initialFilter =
    typeof params.filter === "string" ? params.filter : t("explore.all");

  const [places, setPlaces] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [selectedCity, setSelectedCity] = useState(t("common.allCities"));
  const [selectedDistrict, setSelectedDistrict] = useState(t("common.allDistricts"));
  const [citySearch, setCitySearch] = useState("");
  const [savedIds, setSavedIds] = useState<number[]>([]);

  // 🌀 GİRİŞ ANIMASYONU DEĞERLERİ
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

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
    setSelectedFilter(
      typeof params.filter === "string" ? params.filter : t("explore.all")
    );
    setSelectedCity(t("common.allCities"));
    setSelectedDistrict(t("common.allDistricts"));
  }, [t, params.filter]);

  useEffect(() => {
  loadSavedIds();
  fetch("http://10.0.2.2:8000/places")
    .then((res) => res.json())
    .then((data) => {
      setPlaces(Array.isArray(data) ? data : []);
    })
    .catch((err) => console.log("Hata:", err));
}, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedFilter, selectedCity, selectedDistrict]);

  const cleanCity = (city?: string) => {
    if (!city) return "";
    return String(city).trim();
  };

  const cleanDistrict = (district?: string) => {
    if (!district) return "";
    let value = String(district).trim();
    if (value.includes("/")) value = value.split("/")[0].trim();
    value = value.replace(/^\d{5}\s*/, "").trim();
    if (value.includes(",")) value = value.split(",")[0].trim();
    return value;
  };

  const cityOptions = useMemo(() => {
    const cities = [
      ...new Set(places.map((p) => cleanCity(p.city)).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    if (!citySearch.trim()) return [t("common.allCities"), ...cities];
    const filtered = cities.filter((city) =>
      city.toLowerCase().includes(citySearch.trim().toLowerCase())
    );
    return [t("common.allCities"), ...filtered];
  }, [places, citySearch, t]);

  const districtOptions = useMemo(() => {
    let filtered = places;
    if (selectedCity !== t("common.allCities")) {
      filtered = filtered.filter((p) => cleanCity(p.city) === selectedCity);
    }
    const districts = [
      ...new Set(filtered.map((p) => cleanDistrict(p.district)).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
    return [t("common.allDistricts"), ...districts];
  }, [places, selectedCity, t]);

  useEffect(() => {
    setSelectedDistrict(t("common.allDistricts"));
  }, [selectedCity, t]);

  const filteredPlaces = useMemo(() => {
    let filtered = places;

    if (selectedFilter === t("explore.attractions")) {
      filtered = filtered.filter((item) => item.category === "attraction");
    } else if (selectedFilter === t("explore.restaurants")) {
      filtered = filtered.filter((item) => item.category === "restaurant" || item.category === "cafe");
    } else if (selectedFilter === t("explore.hotels")) {
      filtered = filtered.filter((item) => item.category === "hotel");
    } else if (selectedFilter === t("home.beaches")) {
      filtered = filtered.filter((item) => item.subcategory === "beach" || item.tags?.includes("beach") || item.name?.toLowerCase().includes("beach"));
    } else if (selectedFilter === t("home.nature")) {
      filtered = filtered.filter((item) => item.subcategory === "nature" || item.tags?.includes("nature") || item.tags?.includes("park"));
    } else if (selectedFilter === t("home.shopping")) {
      filtered = filtered.filter((item) => item.category === "shopping" || item.tags?.includes("shopping"));
    } else if (selectedFilter === t("categories.cafe")) {
      filtered = filtered.filter((item) => item.category === "cafe");
    } else if (selectedFilter === t("categories.museum")) {
      filtered = filtered.filter((item) => item.category === "museum" || item.subcategory === "museum");
    }

    if (selectedCity !== t("common.allCities")) {
      filtered = filtered.filter((item) => cleanCity(item.city) === selectedCity);
    }
    if (selectedDistrict !== t("common.allDistricts")) {
      filtered = filtered.filter((item) => cleanDistrict(item.district) === selectedDistrict);
    }

    return [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [places, selectedFilter, selectedCity, selectedDistrict, t]);

  const filterButtons = [
    t("explore.all"),
    t("explore.attractions"),
    t("explore.restaurants"),
    t("explore.hotels"),
    t("home.beaches"),
    t("home.nature"),
    t("home.shopping"),
    t("categories.cafe"),
    t("categories.museum"),
  ];

  const categoryLabel = (category: string) => {
    if (category === "attraction") return t("categories.attraction");
    if (category === "restaurant") return t("categories.restaurant");
    if (category === "hotel") return t("categories.hotel");
    if (category === "cafe") return t("categories.cafe");
    if (category === "museum") return t("categories.museum");
    return category;
  };

  const subcategoryLabel = (subcategory?: string) => {
    if (!subcategory) return "";
    const key = String(subcategory).toLowerCase();
    const map: any = {
      beach: "🏖️ Beach",
      nature: "🌿 Nature",
      shopping: "🛍️ Shopping",
      historical: "🏛️ Historical",
      museum: t("categories.museum"),
      cafe: t("categories.cafe"),
      hotel: t("categories.hotel"),
      restaurant: t("categories.restaurant"),
      attraction: t("categories.attraction"),
    };
    return map[key] || subcategory;
  };

  const getSmartFallbackImage = (category: string, index: number) => {
    const cat = String(category).toLowerCase();
    const fallbacks: any = {
      hotel: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop"
      ],
      restaurant: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop"
      ],
      cafe: [
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop"
      ],
      attraction: [
        "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1200&auto=format&fit=crop"
      ],
      default: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop"
      ]
    };
    return fallbacks[cat] ? fallbacks[cat][index % fallbacks[cat].length] : fallbacks["default"][index % fallbacks["default"].length];
  };


  const getPlaceholderIcon = (category?: string) => {
    const c = String(category || "").toLowerCase();

    if (c.includes("hotel")) return "bed-outline";
    if (c.includes("restaurant") || c.includes("food")) return "restaurant-outline";
    if (c.includes("cafe")) return "cafe-outline";
    if (c.includes("museum") || c.includes("historical")) return "business-outline";
    if (c.includes("nature") || c.includes("park")) return "leaf-outline";

    return "location-outline";
  };

  const getPlaceholderLabel = (category?: string) => {
    const c = String(category || "").toLowerCase();

    if (c.includes("hotel")) return "Otel";
    if (c.includes("restaurant") || c.includes("food")) return "Restoran";
    if (c.includes("cafe")) return "Kafe";
    if (c.includes("museum")) return "Müze";
    if (c.includes("nature") || c.includes("park")) return "Doğa";
    if (c.includes("tourism") || c.includes("attraction")) return "Gezilecek Yer";

    return "Mekan Görseli";
  };

  const isUsablePlaceImage = (uri?: string) => {
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

    // Rastgele fallback/stock görselleri engelliyoruz.
    if (value.includes("images.unsplash.com")) return false;
    if (value.includes("pexels.com")) return false;
    if (value.includes("placeholder")) return false;

    return value.startsWith("http://") || value.startsWith("https://");
  };

  const SmartPlaceImage = ({ item }: { item: any; index: number }) => {
    const [imageFailed, setImageFailed] = useState(false);

    const imageUri = String(item?.image || "").trim();
    const canShowImage = isUsablePlaceImage(imageUri) && !imageFailed;

    if (canShowImage) {
      return (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      );
    }

    return (
      <LinearGradient
        colors={["#FFFFFF", "#F8F5F0", "#EFE9DF"]}
        style={[styles.image, styles.placeholderImage]}
      >
        <View style={styles.placeholderIconWrap}>
          <Ionicons
            name={getPlaceholderIcon(item?.category || item?.subcategory) as any}
            size={34}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.placeholderTitle}>
          {getPlaceholderLabel(item?.category || item?.subcategory)}
        </Text>

        <Text style={styles.placeholderText}>Görsel bulunamadı</Text>
      </LinearGradient>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* 🌅 RESİM YERİNE DÜZ, AKICI VE ASİL BİR GRADYAN ALAN OLUŞTURULDU */}
            <LinearGradient
              colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{t("explore.title")}</Text>
              <Text style={styles.heroSubtitle}>
                {t("explore.subtitle")}
              </Text>

              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={18} color={COLORS.textSoft} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("explore.searchCity")}
                  placeholderTextColor="#9CA3AF"
                  value={citySearch}
                  onChangeText={setCitySearch}
                />
              </View>
            </LinearGradient>

            <View style={styles.content}>
              <View style={styles.filtersCard}>
                <View style={styles.filtersHeader}>
                  <View>
                    <Text style={styles.filtersTitle}>{t("explore.filters")}</Text>
                    <Text style={styles.filtersSubtitle}>{t("explore.filterSubtitle")}</Text>
                  </View>
                  <View style={styles.filtersBadge}>
                    <Text style={styles.filtersBadgeText}>{filteredPlaces.length}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>{t("explore.category")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  {filterButtons.map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      activeOpacity={0.85}
                      style={[styles.filterButton, selectedFilter === filter && styles.activeFilterButton]}
                      onPress={() => setSelectedFilter(filter)}
                    >
                      <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionLabel}>{t("explore.city")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                  {cityOptions.map((city) => (
                    <TouchableOpacity
                      key={city}
                      activeOpacity={0.85}
                      style={[styles.optionButton, selectedCity === city && styles.activeOptionButton]}
                      onPress={() => setSelectedCity(city)}
                    >
                      <Text style={[styles.optionText, selectedCity === city && styles.activeOptionText]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedCity !== t("common.allCities") && (
                  <>
                    <Text style={styles.sectionLabel}>{t("explore.district")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                      {districtOptions.map((district) => (
                        <TouchableOpacity
                          key={district}
                          activeOpacity={0.85}
                          style={[styles.optionButton, selectedDistrict === district && styles.activeOptionButton]}
                          onPress={() => setSelectedDistrict(district)}
                        >
                          <Text style={[styles.optionText, selectedDistrict === district && styles.activeOptionText]}>
                            {district}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </View>

              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {filteredPlaces.length} {t("common.placesFound")}
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.card}
              onPress={() => router.push({ pathname: "/place", params: { id: String(item.id) } })}
            >
              <View style={styles.cardImageWrap}>
                <SmartPlaceImage item={item} index={index} />

                <LinearGradient
                  colors={["transparent", "rgba(19,22,34,0.15)", "rgba(19,22,34,0.85)"]}
                  style={styles.imageOverlay}
                />

                <TouchableOpacity style={styles.favoriteButton} onPress={(e: any) => { e?.stopPropagation?.(); toggleFavorite(item); }}>
                  <Ionicons name={savedIds.includes(Number(item.id)) ? "heart" : "heart-outline"} size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.imageInfo}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.metaLight}>
                    {cleanCity(item.city)} • {cleanDistrict(item.district) || "Turkey"}
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <View style={styles.infoTop}>
                  <View style={styles.ratingPill}>
                    <Text style={styles.rating}>⭐ {item.rating || 0}</Text>
                  </View>

                  {item.category === "hotel" && item.price_level && item.price_level !== "unknown" && (
                    <View style={styles.hotelBadge}>
                      <Text style={styles.hotelBadgeText}>{item.price_level.toUpperCase()}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.meta}>
                  {subcategoryLabel(item.subcategory) || categoryLabel(item.category)}
                </Text>

                <View style={styles.bottomRow}>
                  <Text style={styles.category}>{categoryLabel(item.category)}</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.accent} />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.mapMiniButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/map",
                      params: { route: JSON.stringify([item]) },
                    })
                  }
                >
                  <Ionicons name="map-outline" size={15} color={COLORS.white} />
                  <Text style={styles.mapMiniButtonText}>{t("common.showOnMap")}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },
  hero: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  filtersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  filtersSubtitle: {
    fontSize: 13,
    color: COLORS.textSoft,
  },
  filtersBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  filtersBadgeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionLabel: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  filterRow: {
    paddingBottom: 8,
  },
  filterButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterButton: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  activeFilterText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  searchWrapper: {
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
  },
  optionRow: {
    paddingBottom: 8,
  },
  optionButton: {
    minWidth: 130,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeOptionButton: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  activeOptionText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  resultsRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsText: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardImageWrap: {
    position: "relative",
    width: "100%",
    height: 200,
    backgroundColor: COLORS.surfaceSoft,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(19,22,34,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageInfo: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  metaLight: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "500",
  },
  info: {
    padding: 16,
  },
  infoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  rating: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSoft,
    marginBottom: 10,
  },
  hotelBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  hotelBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
  },
  mapMiniButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  mapMiniButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },

  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  placeholderTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  placeholderText: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },

});
