import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  const categories = [
    {
      title: t("home.attractions"),
      icon: <Ionicons name="business" size={28} color="white" />,
      color: "#2A2E6E",
      filter: "Attractions",
    },
    {
      title: t("home.hotels"),
      icon: <Ionicons name="bed" size={28} color="white" />,
      color: "#2166B5",
      filter: "Hotels",
    },
    {
      title: t("home.food"),
      icon: <Ionicons name="restaurant" size={28} color="white" />,
      color: "#C77719",
      filter: "Restaurants",
    },
    {
      title: t("home.nature"),
      icon: <Ionicons name="leaf" size={28} color="white" />,
      color: "#718B19",
      filter: "Attractions",
    },
    {
      title: t("home.events"),
      icon: (
        <MaterialCommunityIcons name="drama-masks" size={28} color="white" />
      ),
      color: "#8A1D56",
      filter: "All",
    },
    {
      title: t("home.beaches"),
      icon: <FontAwesome5 name="umbrella-beach" size={24} color="white" />,
      color: "#C79A1D",
      filter: "Attractions",
    },
    {
      title: t("home.shopping"),
      icon: <Ionicons name="cart" size={28} color="white" />,
      color: "#3E94A5",
      filter: "All",
    },
    {
      title: t("home.cities"),
      icon: <Ionicons name="location" size={28} color="white" />,
      color: "#6B57B8",
      filter: "All",
    },
  ];

  const [places, setPlaces] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://192.168.1.101:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetch(`http://192.168.1.101:8000/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data))
        .catch((err) => console.log(err));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const featuredAttractions = useMemo(
    () => places.filter((p) => p.category === "attraction").slice(0, 3),
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
    if (item.title === t("home.events")) {
      router.push("/events");
      return;
    }

    router.push(`/(tabs)/explore?filter=${item.filter}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ImageBackground
        source={{ uri: "https://picsum.photos/1200/900?random=10" }}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>{t("home.title")} 🇹🇷</Text>
          <Text style={styles.heroSubtitle}>{t("home.subtitle")}</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color="#999" />
            <TextInput
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
            />
            <Ionicons name="mic" size={20} color="#999" />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.content}>
        {query.trim() ? (
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>{t("home.searchResults")}</Text>

            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchCard}
                  onPress={() => router.push(`/place?name=${item.name}`)}
                >
                  <Text style={styles.searchCardTitle}>{item.name}</Text>
                  <Text style={styles.searchCardMeta}>
                    {item.city} • {item.category} • ⭐ {item.rating}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResultText}>{t("home.noResults")}</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t("home.categories")}</Text>

            <View style={styles.categoryGrid}>
              {categories.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.categoryCard, { backgroundColor: item.color }]}
                  onPress={() => handleCategoryPress(item)}
                >
                  <View style={styles.categoryIcon}>{item.icon}</View>
                  <Text style={styles.categoryText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("home.featured")}</Text>
              <Text style={styles.seeAll}>{t("home.seeAll")}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {featuredAttractions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/place?name=${item.name}`)}
                >
                  <ImageBackground
                    source={{
                      uri:
                        item.image ||
                        `https://picsum.photos/900/600?random=${20 + index}`,
                    }}
                    style={styles.featuredImage}
                    imageStyle={styles.featuredImageStyle}
                  >
                    <View style={styles.featuredOverlay}>
                      <Text style={styles.featuredTitle}>{item.name}</Text>
                      <Text style={styles.featuredSubtitle}>
                        {item.city} • {item.subcategory}
                      </Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>{t("home.topHotels")}</Text>
            {featuredHotels.map((hotel, index) => (
              <TouchableOpacity
                key={index}
                style={styles.infoCard}
                onPress={() => router.push(`/place?name=${hotel.name}`)}
              >
                <Text style={styles.infoCardTitle}>{hotel.name}</Text>
                <Text style={styles.infoCardText}>
                  {hotel.city} • {hotel.subcategory} • ⭐ {hotel.rating}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>{t("home.topFood")}</Text>
            {featuredRestaurants.map((restaurant, index) => (
              <TouchableOpacity
                key={index}
                style={styles.infoCard}
                onPress={() => router.push(`/place?name=${restaurant.name}`)}
              >
                <Text style={styles.infoCardTitle}>{restaurant.name}</Text>
                <Text style={styles.infoCardText}>
                  {restaurant.city} • {restaurant.subcategory} • ⭐{" "}
                  {restaurant.rating}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>{t("home.aiAssistant")}</Text>

            <TouchableOpacity
              style={styles.aiCard}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <Text style={styles.aiTitle}>{t("home.aiPlanTitle")}</Text>
              <Text style={styles.aiText}>{t("home.aiPlanText")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tripPlannerButton}
              onPress={() => router.push("/trip-planner")}
            >
              <Text style={styles.tripPlannerButtonText}>
                {t("home.aiTripPlanner")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 30 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070707",
  },

  hero: {
    height: 470,
    justifyContent: "flex-end",
  },

  heroImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingBottom: 28,
    backgroundColor: "rgba(0,0,0,0.30)",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
  },

  heroSubtitle: {
    color: "#E6E6E6",
    fontSize: 17,
    marginBottom: 18,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,20,0.75)",
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 56,
  },

  searchInput: {
    flex: 1,
    color: "white",
    marginLeft: 10,
    marginRight: 10,
    fontSize: 16,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  sectionTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  searchSection: {
    marginBottom: 12,
  },

  searchCard: {
    backgroundColor: "#151515",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  searchCardTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  searchCardMeta: {
    color: "#BDBDBD",
    fontSize: 14,
  },

  noResultText: {
    color: "#999",
    fontSize: 15,
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  categoryCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 18,
    padding: 10,
    justifyContent: "space-between",
    marginBottom: 12,
  },

  categoryIcon: {
    marginTop: 4,
  },

  categoryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  seeAll: {
    color: "#9BE000",
    fontSize: 16,
    fontWeight: "700",
  },

  featuredCard: {
    width: 280,
    height: 180,
    marginRight: 14,
    marginBottom: 26,
  },

  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },

  featuredImageStyle: {
    borderRadius: 22,
  },

  featuredOverlay: {
    backgroundColor: "rgba(0,0,0,0.30)",
    padding: 16,
    borderRadius: 22,
  },

  featuredTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  featuredSubtitle: {
    color: "#E9E9E9",
    fontSize: 15,
  },

  infoCard: {
    backgroundColor: "#151515",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  infoCardTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  infoCardText: {
    color: "#BDBDBD",
    fontSize: 14,
  },

  aiCard: {
    backgroundColor: "#121212",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },

  aiTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },

  aiText: {
    color: "#CFCFCF",
    fontSize: 15,
    lineHeight: 22,
  },

  tripPlannerButton: {
    backgroundColor: "#9BE000",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 20,
    alignSelf: "flex-start",
  },

  tripPlannerButtonText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111",
  },
});