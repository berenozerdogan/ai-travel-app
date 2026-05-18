import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE TRIP PLANNER RENKLERİ
const COLORS = {
  bg: "#131622",          // Derin, puslu gece denizi rengi
  surface: "#1C1F30",     // Gece mavisi-gri asil kart yüzeyi
  surfaceSoft: "#272B42", // Inputlar ve iç kartlar için soft kontrast ton
  border: "rgba(255, 255, 255, 0.03)",
  text: "#F1F3F9",        // Kirli beyaz ana başlıklar
  textSoft: "#8E95B2",    // Sis bulutlarının puslu grisi
  accent: "#D65A5A",      // O büyüleyici köprü kırmızısı (Muted Crimson)
  white: "#FFFFFF",
  shadow: "#090A10",
};

export default function TripPlanner() {
  const { language, t } = useLanguage();

  const [city, setCity] = useState("");
  const [days, setDays] = useState("");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const generateTrip = async () => {
    const cleanCity = city.trim();
    const cleanDays = days.trim();
    const cleanInterests = interests.trim();

    if (!cleanCity || !cleanDays) {
      Alert.alert("Eksik bilgi", "Lütfen şehir ve gün sayısı gir.");
      return;
    }

    try {
      setLoading(true);
      setPlan(null);

      const res = await fetch("http://10.0.2.2:8000/trip-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: cleanCity,
          days: Number(cleanDays),
          interests: cleanInterests,
          language,
        }),
      });

      const data = await res.json();
      setPlan(data);
    } catch (error) {
      console.log(error);
      Alert.alert("Hata", "Gezi planı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const shareTrip = async () => {
    if (!plan?.days?.length) return;

    const text = plan.days
      .map((day: any) => {
        const places = (day.places || [])
          .map((place: any, index: number) => `${index + 1}. ${place.name}`)
          .join("\n");

        return `Gün ${day.day}${day.title ? ` - ${day.title}` : ""}\n${places}${
          day.note ? `\n\n${day.note}` : ""
        }`;
      })
      .join("\n\n");

    try {
      await Share.share({
        message: `AI Travel App Rotam\n\n${text}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const showDayRoute = (places: any[]) => {
    router.push({
      pathname: "/(tabs)/map",
      params: {
        route: JSON.stringify(places),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>AI Trip Planner</Text>
        <Text style={styles.subtitle}>
          Şehir, gün sayısı ve ilgi alanlarını girerek aynı ekranda yapay zekâ
          destekli gezi planı oluştur.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Şehir</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: İstanbul, Antalya, Nevşehir"
            placeholderTextColor="#5C627D"
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Gün Sayısı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 2"
            placeholderTextColor="#5C627D"
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
          />

          <Text style={styles.label}>İlgi Alanları</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: doğa, tarih, yemek"
            placeholderTextColor="#5C627D"
            value={interests}
            onChangeText={setInterests}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.button,
              (!city.trim() || !days.trim() || loading) && styles.disabledButton,
            ]}
            onPress={generateTrip}
            disabled={!city.trim() || !days.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.buttonText}>Gezi Planı Oluştur</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {plan && (
          <View style={styles.resultWrapper}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>Oluşturulan Plan</Text>
                {plan.reply ? (
                  <Text style={styles.resultIntro}>{plan.reply}</Text>
                ) : null}
              </View>

              {plan.days?.length > 0 && (
                <TouchableOpacity style={styles.shareButton} onPress={shareTrip}>
                  <Ionicons
                    name="share-social-outline"
                    size={16}
                    color={COLORS.white}
                  />
                  <Text style={styles.shareButtonText}>Paylaş</Text>
                </TouchableOpacity>
              )}
            </View>

            {plan.days?.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Bu şehir için uygun plan oluşturulamadı.
                </Text>
              </View>
            )}

            {plan.days?.map((day: any) => (
              <View key={day.day} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.dayTitle}>Gün {day.day}</Text>
                    {day.title ? (
                      <Text style={styles.daySubtitle}>{day.title}</Text>
                    ) : null}
                  </View>

                  {day.places?.length > 0 && (
                    <TouchableOpacity
                      style={styles.routeButton}
                      onPress={() => showDayRoute(day.places)}
                    >
                      <Ionicons
                        name="map-outline"
                        size={15}
                        color={COLORS.white}
                      />
                      <Text style={styles.routeButtonText}>Rota</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {day.note ? <Text style={styles.note}>{day.note}</Text> : null}

                {day.places?.map((place: any) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.placeCard}
                    activeOpacity={0.92}
                    onPress={() => router.push(`/place?name=${place.name}`)}
                  >
                    {place.image ? (
                      <Image source={{ uri: place.image }} style={styles.placeImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color={COLORS.textSoft}
                        />
                      </View>
                    )}

                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                      <Text style={styles.placeMeta}>
                        {place.category} • ⭐ {place.rating || 0}
                      </Text>
                      <Text style={styles.placeCity} numberOfLines={1}>
                        {place.city} {place.district ? `• ${place.district}` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  content: {
    padding: 20,
    paddingBottom: 120,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 22,
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  label: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  input: {
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    padding: 15,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
  },

  button: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  disabledButton: {
    opacity: 0.4,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },

  resultWrapper: {
    marginTop: 24,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  resultTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  resultIntro: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },

  shareButton: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    marginTop: 2,
  },

  shareButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 5,
  },

  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyText: {
    color: COLORS.textSoft,
    fontSize: 14,
  },

  dayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  dayTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },

  daySubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 3,
  },

  routeButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },

  routeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  note: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },

  placeCard: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  placeImage: {
    width: 86,
    height: 86,
    borderRadius: 14,
    marginRight: 12,
  },

  placeholderImage: {
    width: 86,
    height: 86,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  placeInfo: {
    flex: 1,
    justifyContent: "center",
  },

  placeName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },

  placeMeta: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginBottom: 4,
  },

  placeCity: {
    color: COLORS.textSoft,
    fontSize: 12,
  },
});