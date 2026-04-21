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
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

const categories = [
  {
    key: "attractions",
    title: "Attractions",
    icon: <Ionicons name="business-outline" size={24} color="#159A63" />,
    filter: "Attractions",
  },
  {
    key: "hotels",
    title: "Hotels",
    icon: <Ionicons name="bed-outline" size={24} color="#159A63" />,
    filter: "Hotels",
  },
  {
    key: "food",
    title: "Food",
    icon: <Ionicons name="restaurant-outline" size={24} color="#159A63" />,
    filter: "Restaurants",
  },
  {
    key: "nature",
    title: "Nature",
    icon: <Ionicons name="leaf-outline" size={24} color="#159A63" />,
    filter: "Attractions",
  },
  {
    key: "events",
    title: "Events",
    icon: (
      <MaterialCommunityIcons name="drama-masks" size={24} color="#159A63" />
    ),
    filter: "All",
  },
  {
    key: "beaches",
    title: "Beaches",
    icon: <FontAwesome5 name="umbrella-beach" size={20} color="#159A63" />,
    filter: "Attractions",
  },
  {
    key: "shopping",
    title: "Shopping",
    icon: <Ionicons name="cart-outline" size={24} color="#159A63" />,
    filter: "All",
  },
  {
    key: "cities",
    title: "Cities",
    icon: <Ionicons name="location-outline" size={24} color="#159A63" />,
    filter: "All",
  },
];

export default function Home() {
  const { t } = useLanguage();

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
    if (item.key === "events") {
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
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.04)",
            "rgba(255,255,255,0.16)",
            "rgba(247,250,248,0.88)",
            "rgba(247,250,248,1)",
          ]}
          style={styles.heroOverlay}
        >
          

          <Text style={styles.heroTitle}>{t("home.title")}</Text>
          <Text style={styles.heroSubtitle}>{t("home.subtitle")}</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color="#7B8B82" />
            <TextInput
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor="#7B8B82"
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
            />
            <Ionicons name="mic-outline" size={20} color="#7B8B82" />
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.content}>
        {query.trim() ? (
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Search Results</Text>

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
              <Text style={styles.noResultText}>No results found.</Text>
            )}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("home.categories")}</Text>
            </View>

            <View style={styles.categoryGrid}>
              {categories.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(item)}
                >
                  <View style={styles.categoryIconWrap}>{item.icon}</View>
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
                    <LinearGradient
                      colors={[
                        "rgba(0,0,0,0.06)",
                        "rgba(0,0,0,0.15)",
                        "rgba(0,0,0,0.48)",
                      ]}
                      style={styles.featuredOverlay}
                    >
                      <Text style={styles.featuredTitle}>{item.name}</Text>
                      <Text style={styles.featuredSubtitle}>
                        {item.city} • {item.subcategory}
                      </Text>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Top Hotels</Text>
            {featuredHotels.map((hotel, index) => (
              <TouchableOpacity
                key={index}
                style={styles.infoCard}
                onPress={() => router.push(`/place?name=${hotel.name}`)}
              >
                <View style={styles.infoIconBox}>
                  <Ionicons name="bed-outline" size={20} color="#159A63" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardTitle}>{hotel.name}</Text>
                  <Text style={styles.infoCardText}>
                    {hotel.city} • {hotel.subcategory} • ⭐ {hotel.rating}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Top Food Picks</Text>
            {featuredRestaurants.map((restaurant, index) => (
              <TouchableOpacity
                key={index}
                style={styles.infoCard}
                onPress={() => router.push(`/place?name=${restaurant.name}`)}
              >
                <View style={styles.infoIconBox}>
                  <Ionicons
                    name="restaurant-outline"
                    size={20}
                    color="#159A63"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardTitle}>{restaurant.name}</Text>
                  <Text style={styles.infoCardText}>
                    {restaurant.city} • {restaurant.subcategory} • ⭐{" "}
                    {restaurant.rating}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>AI Travel Assistant</Text>

            <TouchableOpacity
              style={styles.aiCard}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <View style={styles.aiIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color="#159A63"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>Plan your trip with AI</Text>
                <Text style={styles.aiText}>
                  Ask for routes, hotels, restaurants and city recommendations.
                </Text>
              </View>

              <Ionicons name="arrow-forward" size={20} color="#98A2B3" />
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
    backgroundColor: "#F7FAF8",
  },

  hero: {
    height: 480,
    justifyContent: "flex-end",
  },

  heroImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "#E3ECE7",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 16,
  },

  badgeText: {
    color: "#159A63",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  heroTitle: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
  },

  heroSubtitle: {
    color: "#5E6B64",
    fontSize: 17,
    marginBottom: 18,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#E4ECE7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    color: "#111827",
    marginLeft: 10,
    marginRight: 10,
    fontSize: 16,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  searchSection: {
    marginBottom: 12,
  },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E6ECE8",
  },

  searchCardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  searchCardMeta: {
    color: "#667085",
    fontSize: 14,
  },

  noResultText: {
    color: "#8A948F",
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
    borderRadius: 22,
    padding: 10,
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8F6EE",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  categoryText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },

  seeAll: {
    color: "#159A63",
    fontSize: 16,
    fontWeight: "700",
  },

  featuredCard: {
    width: 290,
    height: 190,
    marginRight: 14,
    marginBottom: 26,
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
    justifyContent: "flex-end",
    padding: 16,
    borderRadius: 24,
  },

  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  featuredSubtitle: {
    color: "#F3F4F6",
    fontSize: 15,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    flexDirection: "row",
    alignItems: "center",
  },

  infoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#E8F6EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoCardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  infoCardText: {
    color: "#667085",
    fontSize: 14,
  },

  aiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    flexDirection: "row",
    alignItems: "center",
  },

  aiIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#E8F6EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  aiTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },

  aiText: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 22,
  },
});