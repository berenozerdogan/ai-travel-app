import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type EventItem = {
  title: string;
  venue: string;
  date: string;
  time: string;
  category: string;
  city: string;
  source: string;
};

const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31,41,55,0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  white: "#FFFFFF",
  shadow: "#D6CEC2",
};

export default function EventsScreen() {
  const [city, setCity] = useState("Istanbul");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async (selectedCity?: string) => {
    const finalCity = selectedCity || city;
    setLoading(true);

    try {
      const res = await fetch(
        `http://10.0.2.2:8000/events?city=${encodeURIComponent(finalCity)}`
      );
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.log(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents("Istanbul");
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Live Events</Text>
        <Text style={styles.subtitle}>
          Discover concerts, festivals and local events by city.
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={COLORS.textSoft} />

            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={() => loadEvents()}>
            <Text style={styles.buttonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.infoBox}>
            <Text style={styles.info}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.infoBox}>
            <Text style={styles.info}>No live events found for this city yet.</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item, index) => `${item.title}-${item.date}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.topMetaRow}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  </View>

                  <View style={styles.cityPill}>
                    <Text style={styles.cityPillText}>{item.city}</Text>
                  </View>
                </View>

                <Text style={styles.eventTitle}>{item.title}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textSoft} />
                  <Text style={styles.meta}>{item.venue}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textSoft} />
                  <Text style={styles.meta}>{item.date}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSoft} />
                  <Text style={styles.meta}>{item.time}</Text>
                </View>

                <Text style={styles.source}>Source: {item.source}</Text>
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
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  inputWrap: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 10,
    fontSize: 14,
  },

  button: {
    height: 52,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  infoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  info: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  topMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  categoryPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  cityPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cityPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },

  eventTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 24,
    letterSpacing: -0.3,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  meta: {
    color: COLORS.textSoft,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },

  source: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginTop: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
});