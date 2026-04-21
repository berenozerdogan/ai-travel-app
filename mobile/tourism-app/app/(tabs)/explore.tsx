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
import { Ionicons } from "@expo/vector-icons";
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
    setSelectedFilter(
      typeof params.filter === "string" ? params.filter : t("explore.all")
    );
    setSelectedCity(t("common.allCities"));
    setSelectedDistrict(t("common.allDistricts"));
  }, [t, params.filter]);

  useEffect(() => {
    fetch("http://192.168.1.101:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log(err));
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
    const cities = [...new Set(places.map((p) => cleanCity(p.city)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("explore.title")}</Text>

      <Text style={styles.sectionLabel}>{t("explore.category")}</Text>
      <View style={styles.filterRow}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter}
            activeOpacity={0.8}
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
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#7B8B82" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("explore.searchCity")}
          placeholderTextColor="#7B8B82"
          value={citySearch}
          onChangeText={setCitySearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionRow}
      >
        {cityOptions.slice(0, 12).map((city) => (
          <TouchableOpacity
            key={city}
            activeOpacity={0.8}
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
            activeOpacity={0.8}
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
            activeOpacity={0.88}
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
                {cleanCity(item.city)} •{" "}
                {cleanDistrict(item.district) || "Unknown"} • {item.subcategory}
              </Text>

              {item.category === "hotel" && (
                <View style={styles.hotelBadge}>
                  <Text style={styles.hotelBadgeText}>
                    {(item.price_level || "unknown").toUpperCase()}
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
    backgroundColor: "#F7FAF8",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
    marginBottom: 18,
  },

  sectionLabel: {
    color: "#159A63",
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
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6ECE8",
  },

  activeFilterButton: {
    backgroundColor: "#159A63",
    borderColor: "#159A63",
  },

  filterText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  searchWrapper: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    marginLeft: 10,
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
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E6ECE8",
  },

  activeOptionButton: {
    backgroundColor: "#E8F6EE",
    borderColor: "#159A63",
  },

  optionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  activeOptionText: {
    color: "#159A63",
  },

  selectedText: {
    color: "#667085",
    fontSize: 13,
    marginBottom: 10,
  },

  resultsText: {
    color: "#667085",
    fontSize: 13,
    marginBottom: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 200,
  },

  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#EEF3F0",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    color: "#7B8B82",
    fontSize: 16,
  },

  info: {
    padding: 15,
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  rating: {
    fontSize: 15,
    color: "#159A63",
    marginBottom: 5,
    fontWeight: "700",
  },

  meta: {
    fontSize: 14,
    color: "#667085",
    marginBottom: 8,
  },

  hotelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F6EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 8,
  },

  hotelBadgeText: {
    color: "#159A63",
    fontSize: 12,
    fontWeight: "800",
  },

  category: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F7F4",
    color: "#159A63",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },
});