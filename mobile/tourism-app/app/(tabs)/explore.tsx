import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  surfaceSoft: "#EFE7D8",
  border: "#E8E0D1",
  text: "#1E2418",
  textSoft: "#5F6656",
  accent: "#B8CC2A",
  accentDark: "#28310F",
  white: "#FFFFFF",
  shadow: "#9E9688",
};

export default function Explore() {
  const params = useLocalSearchParams();
  const { t } = useLanguage();

  const initialFilter =
    typeof params.filter === "string" ? params.filter : t("explore.all");

  const [places, setPlaces] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [selectedCity, setSelectedCity] = useState(t("common.allCities"));
  const [selectedDistrict, setSelectedDistrict] = useState(
    t("common.allDistricts")
  );
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    setSelectedFilter(
      typeof params.filter === "string" ? params.filter : t("explore.all")
    );
    setSelectedCity(t("common.allCities"));
    setSelectedDistrict(t("common.allDistricts"));
  }, [t, params.filter]);

  useEffect(() => {
    fetch("http://192.168.1.102:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log("Places fetch error:", err));
  }, []);

  const cleanCity = (city?: string) => {
    if (!city) return "";
    return String(city).trim();
  };

  const cleanDistrict = (district?: string) => {
    if (!district) return "";

    let value = String(district).trim();

    if (value.includes("/")) {
      value = value.split("/")[0].trim();
    }

    value = value.replace(/^\d{5}\s*/, "").trim();

    if (value.includes(",")) {
      value = value.split(",")[0].trim();
    }

    return value;
  };

  const cityOptions = useMemo(() => {
    const cities = [
      ...new Set(places.map((p) => cleanCity(p.city)).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    if (!citySearch.trim()) {
      return [t("common.allCities"), ...cities];
    }

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
      filtered = filtered.filter((item) => item.category === "restaurant");
    } else if (selectedFilter === t("explore.hotels")) {
      filtered = filtered.filter((item) => item.category === "hotel");
    }

    if (selectedCity !== t("common.allCities")) {
      filtered = filtered.filter((item) => cleanCity(item.city) === selectedCity);
    }

    if (selectedDistrict !== t("common.allDistricts")) {
      filtered = filtered.filter(
        (item) => cleanDistrict(item.district) === selectedDistrict
      );
    }

    return [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [places, selectedFilter, selectedCity, selectedDistrict, t]);

  const filterButtons = [
    t("explore.all"),
    t("explore.attractions"),
    t("explore.restaurants"),
    t("explore.hotels"),
  ];

  const categoryLabel = (category: string) => {
    if (category === "attraction") return t("categories.attraction");
    if (category === "restaurant") return t("categories.restaurant");
    if (category === "hotel") return t("categories.hotel");
    if (category === "cafe") return t("categories.cafe");
    if (category === "museum") return t("categories.museum");
    return category;
  };

  const getFallbackImage = (index: number) => {
    const images = [
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1570213489059-0aac6626cade?q=80&w=1200&auto=format&fit=crop",
    ];

    return images[index % images.length];
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
            <LinearGradient
              colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={COLORS.text}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{t("explore.title")}</Text>
              <Text style={styles.heroSubtitle}>
                Find places by category, city and district.
              </Text>

              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color="#7D806F"
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("explore.searchCity")}
                  placeholderTextColor="#7D806F"
                  value={citySearch}
                  onChangeText={setCitySearch}
                />
              </View>
            </LinearGradient>

            <View style={styles.content}>
              <View style={styles.filtersCard}>
                <View style={styles.filtersHeader}>
                  <View>
                    <Text style={styles.filtersTitle}>Filters</Text>
                    <Text style={styles.filtersSubtitle}>
                      Discover places by type and location
                    </Text>
                  </View>

                  <View style={styles.filtersBadge}>
                    <Text style={styles.filtersBadgeText}>
                      {filteredPlaces.length}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>{t("explore.category")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {filterButtons.map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      activeOpacity={0.9}
                      style={[
                        styles.filterButton,
                        selectedFilter === filter && styles.activeFilterButton,
                      ]}
                      onPress={() => setSelectedFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          selectedFilter === filter && styles.activeFilterText,
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionLabel}>{t("explore.city")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.optionRow}
                >
                  {cityOptions.slice(0, 12).map((city) => (
                    <TouchableOpacity
                      key={city}
                      activeOpacity={0.9}
                      style={[
                        styles.optionButton,
                        selectedCity === city && styles.activeOptionButton,
                      ]}
                      onPress={() => setSelectedCity(city)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedCity === city && styles.activeOptionText,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedCity !== t("common.allCities") && (
                  <>
                    <Text style={styles.sectionLabel}>
                      {t("explore.district")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {districtOptions.slice(0, 12).map((district) => (
                        <TouchableOpacity
                          key={district}
                          activeOpacity={0.9}
                          style={[
                            styles.optionButton,
                            selectedDistrict === district &&
                              styles.activeOptionButton,
                          ]}
                          onPress={() => setSelectedDistrict(district)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              selectedDistrict === district &&
                                styles.activeOptionText,
                            ]}
                          >
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
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.card}
            onPress={() => router.push(`/place?name=${item.name}`)}
          >
            <View style={styles.cardImageWrap}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <Image
                  source={{ uri: getFallbackImage(index) }}
                  style={styles.image}
                />
              )}

              <LinearGradient
                colors={[
                  "rgba(24,25,18,0.04)",
                  "rgba(24,25,18,0.18)",
                  "rgba(24,25,18,0.68)",
                ]}
                style={styles.imageOverlay}
              />

              <TouchableOpacity style={styles.favoriteButton}>
                <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.imageInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.metaLight}>
                  {cleanCity(item.city)} •{" "}
                  {cleanDistrict(item.district) || "Unknown"}
                </Text>
              </View>
            </View>

            <View style={styles.info}>
              <View style={styles.infoTop}>
                <View style={styles.ratingPill}>
                  <Text style={styles.rating}>⭐ {item.rating || 0}</Text>
                </View>

                {item.category === "hotel" && (
                  <View style={styles.hotelBadge}>
                    <Text style={styles.hotelBadgeText}>
                      {(item.price_level || "unknown").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.meta}>
                {item.subcategory || categoryLabel(item.category)}
              </Text>

              <View style={styles.bottomRow}>
                <Text style={styles.category}>
                  {categoryLabel(item.category)}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.accentDark}
                />
              </View>
            </View>
          </TouchableOpacity>
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
    paddingBottom: 110,
    backgroundColor: COLORS.bg,
  },

  hero: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  heroSubtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  filtersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  filtersTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },

  filtersSubtitle: {
    fontSize: 13,
    color: COLORS.textSoft,
  },

  filtersBadge: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  filtersBadgeText: {
    color: COLORS.accentDark,
    fontSize: 13,
    fontWeight: "800",
  },

  sectionLabel: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  filterRow: {
    paddingBottom: 10,
    paddingRight: 10,
  },

  filterButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  activeFilterButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  filterText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  activeFilterText: {
    color: COLORS.accentDark,
  },

  searchWrapper: {
    height: 52,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
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
    marginLeft: 10,
  },

  optionRow: {
    paddingBottom: 10,
    paddingRight: 10,
  },

  optionButton: {
    minWidth: 150,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  activeOptionButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  optionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  activeOptionText: {
    color: COLORS.accentDark,
  },

  resultsRow: {
    marginTop: 0,
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  resultsText: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },

  card: {
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  cardImageWrap: {
    position: "relative",
    width: "100%",
    height: 220,
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
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  imageInfo: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },

  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  metaLight: {
    fontSize: 14,
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
    marginBottom: 10,
  },

  ratingPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  rating: {
    fontSize: 13,
    color: COLORS.accentDark,
    fontWeight: "800",
  },

  meta: {
    fontSize: 14,
    color: COLORS.textSoft,
    marginBottom: 12,
  },

  hotelBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  hotelBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },
});