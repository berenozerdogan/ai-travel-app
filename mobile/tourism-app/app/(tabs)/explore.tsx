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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";

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
    fetch("http://192.168.1.101:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (typeof params.filter === "string") {
      setSelectedFilter(params.filter);
    }
  }, [params.filter]);

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
    const allCitiesLabel = t("common.allCities");
    const cities = [...new Set(places.map((p) => cleanCity(p.city)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    if (!citySearch.trim()) {
      return [allCitiesLabel, ...cities];
    }

    const filtered = cities.filter((city) =>
      city.toLowerCase().includes(citySearch.trim().toLowerCase())
    );

    return [allCitiesLabel, ...filtered];
  }, [places, citySearch, t]);

  const districtOptions = useMemo(() => {
    const allCitiesLabel = t("common.allCities");
    const allDistrictsLabel = t("common.allDistricts");

    let filtered = places;

    if (selectedCity !== allCitiesLabel) {
      filtered = filtered.filter((p) => cleanCity(p.city) === selectedCity);
    }

    const districts = [
      ...new Set(filtered.map((p) => cleanDistrict(p.district)).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    return [allDistrictsLabel, ...districts];
  }, [places, selectedCity, t]);

  useEffect(() => {
    setSelectedDistrict(t("common.allDistricts"));
  }, [selectedCity, t]);

  useEffect(() => {
    if (
      selectedFilter !== t("explore.all") &&
      selectedFilter !== t("explore.attractions") &&
      selectedFilter !== t("explore.restaurants") &&
      selectedFilter !== t("explore.hotels")
    ) {
      setSelectedFilter(t("explore.all"));
    }
  }, [t, selectedFilter]);

  const filteredPlaces = useMemo(() => {
    const allLabel = t("explore.all");
    const attractionsLabel = t("explore.attractions");
    const restaurantsLabel = t("explore.restaurants");
    const hotelsLabel = t("explore.hotels");
    const allCitiesLabel = t("common.allCities");
    const allDistrictsLabel = t("common.allDistricts");

    let filtered = places;

    if (selectedFilter === attractionsLabel) {
      filtered = filtered.filter((item) => item.category === "attraction");
    } else if (selectedFilter === restaurantsLabel) {
      filtered = filtered.filter((item) => item.category === "restaurant");
    } else if (selectedFilter === hotelsLabel) {
      filtered = filtered.filter((item) => item.category === "hotel");
    } else if (selectedFilter !== allLabel) {
      filtered = places;
    }

    if (selectedCity !== allCitiesLabel) {
      filtered = filtered.filter((item) => cleanCity(item.city) === selectedCity);
    }

    if (selectedDistrict !== allDistrictsLabel) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("explore.title")}</Text>

      <Text style={styles.sectionLabel}>{t("explore.category")}</Text>
      <View style={styles.filterRow}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter}
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
      </View>

      <Text style={styles.sectionLabel}>{t("explore.city")}</Text>
      <TextInput
        style={styles.searchInput}
        placeholder={t("explore.searchCity")}
        placeholderTextColor="#777"
        value={citySearch}
        onChangeText={setCitySearch}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionRow}
      >
        {cityOptions.slice(0, 12).map((city) => (
          <TouchableOpacity
            key={city}
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

      <Text style={styles.selectedText}>
        {t("explore.selectedCity")}: {selectedCity}
      </Text>

      <Text style={styles.sectionLabel}>{t("explore.district")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionRow}
      >
        {districtOptions.slice(0, 12).map((district) => (
          <TouchableOpacity
            key={district}
            style={[
              styles.optionButton,
              selectedDistrict === district && styles.activeOptionButton,
            ]}
            onPress={() => setSelectedDistrict(district)}
          >
            <Text
              style={[
                styles.optionText,
                selectedDistrict === district && styles.activeOptionText,
              ]}
            >
              {district}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.selectedText}>
        {t("explore.selectedDistrict")}: {selectedDistrict}
      </Text>

      <Text style={styles.resultsText}>
        {filteredPlaces.length} {t("common.placesFound")}
      </Text>

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/place?name=${item.name}`)}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>{t("common.noImage")}</Text>
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>⭐ {item.rating}</Text>
              <Text style={styles.meta}>
                {cleanCity(item.city)} • {cleanDistrict(item.district) || "Unknown"} •{" "}
                {item.subcategory}
              </Text>

              {item.category === "hotel" && (
                <View style={styles.hotelBadge}>
                  <Text style={styles.hotelBadgeText}>
                    💎 {(item.price_level || "unknown").toUpperCase()}
                  </Text>
                </View>
              )}

              <Text style={styles.category}>{categoryLabel(item.category)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#0B0B0B",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    marginBottom: 18,
  },

  sectionLabel: {
    color: "#9BE000",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 4,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },

  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  activeFilterButton: {
    backgroundColor: "#9BE000",
    borderColor: "#9BE000",
  },

  filterText: {
    color: "#CCCCCC",
    fontSize: 14,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#111",
  },

  searchInput: {
    height: 46,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "white",
    fontSize: 14,
    marginBottom: 10,
  },

  optionRow: {
    paddingBottom: 8,
    paddingRight: 10,
  },

  optionButton: {
    minWidth: 130,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#171717",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  activeOptionButton: {
    backgroundColor: "#9BE000",
    borderColor: "#9BE000",
  },

  optionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  activeOptionText: {
    color: "#111",
  },

  selectedText: {
    color: "#A8A8A8",
    fontSize: 13,
    marginBottom: 10,
  },

  resultsText: {
    color: "#A8A8A8",
    fontSize: 13,
    marginBottom: 14,
  },

  card: {
    backgroundColor: "#181818",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
  },

  image: {
    width: "100%",
    height: 200,
  },

  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    color: "#888",
    fontSize: 16,
  },

  info: {
    padding: 15,
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 6,
  },

  rating: {
    fontSize: 15,
    color: "#F6C445",
    marginBottom: 5,
  },

  meta: {
    fontSize: 14,
    color: "#B0B0B0",
    marginBottom: 8,
  },

  hotelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1E1B0F",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 8,
  },

  hotelBadgeText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "700",
  },

  category: {
    alignSelf: "flex-start",
    backgroundColor: "#222",
    color: "#9BE000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
});