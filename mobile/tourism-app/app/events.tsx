import React, { useEffect, useState } from "react";
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

export default function EventsScreen() {
  const [city, setCity] = useState("Istanbul");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async (selectedCity?: string) => {
    const finalCity = selectedCity || city;
    setLoading(true);

    try {
      const res = await fetch(
        `http://192.168.1.102:8000/events?city=${encodeURIComponent(finalCity)}`
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
        colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.title}>Live Events</Text>
        <Text style={styles.subtitle}>
          Discover concerts, festivals and local events by city.
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Ionicons
              name="location-outline"
              size={18}
              color="#7D806F"
            />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor="#7D806F"
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
            <Text style={styles.info}>
              No live events found for this city yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item, index) =>
              `${item.title}-${item.date}-${index}`
            }
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
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={COLORS.textSoft}
                  />
                  <Text style={styles.meta}>{item.venue}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={COLORS.textSoft}
                  />
                  <Text style={styles.meta}>{item.date}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textSoft}
                  />
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
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: COLORS.accentDark,
    fontWeight: "800",
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  topMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  categoryPillText: {
    color: COLORS.accentDark,
    fontSize: 12,
    fontWeight: "800",
  },

  cityPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  cityPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },

  eventTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 24,
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
});