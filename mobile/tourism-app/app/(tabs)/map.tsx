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
  Linking,
  Share,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
  Callout,
} from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Speech from "expo-speech"; // 🎙️ AI Sesli Rehber (Text-to-Speech)
import { useLanguage } from "../../context/LanguageContext";

type Place = {
  id: number;
  name: string;
  city: string;
  category: string;
  latitude: number;
  longitude: number;
  rating?: number;
  subcategory?: string;
  distance_km?: number | string;
  description?: string;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  bg: "#131622",
  surface: "#1C1F30",
  surfaceSoft: "#272B42",
  border: "rgba(255, 255, 255, 0.03)",
  text: "#F1F3F9",
  textSoft: "#8E95B2",
  accent: "#D65A5A",
  white: "#FFFFFF",
  shadow: "#090A10",
  hotel: "#4A7BB0",
  restaurant: "#C48646",
  attraction: "#B55353",
  selected: "#FFFFFF",
  overlay: "rgba(9,10,16,0.65)",
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
  const { t, language } = useLanguage();
  const params = useLocalSearchParams();
  const routeParam = typeof params.route === "string" ? params.route : "";

  const mapRef = useRef<MapView | null>(null);
  const routeSheetTop = useRef(new Animated.Value(SHEET_COLLAPSED)).current;

  // --- TEMEL STATE YAPILARI ---
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
    "distance",
  );
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [weatherAdvice, setWeatherAdvice] = useState<any>(null);
  const [usefulInfoVisible, setUsefulInfoVisible] = useState(false);
  const [usefulInfoItems, setUsefulInfoItems] = useState<any[]>([]);

  // --- 🎙️ AI SESLİ REHBER YAPILANDIRMASI (TTS) ---
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- 🎥 SİNEMATİK HARİTA TURU YAPILANDIRMASI ---
  const [isTourActive, setIsTourActive] = useState(false);
  const tourCancelRef = useRef(false);

  // --- 📝 KİŞİSEL NOT SİSTEMİ YAPILANDIRMASI ---
  const [allNotes, setAllNotes] = useState<Record<number, string>>({});
  const [noteText, setNoteText] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const isRouteMode = routePlaces.length > 1;

  // API'den yerleri çekme
  useEffect(() => {
    fetch("http://10.0.2.2:8000/places")
      .then((res) => res.json())
      .then((data) => setAllPlaces(data))
      .catch((err) => console.log(err));
  }, []);

  // Favorileri AsyncStorage'dan çekme
  useEffect(() => {
    AsyncStorage.getItem("saved_places")
      .then((data) => {
        const parsed = data ? JSON.parse(data) : [];
        setSavedPlaces(parsed);
      })
      .catch((err) => console.log(err));
  }, []);

  // Kişisel seyahat notlarını yükleme
  useEffect(() => {
    AsyncStorage.getItem("user_place_notes")
      .then((data) => {
        if (data) setAllNotes(JSON.parse(data));
      })
      .catch((err) => console.log(err));
  }, []);

  // Seçilen yer değiştiğinde not formunu güncelle
  useEffect(() => {
    if (selectedPlace) {
      setNoteText(allNotes[selectedPlace.id] || "");
      setIsEditingNote(false);
    }
  }, [selectedPlace, allNotes]);

  // Sayfadan çıkıldığında sesli okumayı kapat
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Rota parametrelerini dinleme
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
          Number(a.distance_km ?? Number.MAX_VALUE) -
          Number(b.distance_km ?? Number.MAX_VALUE),
      );
    } else {
      copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return copy;
  }, [filteredPlaces, nearbySort, isNearbyMode]);

  // Sanal turda gezilecek mekanların dinamik tespiti
  const tourPlaces = useMemo(() => {
    if (isRouteMode) return routePlaces;
    if (isNearbyMode && nearbyPlaces.length > 0) {
      const sortedNearby = [...nearbyPlaces].sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      );
      return sortedNearby.slice(0, 5);
    }
    return [];
  }, [isRouteMode, routePlaces, isNearbyMode, nearbyPlaces]);

  useEffect(() => {
    if (!mapRef.current || filteredPlaces.length === 0 || isTourActive) return;

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
  }, [filteredPlaces, isRouteMode, isTourActive]);

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
    }),
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
  const getSpeechLanguageCode = () => {
    if (language === "tr") return "tr-TR";
    if (language === "en") return "en-US";
    if (language === "de") return "de-DE";
    if (language === "ru") return "ru-RU";
    return "tr-TR";
  };

  const buildFallbackGuideText = (place: Place) => {
    const categoryText = place.subcategory || place.category || "gezi noktası";
    const ratingText = place.rating
      ? ` Ziyaretçiler tarafından ${place.rating} puanla değerlendirilmiş.`
      : "";
    const descriptionText = place.description ? ` ${place.description}` : "";

    if (language === "en") {
      return `${place.name} is a ${categoryText} located in ${place.city}.${ratingText ? ` It has a rating of ${place.rating}.` : ""}${descriptionText} Take your time here, look around carefully, and enjoy the atmosphere of the area.`;
    }

    if (language === "de") {
      return `${place.name} ist ein interessanter Ort in ${place.city}. Dieser Ort gehört zur Kategorie ${categoryText}.${place.rating ? ` Die Bewertung beträgt ${place.rating}.` : ""}${descriptionText} Nimm dir etwas Zeit und genieße die Atmosphäre.`;
    }

    if (language === "ru") {
      return `${place.name} — интересное место в городе ${place.city}. Категория: ${categoryText}.${place.rating ? ` Рейтинг: ${place.rating}.` : ""}${descriptionText} Не спешите и обратите внимание на атмосферу вокруг.`;
    }

    return `${place.name}, ${place.city} şehrinde bulunan önemli bir ${categoryText} noktasıdır.${ratingText}${descriptionText} Burayı gezerken çevresini de keşfetmeni ve fotoğraf çekmek için birkaç dakika ayırmanı öneririm.`;
  };

  const toggleSpeech = async (place: Place) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    try {
      const res = await fetch(
        `http://10.0.2.2:8000/voice-guide?id=${place.id}&language=${encodeURIComponent(language)}`,
      );

      const data = await res.json();
      const guideText = data?.guide || buildFallbackGuideText(place);

      Speech.speak(guideText, {
        language: getSpeechLanguageCode(),
        pitch: 1.0,
        rate: 0.88,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: (err) => {
          console.log("TTS Hatası:", err);
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.log("Voice guide fetch error:", error);

      Speech.speak(buildFallbackGuideText(place), {
        language: getSpeechLanguageCode(),
        pitch: 1.0,
        rate: 0.88,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // --- 🎥 SİNEMATİK HARİTA KEŞİF TURU MOTORU ---
  const startFlyTour = async () => {
    if (tourPlaces.length < 2) {
      Alert.alert(
        "Sanal Tur",
        "Lütfen sanal tur için haritada en az 2 seyahat durağının bulunmasını sağlayın.",
      );
      return;
    }

    setIsTourActive(true);
    tourCancelRef.current = false;

    for (let i = 0; i < tourPlaces.length; i++) {
      if (tourCancelRef.current) break;

      const place = tourPlaces[i];
      setSelectedPlace(place);

      mapRef.current?.animateCamera(
        {
          center: {
            latitude: place.latitude,
            longitude: place.longitude,
          },
          pitch: 55,
          heading: i * 60,
          zoom: 16.5,
          altitude: 400,
        },
        { duration: 3200 },
      );

      await new Promise((resolve) => setTimeout(resolve, 5500));
    }

    setIsTourActive(false);
    centerAll();
  };

  const stopFlyTour = () => {
    tourCancelRef.current = true;
    setIsTourActive(false);
    Speech.stop();
    setIsSpeaking(false);
    centerAll();
  };

  // --- 📝 KİŞİSEL SEYAHAT NOTLARINI KAYDETME ---
  const handleSaveNote = async () => {
    if (!selectedPlace) return;

    const updatedNotes = { ...allNotes, [selectedPlace.id]: noteText };
    setAllNotes(updatedNotes);
    await AsyncStorage.setItem(
      "user_place_notes",
      JSON.stringify(updatedNotes),
    );
    setIsEditingNote(false);
    Alert.alert(
      "Başarılı",
      "Seyahat notunuz başarıyla günlüğünüze kaydedildi!",
    );
  };

  const fetchNearbyPlaces = async (
    coords: { latitude: number; longitude: number },
    filter: "all" | "attraction" | "restaurant" | "hotel" | "saved",
  ) => {
    if (loadingNearby) return;

    setLoadingNearby(true);
    try {
      const categoryParam =
        filter !== "all" && filter !== "saved" ? `&category=${filter}` : "";

      console.log(`🚀 API Çağrısı Yapılıyor: /nearby, Filtre: ${filter}`);
      const res = await fetch(
        `http://10.0.2.2:8000/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=${NEARBY_RADIUS}${categoryParam}`,
      );
      const data = await res.json();

      setNearbyPlaces(data.places || []);
      setNearbyCount(data.count || 0);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingNearby(false);
    }
  };

  const goToNearMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "İzin Gerekli",
          "Yakınındakileri bulmak için konum izni vermelisiniz.",
        );
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
      await loadWeatherAdvice(coords);

      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.45,
          longitudeDelta: 0.45,
        },
        700,
      );
    } catch (err) {
      console.log(err);
      const fallbackCoords = { latitude: 41.0082, longitude: 28.9784 };
      setUserLocation(fallbackCoords);
      setIsNearbyMode(true);
      setSelectedPlace(null);
      await fetchNearbyPlaces(fallbackCoords, "all");
      await loadWeatherAdvice(fallbackCoords);
      mapRef.current?.animateToRegion(
        { ...fallbackCoords, latitudeDelta: 0.45, longitudeDelta: 0.45 },
        700,
      );
    }
  };

  useEffect(() => {
    if (!isNearbyMode || !userLocation) return;
    if (isRouteMode) return;
    if (activeFilter === "saved") return;

    fetchNearbyPlaces(userLocation, activeFilter);
  }, [activeFilter, isNearbyMode, !!userLocation]);

  const buildRouteText = () => {
    return routePlaces
      .map((place, index) => `${index + 1}. ${place.name} - ${place.city || ""}`)
      .join("\n");
  };

  const shareRoute = async () => {
    if (!routePlaces.length) return;

    try {
      await Share.share({
        message: `AI Travel App Rotam\n\n${buildRouteText()}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const saveOfflineRoute = async () => {
    if (!routePlaces.length) return;

    try {
      const raw = await AsyncStorage.getItem("saved_routes");
      const routes = raw ? JSON.parse(raw) : [];
      const routeItem = {
        id: Date.now().toString(),
        title: `Rota - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        places: routePlaces,
      };
      const updated = [routeItem, ...(Array.isArray(routes) ? routes : [])];
      await AsyncStorage.setItem("saved_routes", JSON.stringify(updated));
      Alert.alert("Rota kaydedildi", "Bu rotayı Saved > Rotalar bölümünde internet olmadan görebilirsin.");
    } catch (error) {
      console.log(error);
      Alert.alert("Hata", "Rota kaydedilemedi.");
    }
  };

  const loadWeatherAdvice = async (coords: { latitude: number; longitude: number }) => {
    try {
      const res = await fetch(
        `http://10.0.2.2:8000/weather-advice?lat=${coords.latitude}&lng=${coords.longitude}&language=${encodeURIComponent(language)}`
      );
      const data = await res.json();
      setWeatherAdvice(data);
    } catch (error) {
      console.log("Weather advice error:", error);
    }
  };

  const openUsefulInfo = async () => {
    const coords = userLocation || (selectedPlace ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude } : null);
    if (!coords) {
      Alert.alert("Konum gerekli", "Önce konumunu bul veya haritada bir mekan seç.");
      return;
    }
    try {
      const res = await fetch(
        `http://10.0.2.2:8000/useful-info?lat=${coords.latitude}&lng=${coords.longitude}&language=${encodeURIComponent(language)}`
      );
      const data = await res.json();
      setUsefulInfoItems(data.items || []);
      setUsefulInfoVisible(true);
    } catch (error) {
      console.log(error);
      setUsefulInfoItems([
        { type: "hospital", label: "Yakındaki hastaneler", url: `https://www.google.com/maps/search/hospital/@${coords.latitude},${coords.longitude},15z` },
        { type: "pharmacy", label: "Yakındaki eczaneler", url: `https://www.google.com/maps/search/pharmacy/@${coords.latitude},${coords.longitude},15z` },
        { type: "police", label: "Yakındaki polis merkezleri", url: `https://www.google.com/maps/search/police/@${coords.latitude},${coords.longitude},15z` },
        { type: "transport", label: "Yakındaki toplu taşıma", url: `https://www.google.com/maps/search/public transport/@${coords.latitude},${coords.longitude},15z` },
      ]);
      setUsefulInfoVisible(true);
    }
  };

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
      500,
    );
  };

  const openInMaps = (place: Place) => {
    const lat = place.latitude;
    const lng = place.longitude;

    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${place.name})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const markerColor = (place: Place) => {
    if (selectedPlace?.id === place.id) return COLORS.selected;
    if (place.category === "hotel") return COLORS.hotel;
    if (place.category === "restaurant") return COLORS.restaurant;
    return COLORS.attraction;
  };

  const filters = [
    { key: "all", label: "Tümü" },
    { key: "attraction", label: "Gezilecek Yer" },
    { key: "restaurant", label: "Yemek" },
    { key: "hotel", label: "Otel" },
    { key: "saved", label: "Favoriler" },
  ] as const;

  const renderDistanceSecured = (distance: number | string | undefined) => {
    if (distance === undefined || distance === null) return null;
    if (typeof distance === "number") return `${distance.toFixed(1)}`;
    return `${String(distance).replace(",", ".")}`;
  };

  const renderNearbyItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.nearbyItem}
      activeOpacity={0.9}
      onPress={() => focusPlace(item)}
    >
      <View style={styles.nearbyItemLeft}>
        <View style={styles.nearbyItemIcon}>
          <Ionicons name="location-outline" size={18} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nearbyItemTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.nearbyItemMeta} numberOfLines={1}>
            {item.city} • {item.subcategory || item.category}
          </Text>
          {item.distance_km !== undefined && item.distance_km !== null && (
            <Text style={styles.nearbyItemDistance}>
              📍 {renderDistanceSecured(item.distance_km)} km uzakta
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
      <StatusBar barStyle="light-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={() => setSelectedPlace(null)}
        userInterfaceStyle="dark"
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
            pinColor={!isRouteMode ? markerColor(place) : undefined}
            onPress={() => focusPlace(place)}
          >
            {isRouteMode && (
              <View style={styles.routeMarker}>
                <Text style={styles.routeMarkerText}>{index + 1}</Text>
              </View>
            )}

            <Callout>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutTitle}>{place.name}</Text>
                <Text style={styles.calloutMeta}>
                  {place.city} • {place.category}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            coordinate={userLocation}
            pinColor="#3A86FF"
            title="Siz buradasınız"
          />
        )}
      </MapView>

      <View style={styles.topOverlay}>
        {isRouteMode ? (
          <View style={styles.tripHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>{t("map.tripMap")}</Text>
              <Text style={styles.tripSubtitle}>
                {routePlaces.length} Durak Planda
              </Text>
            </View>

            <View style={styles.tripActions}>
              {/* 🎥 SANAL TUR BAŞLAT/DURDUR BUTONU */}
              <TouchableOpacity
                style={[
                  styles.tourPlayButton,
                  isTourActive && styles.tourStopButton,
                ]}
                onPress={isTourActive ? stopFlyTour : startFlyTour}
              >
                <Ionicons
                  name={
                    isTourActive ? "stop-circle-outline" : "play-circle-outline"
                  }
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.tourPlayButtonText}>
                  {isTourActive ? "Turu Durdur" : "Sanal Tur"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareRouteButton}
                onPress={shareRoute}
              >
                <Ionicons
                  name="share-social-outline"
                  size={16}
                  color={COLORS.text}
                />
                <Text style={styles.shareRouteButtonText}>
                  {t("map.share")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareRouteButton}
                onPress={saveOfflineRoute}
              >
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={COLORS.text}
                />
                <Text style={styles.shareRouteButtonText}>
                  Kaydet
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearButton} onPress={clearRoute}>
                <Text style={styles.clearButtonText}>{t("map.clear")}</Text>
              </TouchableOpacity>
            </View>
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
              <View style={styles.nearbyBanner}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => setNearbyListVisible(true)}
                >
                  <Text style={styles.nearbyBannerText}>
                    Yakınımdaki Yerler • {nearbyCount} adet bulundu
                  </Text>
                </TouchableOpacity>

                <View style={styles.nearbyBannerRight}>
                  {/* 🎥 YAKININDAKİ YERLER İÇİN ANLIK SİNEMATİK TUR BUTONU */}
                  {nearbyPlaces.length > 1 && (
                    <TouchableOpacity
                      style={[
                        styles.tourPlayButtonMini,
                        isTourActive && styles.tourStopButtonMini,
                      ]}
                      onPress={isTourActive ? stopFlyTour : startFlyTour}
                    >
                      <Ionicons
                        name={
                          isTourActive
                            ? "stop-circle-outline"
                            : "play-circle-outline"
                        }
                        size={15}
                        color={COLORS.white}
                      />
                      <Text style={styles.tourPlayButtonTextMini}>
                        {isTourActive ? "Durdur" : "Sanal Tur"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={exitNearbyMode}
                    style={styles.exitNearbyBtn}
                  >
                    <Text style={styles.nearbyBannerAction}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </View>
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

      {/* DETAY KARTI & REHBER & NOT DEFTERİ ALANI */}

      {!isRouteMode && (
        <View style={styles.quickInfoPanel}>
          {weatherAdvice?.advice ? (
            <View style={styles.weatherAdviceBox}>
              <Ionicons name="partly-sunny-outline" size={16} color={COLORS.accent} />
              <Text style={styles.weatherAdviceText} numberOfLines={2}>
                {weatherAdvice.temperature !== null && weatherAdvice.temperature !== undefined ? `${weatherAdvice.temperature}°C • ` : ""}{weatherAdvice.advice}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.usefulInfoButton} onPress={openUsefulInfo}>
            <Ionicons name="medkit-outline" size={17} color={COLORS.white} />
            <Text style={styles.usefulInfoButtonText}>Emergency / Useful Info</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPlace && (
        <View
          style={[styles.selectedCard, { bottom: isRouteMode ? 120 : 140 }]}
        >
          <View style={styles.selectedTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedTitle}>{selectedPlace.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedPlace.city} •{" "}
                {selectedPlace.subcategory || selectedPlace.category}
              </Text>
              {selectedPlace.distance_km !== undefined &&
                selectedPlace.distance_km !== null && (
                  <Text style={styles.distance}>
                    📍 {renderDistanceSecured(selectedPlace.distance_km)} km
                    uzakta
                  </Text>
                )}
            </View>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>
                ⭐ {selectedPlace.rating ?? "-"}
              </Text>
            </View>
          </View>

          {/* 📝 KİŞİSEL NOT DEFTERİ ARAYÜZÜ */}
          <View style={styles.notesContainer}>
            {isEditingNote ? (
              <View style={styles.editNoteRow}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Bu seyahat için kişisel notunuzu buraya yazın..."
                  placeholderTextColor={COLORS.textSoft}
                  value={noteText}
                  onChangeText={setNoteText}
                  maxLength={120}
                />
                <View style={styles.editNoteButtons}>
                  <TouchableOpacity
                    style={styles.saveNoteBtn}
                    onPress={handleSaveNote}
                  >
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelNoteBtn}
                    onPress={() => setIsEditingNote(false)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.textSoft} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.noteDisplayArea}
                onPress={() => setIsEditingNote(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="create-outline"
                  size={14}
                  color={COLORS.accent}
                />
                <Text style={styles.noteDisplayText} numberOfLines={1}>
                  {noteText
                    ? `Notum: "${noteText}"`
                    : "Bu mekana ait kişisel bir seyahat notu ekle..."}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.selectedActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                router.push({
                  pathname: "/place",
                  params: { id: String(selectedPlace.id) },
                })
              }
            >
              <Text style={styles.secondaryButtonText}>{t("map.details")}</Text>
            </TouchableOpacity>

            {/* 🎙️ SESLİ REHBER BUTONU */}
            <TouchableOpacity
              style={[styles.ttsButton, isSpeaking && styles.ttsButtonSpeaking]}
              onPress={() => toggleSpeech(selectedPlace)}
            >
              <Ionicons
                name={
                  isSpeaking ? "volume-mute-outline" : "volume-medium-outline"
                }
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.ttsButtonText}>
                {isSpeaking ? "Sustur" : "Sesli Rehber"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapsButton}
              onPress={() => openInMaps(selectedPlace)}
            >
              <Ionicons
                name="navigate-outline"
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.mapsButtonText}>{t("map.navigate")}</Text>
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
              <Text style={styles.sheetTitle}>{t("map.yourRoute")}</Text>
              <Text style={styles.sheetSubtitle}>
                {routePlaces.length} Durak Planda
              </Text>
            </View>

            <TouchableOpacity style={styles.sheetMapButton} onPress={centerAll}>
              <Ionicons name="map-outline" size={18} color={COLORS.text} />
              <Text style={styles.sheetMapButtonText}>{t("map.refit")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeCardsRow}
          >
            {routePlaces.map((place, index) => (
              <TouchableOpacity
                key={`${place.id}-${index}`}
                style={[
                  styles.routeModernCard,
                  selectedPlace?.id === place.id &&
                    styles.routeModernCardActive,
                ]}
                activeOpacity={0.9}
                onPress={() => focusPlace(place)}
              >
                <View style={styles.routeModernTop}>
                  <View style={styles.routeNumber}>
                    <Text style={styles.routeNumberText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.routeModernTitle}>
                      {place.name}
                    </Text>
                    <Text style={styles.routeModernMeta}>{place.city}</Text>
                  </View>
                </View>

                <View style={styles.routeModernBottom}>
                  <Text style={styles.routeModernCategory}>
                    {place.subcategory || place.category}
                  </Text>
                  <Text style={styles.routeModernRating}>
                    ⭐ {place.rating ?? "-"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.routeDetailsButton}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/place",
                      params: { id: String(place.id) },
                    })
                  }
                >
                  <Text style={styles.routeDetailsButtonText}>
                    {t("map.detailsButton")}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.sheetListWrapper}
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>
        </Animated.View>
      )}


      <Modal
        visible={usefulInfoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUsefulInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setUsefulInfoVisible(false)}
          />
          <View style={styles.usefulInfoSheet}>
            <View style={styles.listHandle} />
            <View style={styles.listHeaderRow}>
              <View>
                <Text style={styles.listTitle}>Emergency / Useful Info</Text>
                <Text style={styles.listSubtitle}>Yakındaki önemli noktaları Google Maps’te aç</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setUsefulInfoVisible(false)}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {usefulInfoItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.type}-${index}`}
                style={styles.usefulInfoItem}
                onPress={() => item.url ? Linking.openURL(item.url) : null}
              >
                <View style={styles.usefulInfoIcon}>
                  <Ionicons
                    name={item.type === "hospital" ? "medical-outline" : item.type === "pharmacy" ? "medkit-outline" : item.type === "police" ? "shield-checkmark-outline" : "bus-outline"}
                    size={18}
                    color={COLORS.white}
                  />
                </View>
                <Text style={styles.usefulInfoLabel}>{item.label}</Text>
                <Ionicons name="open-outline" size={17} color={COLORS.textSoft} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
                <Text style={styles.listTitle}>Yakındaki Yerler</Text>
                <Text style={styles.listSubtitle}>
                  Konumunuza yakın {nearbyCount} seyahat noktası
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
                  Mesafe
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
                  Puan
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
                  <Text style={styles.emptyListText}>
                    Yakınlarda mekan bulunamadı.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* 🌀 HARİTA ÜSTÜ PREMIUM LOADING KATMANI */}
      {loadingNearby && (
        <View style={styles.mapLoaderLayer}>
          <View style={styles.loaderBlurBox}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loaderText}>Searching nearby gems...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },
  topOverlay: { position: "absolute", top: 58, left: 14, right: 14 },
  tripHeader: {
    backgroundColor: "rgba(28, 31, 48, 0.95)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  tripSubtitle: { fontSize: 13, color: COLORS.textSoft },
  clearButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { color: COLORS.textSoft, fontWeight: "700", fontSize: 13 },
  filterRow: { paddingRight: 8 },
  filterChip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(28, 31, 48, 0.95)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterChipText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: COLORS.white, fontWeight: "700" },
  nearbyBanner: {
    marginTop: 10,
    backgroundColor: "rgba(28, 31, 48, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nearbyBannerText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  nearbyBannerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  nearbyBannerHint: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "500",
    marginRight: 12,
  },
  nearbyBannerAction: { color: COLORS.accent, fontSize: 13, fontWeight: "700" },
  exitNearbyBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  rightButtons: { position: "absolute", right: 14, bottom: 230 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(28, 31, 48, 0.95)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
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
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  selectedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  selectedMeta: { fontSize: 13, color: COLORS.textSoft, lineHeight: 18 },
  distance: { color: COLORS.textSoft, fontSize: 12, marginTop: 4 },
  ratingBadge: {
    marginLeft: 10,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ratingBadgeText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  selectedActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
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
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#3A3F58",
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
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  sheetSubtitle: { fontSize: 13, color: COLORS.textSoft },
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
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },
  sheetListWrapper: { flex: 1, marginTop: 4 },
  sheetList: { gap: 10, paddingBottom: 180 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetRowLeft: { flexDirection: "row", alignItems: "center" },
  sheetRowIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sheetRowIndexText: { color: COLORS.accent, fontSize: 12, fontWeight: "700" },
  sheetRowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  sheetRowMeta: { color: COLORS.textSoft, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalBackdrop: { flex: 1 },
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
    backgroundColor: "#3A3F58",
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
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  listSubtitle: { color: COLORS.textSoft, fontSize: 13 },
  listClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: { flexDirection: "row", marginBottom: 14 },
  sortChip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sortChipActive: { backgroundColor: COLORS.accent },
  sortChipText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  sortChipTextActive: { color: COLORS.white, fontWeight: "700" },
  nearbyItem: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  nearbyItemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  nearbyItemMeta: { color: COLORS.textSoft, fontSize: 12, marginBottom: 3 },
  nearbyItemDistance: { color: COLORS.accent, fontSize: 12, fontWeight: "700" },
  nearbyItemRight: { alignItems: "flex-end", justifyContent: "center" },
  nearbyItemRating: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyListBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: { color: COLORS.textSoft, fontSize: 14, fontWeight: "500" },
  routeMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  routeMarkerText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  calloutBox: { width: 180, padding: 4 },
  calloutTitle: {
    color: "#131622",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  calloutMeta: { color: "#686E85", fontSize: 12 },
  tripActions: { flexDirection: "row", alignItems: "center", gap: 6 },

  quickInfoPanel: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 138,
    zIndex: 5,
  },
  weatherAdviceBox: {
    backgroundColor: "rgba(28,31,48,0.94)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  weatherAdviceText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 8,
    flex: 1,
    fontWeight: "600",
  },
  usefulInfoButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  usefulInfoButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    marginLeft: 7,
    fontSize: 12,
  },
  usefulInfoSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  usefulInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  usefulInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  usefulInfoLabel: {
    color: COLORS.text,
    fontWeight: "700",
    flex: 1,
    fontSize: 14,
  },

  shareRouteButton: {
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  shareRouteButtonText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
  routeCardsRow: { paddingRight: 8, marginBottom: 18 },
  routeModernCard: {
    width: 220,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 24,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeModernCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(214, 90, 90, 0.08)",
  },
  routeModernTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  routeNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  routeNumberText: { color: COLORS.accent, fontWeight: "700", fontSize: 14 },
  routeModernTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  routeModernMeta: { color: COLORS.textSoft, fontSize: 12 },
  routeModernBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeModernCategory: {
    color: COLORS.textSoft,
    fontSize: 12,
    textTransform: "capitalize",
  },
  routeModernRating: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  routeDetailsButton: {
    marginTop: 12,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  routeDetailsButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 4,
  },
  mapsButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  mapsButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },

  // --- 🎙️ AI SESLİ REHBER & 🎥 SANAL TUR BUTON STİLLERİ ---
  ttsButton: {
    flex: 1.2,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  ttsButtonSpeaking: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  ttsButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },

  tourPlayButton: {
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  tourStopButton: {
    backgroundColor: "#2E334D",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tourPlayButtonText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },

  tourPlayButtonMini: {
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
  },
  tourStopButtonMini: {
    backgroundColor: "#2E334D",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tourPlayButtonTextMini: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 11,
  },

  // --- 📝 KİŞİSEL NOT SİSTEMİ STİLLERİ ---
  notesContainer: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  noteDisplayArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteDisplayText: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  editNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  noteInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    paddingVertical: 4,
    fontWeight: "500",
  },
  editNoteButtons: {
    flexDirection: "row",
    gap: 6,
  },
  saveNoteBtn: {
    width: 26,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelNoteBtn: {
    width: 26,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  mapLoaderLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 10, 16, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loaderBlurBox: {
    backgroundColor: "rgba(28, 31, 48, 0.95)",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#090A10",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  loaderText: {
    color: "#F1F3F9",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    letterSpacing: -0.2,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

});
