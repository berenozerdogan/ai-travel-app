import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import MapView, {
  Marker,
  Callout,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";

type Place = {
  id: number;
  name: string;
  city: string;
  category: string;
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const params = useLocalSearchParams();
  const routeParam = typeof params.route === "string" ? params.route : "";

  const mapRef = useRef<MapView | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);

  useEffect(() => {
    fetch("http://192.168.1.101:8000/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (routeParam) {
      try {
        const parsed = JSON.parse(routeParam);
        setRoutePlaces(parsed);
      } catch (error) {
        console.log(error);
        setRoutePlaces([]);
      }
    } else {
      setRoutePlaces([]);
    }
  }, [routeParam]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routePlaces.length > 0) {
      const coordinates = routePlaces.map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 60,
          bottom: 120,
          left: 60,
        },
        animated: true,
      });
    } else if (places.length > 0) {
      const coordinates = places.map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 60,
          bottom: 120,
          left: 60,
        },
        animated: true,
      });
    }
  }, [routePlaces, places]);

  const clearRoute = () => {
    setRoutePlaces([]);
    router.replace("/(tabs)/map");
  };

  const mapData = routePlaces.length > 0 ? routePlaces : places;

  return (
    <View style={styles.container}>
      {routePlaces.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearRoute}>
          <Text style={styles.clearButtonText}>Clear Route</Text>
        </TouchableOpacity>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 39.0,
          longitude: 35.0,
          latitudeDelta: 12,
          longitudeDelta: 12,
        }}
      >
        {routePlaces.length > 1 && (
          <Polyline
            coordinates={routePlaces.map((place) => ({
              latitude: place.latitude,
              longitude: place.longitude,
            }))}
            strokeColor="#9BE000"
            strokeWidth={4}
          />
        )}

        {mapData.map((place, index) => (
          <Marker
            key={`${place.id}-${index}`}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            pinColor={
              place.category === "hotel"
                ? "blue"
                : place.category === "restaurant"
                ? "orange"
                : "red"
            }
          >
            <Callout onPress={() => router.push(`/place?name=${place.name}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{place.name}</Text>
                <Text style={styles.calloutText}>
                  {place.city} • {place.category}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  clearButton: {
    position: "absolute",
    top: 60,
    right: 16,
    zIndex: 10,
    backgroundColor: "#9BE000",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  clearButtonText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 14,
  },

  callout: {
    width: 180,
    padding: 4,
  },

  calloutTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },

  calloutText: {
    fontSize: 13,
    color: "#555",
  },
});