import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function Saved() {
  const { t } = useLanguage();
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);

  const loadSavedPlaces = async () => {
    try {
      const data = await AsyncStorage.getItem("saved_places");
      const parsed = data ? JSON.parse(data) : [];
      setSavedPlaces(parsed);
    } catch (error) {
      console.log(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedPlaces();
    }, [])
  );

  const removePlace = async (id: number) => {
    try {
      const updated = savedPlaces.filter((item) => item.id !== id);
      setSavedPlaces(updated);
      await AsyncStorage.setItem("saved_places", JSON.stringify(updated));
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not remove saved place.");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.topRow}>
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

        <Text style={styles.title}>{t("saved.title")}</Text>
        <Text style={styles.subtitle}>
          Keep your favorite destinations in one elegant place.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {savedPlaces.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="heart-outline"
                size={34}
                color={COLORS.accentDark}
              />
            </View>
            <Text style={styles.emptyTitle}>No saved places yet</Text>
            <Text style={styles.emptyText}>{t("saved.empty")}</Text>
          </View>
        ) : (
          <FlatList
            data={savedPlaces}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/place?name=${item.name}`)}
                >
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.city} • {item.category} • ⭐ {item.rating}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => removePlace(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons
                    name="heart"
                    size={18}
                    color={COLORS.accentDark}
                  />
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  hero: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  topRow: {
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

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  emptyBox: {
    marginTop: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 36,
    paddingHorizontal: 20,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },

  emptyText: {
    color: COLORS.textSoft,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  name: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  meta: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginLeft: 12,
  },

  remove: {
    color: COLORS.accentDark,
    fontWeight: "800",
    marginLeft: 6,
    fontSize: 13,
  },
});