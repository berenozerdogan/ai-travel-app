import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

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
    <View style={styles.container}>
      <Text style={styles.title}>{t("saved.title")}</Text>

      {savedPlaces.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={42} color="#159A63" />
          <Text style={styles.emptyText}>{t("saved.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{ flex: 1 }}
                onPress={() => router.push(`/place?name=${item.name}`)}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.city} • {item.category} • ⭐ {item.rating}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => removePlace(item.id)}
                style={styles.removeButton}
              >
                <Ionicons name="heart" size={18} color="#159A63" />
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F7FAF8",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
    marginBottom: 20,
  },

  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },

  emptyText: {
    color: "#667085",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  name: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  meta: {
    color: "#667085",
    fontSize: 14,
  },

  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F6EE",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    marginLeft: 12,
  },

  remove: {
    color: "#159A63",
    fontWeight: "800",
    marginLeft: 6,
  },
});