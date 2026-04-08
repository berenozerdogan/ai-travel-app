import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";

type EventItem = {
  title: string;
  venue: string;
  date: string;
  time: string;
  category: string;
  city: string;
  source: string;
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
        `http://192.168.1.101:8000/events?city=${encodeURIComponent(finalCity)}`
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
    <View style={styles.container}>
      <Text style={styles.title}>Live Events</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="City"
          placeholderTextColor="#777"
        />

        <TouchableOpacity style={styles.button} onPress={() => loadEvents()}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.info}>Loading events...</Text>
      ) : events.length === 0 ? (
        <Text style={styles.info}>No live events found for this city yet.</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item, index) =>
            `${item.title}-${item.date}-${index}`
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.meta}>📍 {item.venue}</Text>
              <Text style={styles.meta}>📅 {item.date}</Text>
              <Text style={styles.meta}>🕒 {item.time}</Text>
              <Text style={styles.meta}>🎭 {item.category}</Text>
              <Text style={styles.source}>Source: {item.source}</Text>
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
    backgroundColor: "#0B0B0B",
    padding: 16,
  },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
  },

  searchRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  input: {
    flex: 1,
    backgroundColor: "#171717",
    color: "white",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
  },

  button: {
    backgroundColor: "#9BE000",
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#111",
    fontWeight: "800",
  },

  info: {
    color: "#AAA",
    marginTop: 20,
    fontSize: 15,
  },

  card: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  eventTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },

  meta: {
    color: "#D6D6D6",
    fontSize: 14,
    marginBottom: 4,
  },

  source: {
    color: "#8E8E8E",
    fontSize: 12,
    marginTop: 8,
  },
});