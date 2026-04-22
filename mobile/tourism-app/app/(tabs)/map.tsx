import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

type Place = {
  id: number;
  name: string;
  city: string;
  category: string;
  latitude: number;
  longitude: number;
  rating?: number;
  subcategory?: string;
  distance_km?: number;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  surfaceSoft: "#EFE7D8",
  border: "#E8E0D1",
  text: "#1E2418",
  textSoft: "#5F6656",
  accent: "#B8CC2A",
  accentDark: "#28310F",
  shadow: "#9E9688",
  hotel: "#5C7FA3",
  restaurant: "#C7863A",
  attraction: "#D85B57",
  selected: "#7A4B00",
  overlay: "rgba(0,0,0,0.18)",
};

const INITIAL_REGION: Region = {
  latitude: 39.0,
  longitude: 35.0,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const SHEET_COLLAPSED = SCREEN_HEIGHT - 170;
const SHEET_EXPANDED = SCREEN_HEIGHT - 360;
const NEARBY_RADIUS = 80;

export default function MapScreen() {
  const params = useLocalSearchParams();
  const routeParam = typeof params.route === "string" ? params.route : "";

  const mapRef = useRef<MapView | null>(null);
  const routeSheetTop = useRef(new Animated.Value(SHEET_COLLAPSED)).current;

  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "attraction" | "restaurant" | "hotel" | "saved"
  >("all");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [nearbyListVisible, setNearbyListVisible] = useState(false);
  const [nearbySort, setNearbySort] = useState<"distance" | "rating">(
    "distance"
  );

  const isRouteMode = routePlaces.length > 1;

  useEffect(() => {
    fetch("http://192.168.1.102:8000/places")
      .then((res) => res.json())
      .then((data) => setAllPlaces(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("saved_places")
      .then((data) => {
        const parsed = data ? JSON.parse(data) : [];
        setSavedPlaces(parsed);
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (routeParam) {
      try {
        const parsed = JSON.parse(routeParam);
        const safeParsed = Array.isArray(parsed) ? parsed : [];
        setRoutePlaces(safeParsed);

        if (safeParsed.length > 0) {
          setSelectedPlace(safeParsed[0]);
        }

        if (safeParsed.length > 1) {
          expandRouteSheet();
        } else {
          collapseRouteSheet();
        }
      } catch (error) {
        console.log(error);
        setRoutePlaces([]);
        collapseRouteSheet();
      }
    } else {
      setRoutePlaces([]);
      collapseRouteSheet();
    }
  }, [routeParam]);

  const basePlaces = useMemo(() => {
    if (isNearbyMode) return nearbyPlaces;
    return allPlaces;
  }, [isNearbyMode, nearbyPlaces, allPlaces]);

  const filteredPlaces = useMemo(() => {
    if (routePlaces.length > 0) return routePlaces;
    if (activeFilter === "saved") return savedPlaces;
    if (activeFilter === "all") return basePlaces;
    return basePlaces.filter((place) => place.category === activeFilter);
  }, [basePlaces, savedPlaces, activeFilter, routePlaces]);

  const nearbyListData = useMemo(() => {
    if (!isNearbyMode) return [];
    const copy = [...filteredPlaces];

    if (nearbySort === "distance") {
      copy.sort(
        (a, b) =>
          (a.distance_km ?? Number.MAX_VALUE) - (b.distance_km ?? Number.MAX_VALUE)
      );
    } else {
      copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return copy;
  }, [filteredPlaces, nearbySort, isNearbyMode]);

  useEffect(() => {
    if (!mapRef.current || filteredPlaces.length === 0) return;

    const coordinates = filteredPlaces.map((place) => ({
      latitude: place.latitude,
      longitude: place.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 140,
        right: 60,
        bottom: isRouteMode ? 320 : 180,
        left: 60,
      },
      animated: true,
    });
  }, [filteredPlaces, isRouteMode]);

  const expandRouteSheet = () => {
    Animated.spring(routeSheetTop, {
      toValue: SHEET_EXPANDED,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  };

  const collapseRouteSheet = () => {
    Animated.spring(routeSheetTop, {
      toValue: SHEET_COLLAPSED,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        const next = SHEET_COLLAPSED + gesture.dy;
        if (next >= SHEET_EXPANDED && next <= SHEET_COLLAPSED) {
          routeSheetTop.setValue(next);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40) expandRouteSheet();
        else if (gesture.dy > 40) collapseRouteSheet();
        else {
          routeSheetTop.stopAnimation((value: number) => {
            const mid = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
            if (value < mid) expandRouteSheet();
            else collapseRouteSheet();
          });
        }
      },
    })
  ).current;

  const centerAll = () => {
    if (!mapRef.current || filteredPlaces.length === 0) return;

    const coordinates = filteredPlaces.map((place) => ({
      latitude: place.latitude,
      longitude: place.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 140,
        right: 60,
        bottom: isRouteMode ? 320 : 180,
        left: 60,
      },
      animated: true,
    });
  };

  const fetchNearbyPlaces = async (
    coords: { latitude: number; longitude: number },
    filter: "all" | "attraction" | "restaurant" | "hotel" | "saved"
  ) => {
    try {
      const categoryParam =
        filter !== "all" && filter !== "saved" ? `&category=${filter}` : "";

      const res = await fetch(
        `http://192.168.1.102:8000/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=${NEARBY_RADIUS}${categoryParam}`
      );
      const data = await res.json();

      setNearbyPlaces(data.places || []);
      setNearbyCount(data.count || 0);
    } catch (err) {
      console.log(err);
      Alert.alert("Nearby error", "Could not load nearby places.");
    }
  };

  const goToNearMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Location permission is required.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(coords);
      setIsNearbyMode(true);
      setSelectedPlace(null);

      const nearbyFilter = activeFilter === "saved" ? "all" : activeFilter;
      if (activeFilter === "saved") {
        setActiveFilter("all");
      }

      await fetchNearbyPlaces(coords, nearbyFilter);

      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.45,
          longitudeDelta: 0.45,
        },
        700
      );
    } catch (err) {
      console.log(err);
      Alert.alert("Location error", "Could not get nearby places.");
    }
  };

  useEffect(() => {
    if (!isNearbyMode || !userLocation) return;
    if (isRouteMode) return;
    if (activeFilter === "saved") return;

    fetchNearbyPlaces(userLocation, activeFilter);
  }, [activeFilter]);

  const clearRoute = () => {
    setRoutePlaces([]);
    setSelectedPlace(null);
    collapseRouteSheet();
    router.replace("/(tabs)/map");
  };

  const exitNearbyMode = () => {
    setIsNearbyMode(false);
    setNearbyPlaces([]);
    setNearbyCount(0);
    setNearbyListVisible(false);
    setSelectedPlace(null);

    if (allPlaces.length > 0) {
      setTimeout(() => {
        if (!mapRef.current) return;
        const coordinates = allPlaces.map((place) => ({
          latitude: place.latitude,
          longitude: place.longitude,
        }));

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: {
            top: 140,
            right: 60,
            bottom: 180,
            left: 60,
          },
          animated: true,
        });
      }, 150);
    }
  };

  const focusPlace = (place: Place) => {
    setSelectedPlace(place);
    setNearbyListVisible(false);
    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      },
      500
    );
  };

  const markerColor = (place: Place) => {
    if (selectedPlace?.id === place.id) return COLORS.selected;
    if (place.category === "hotel") return COLORS.hotel;
    if (place.category === "restaurant") return COLORS.restaurant;
    return COLORS.attraction;
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "attraction", label: "Attractions" },
    { key: "restaurant", label: "Food" },
    { key: "hotel", label: "Hotels" },
    { key: "saved", label: "Saved" },
  ] as const;

  const renderNearbyItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.nearbyItem}
      activeOpacity={0.9}
      onPress={() => focusPlace(item)}
    >
      <View style={styles.nearbyItemLeft}>
        <View style={styles.nearbyItemIcon}>
          <Ionicons name="location-outline" size={18} color={COLORS.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nearbyItemTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.nearbyItemMeta} numberOfLines={1}>
            {item.city} • {item.subcategory || item.category}
          </Text>
          {typeof item.distance_km === "number" && (
            <Text style={styles.nearbyItemDistance}>
              📍 {item.distance_km} km away
            </Text>
          )}
        </View>
      </View>

      <View style={styles.nearbyItemRight}>
        <Text style={styles.nearbyItemRating}>⭐ {item.rating ?? "-"}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSoft} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={() => setSelectedPlace(null)}
      >
        {isRouteMode && (
          <Polyline
            coordinates={routePlaces.map((place) => ({
              latitude: place.latitude,
              longitude: place.longitude,
            }))}
            strokeColor={COLORS.accent}
            strokeWidth={5}
          />
        )}

        {filteredPlaces.map((place, index) => (
          <Marker
            key={`${place.id}-${index}`}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            pinColor={markerColor(place)}
            onPress={() => focusPlace(place)}
          />
        ))}

        {userLocation && (
          <Marker
            coordinate={userLocation}
            pinColor="#4A6CF7"
            title="You are here"
          />
        )}
      </MapView>

      <View style={styles.topOverlay}>
        {isRouteMode ? (
          <View style={styles.tripHeader}>
            <View>
              <Text style={styles.tripTitle}>Trip Map</Text>
              <Text style={styles.tripSubtitle}>
                {routePlaces.length} stops selected
              </Text>
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={clearRoute}>
              <Text style={styles.clearButtonText}>Clear Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filters.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => {
                      setActiveFilter(filter.key);
                      setSelectedPlace(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isNearbyMode && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.nearbyBanner}
                onPress={() => setNearbyListVisible(true)}
              >
                <Text style={styles.nearbyBannerText}>
                  Nearby places • {nearbyCount} found
                </Text>
                <View style={styles.nearbyBannerRight}>
                  <Text style={styles.nearbyBannerHint}>Open list</Text>
                  <TouchableOpacity onPress={exitNearbyMode}>
                    <Text style={styles.nearbyBannerAction}>Exit</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={styles.rightButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={centerAll}>
          <Ionicons name="scan-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={goToNearMe}>
          <Ionicons name="locate-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {selectedPlace && (
        <View
          style={[
            styles.selectedCard,
            { bottom: isRouteMode ? 120 : 140 },
          ]}
        >
          <View style={styles.selectedTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedTitle}>{selectedPlace.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedPlace.city} •{" "}
                {selectedPlace.subcategory || selectedPlace.category}
              </Text>
              {typeof selectedPlace.distance_km === "number" && (
                <Text style={styles.distance}>
                  📍 {selectedPlace.distance_km} km away
                </Text>
              )}
            </View>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>
                ⭐ {selectedPlace.rating ?? "-"}
              </Text>
            </View>
          </View>

          <View style={styles.selectedActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/place?name=${selectedPlace.name}`)}
            >
              <Text style={styles.secondaryButtonText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => focusPlace(selectedPlace)}
            >
              <Text style={styles.primaryButtonText}>Focus</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isRouteMode && (
        <Animated.View
          style={[styles.bottomSheet, { top: routeSheetTop }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Your Route</Text>
              <Text style={styles.sheetSubtitle}>
                {routePlaces.length} places in this plan
              </Text>
            </View>

            <TouchableOpacity style={styles.sheetMapButton} onPress={centerAll}>
              <Ionicons name="map-outline" size={18} color={COLORS.text} />
              <Text style={styles.sheetMapButtonText}>Refit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeChipsRow}
          >
            {routePlaces.map((place, index) => (
              <TouchableOpacity
                key={`${place.id}-${index}`}
                style={styles.routeChip}
                onPress={() => setSelectedPlace(place)}
              >
                <Text style={styles.routeChipIndex}>{index + 1}</Text>
                <Text style={styles.routeChipText} numberOfLines={1}>
                  {place.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sheetList}>
            {routePlaces.map((place, index) => (
              <TouchableOpacity
                key={`row-${place.id}-${index}`}
                style={styles.sheetRow}
                onPress={() => setSelectedPlace(place)}
              >
                <View style={styles.sheetRowLeft}>
                  <View style={styles.sheetRowIndex}>
                    <Text style={styles.sheetRowIndexText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.sheetRowTitle}>{place.name}</Text>
                    <Text style={styles.sheetRowMeta}>
                      {place.city} • {place.category}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textSoft}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      <Modal
        visible={nearbyListVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNearbyListVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setNearbyListVisible(false)}
          />

          <View style={styles.listSheet}>
            <View style={styles.listHandle} />

            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>Nearby Places</Text>
                <Text style={styles.listSubtitle}>
                  {nearbyCount} places near you
                </Text>
              </View>

              <TouchableOpacity
                style={styles.listClose}
                onPress={() => setNearbyListVisible(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[
                  styles.sortChip,
                  nearbySort === "distance" && styles.sortChipActive,
                ]}
                onPress={() => setNearbySort("distance")}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    nearbySort === "distance" && styles.sortChipTextActive,
                  ]}
                >
                  Distance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortChip,
                  nearbySort === "rating" && styles.sortChipActive,
                ]}
                onPress={() => setNearbySort("rating")}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    nearbySort === "rating" && styles.sortChipTextActive,
                  ]}
                >
                  Rating
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={nearbyListData}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderNearbyItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyListBox}>
                  <Text style={styles.emptyListText}>No nearby places found.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  map: {
    flex: 1,
  },

  topOverlay: {
    position: "absolute",
    top: 58,
    left: 14,
    right: 14,
  },

  tripHeader: {
    backgroundColor: "rgba(246,241,231,0.96)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  tripTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },

  tripSubtitle: {
    fontSize: 13,
    color: COLORS.textSoft,
  },

  clearButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    color: COLORS.accentDark,
    fontWeight: "800",
    fontSize: 13,
  },

  filterRow: {
    paddingRight: 8,
  },

  filterChip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(246,241,231,0.96)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  filterChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  filterChipTextActive: {
    color: COLORS.accentDark,
  },

  nearbyBanner: {
    marginTop: 10,
    backgroundColor: "rgba(246,241,231,0.96)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nearbyBannerText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  nearbyBannerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  nearbyBannerHint: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 12,
  },

  nearbyBannerAction: {
    color: COLORS.accentDark,
    fontSize: 13,
    fontWeight: "800",
  },

  rightButtons: {
    position: "absolute",
    right: 14,
    bottom: 230,
  },

  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(246,241,231,0.96)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 10,
  },

  selectedCard: {
    position: "absolute",
    left: 14,
    right: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  selectedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  selectedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },

  selectedMeta: {
    fontSize: 13,
    color: COLORS.textSoft,
    lineHeight: 18,
  },

  distance: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginTop: 4,
  },

  ratingBadge: {
    marginLeft: 10,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  ratingBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  selectedActions: {
    flexDirection: "row",
  },

  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },

  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: COLORS.accentDark,
    fontWeight: "800",
    fontSize: 14,
  },

  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 26,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C7BEAF",
    marginBottom: 12,
  },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },

  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.textSoft,
  },

  sheetMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
  },

  sheetMapButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },

  routeChipsRow: {
    paddingRight: 8,
    marginBottom: 14,
  },

  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    maxWidth: 200,
  },

  routeChipIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    color: COLORS.accentDark,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 8,
    overflow: "hidden",
    includeFontPadding: false,
    paddingTop: 3,
  },

  routeChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 140,
  },

  sheetList: {
    gap: 10,
  },

  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 14,
  },

  sheetRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sheetRowIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sheetRowIndexText: {
    color: COLORS.accentDark,
    fontSize: 12,
    fontWeight: "800",
  },

  sheetRowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },

  sheetRowMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    flex: 1,
  },

  listSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 26,
    minHeight: SCREEN_HEIGHT * 0.55,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },

  listHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C7BEAF",
    marginBottom: 12,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },

  listSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
  },

  listClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sortRow: {
    flexDirection: "row",
    marginBottom: 14,
  },

  sortChip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sortChipActive: {
    backgroundColor: COLORS.accent,
  },

  sortChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  sortChipTextActive: {
    color: COLORS.accentDark,
  },

  nearbyItem: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nearbyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },

  nearbyItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  nearbyItemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },

  nearbyItemMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginBottom: 3,
  },

  nearbyItemDistance: {
    color: COLORS.accentDark,
    fontSize: 12,
    fontWeight: "700",
  },

  nearbyItemRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },

  nearbyItemRating: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyListBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyListText: {
    color: COLORS.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
});