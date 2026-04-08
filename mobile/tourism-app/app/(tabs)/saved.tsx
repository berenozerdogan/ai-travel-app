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
      Alert.alert(t("saved.removeErrorTitle"), t("saved.removeErrorText"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("saved.title")}</Text>

      {savedPlaces.length === 0 ? (
        <Text style={styles.emptyText}>{t("saved.empty")}</Text>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push(`/place?name=${item.name}`)}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.city} • {item.category} • ⭐ {item.rating}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => removePlace(item.id)}>
                <Text style={styles.remove}>{t("saved.remove")}</Text>
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
    backgroundColor: "#0B0B0B",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    marginBottom: 20,
  },

  emptyText: {
    color: "#999",
    fontSize: 16,
  },

  card: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  meta: {
    color: "#BDBDBD",
    fontSize: 14,
  },

  remove: {
    color: "#FF6B6B",
    fontWeight: "700",
    marginLeft: 12,
  },
});