import React, { useRef, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  bg: "#131622",
  surface: "#1C1F30",
  surfaceSoft: "#272B42",
  border: "rgba(255,255,255,0.04)",
  text: "#F1F3F9",
  textSoft: "#8E95B2",
  accent: "#D65A5A",
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
  const [budget, setBudget] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);

  const resetPlan = () => {
    setPlan(null);
    setBudget(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 80);
  };

  const clearAll = () => {
    setCity("");
    setDays("");
    setInterests("");
    setPlan(null);
    setBudget(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 80);
  };

  const updateCity = (value: string) => {
    setCity(value);
    if (plan) {
      setPlan(null);
      setBudget(null);
    }
  };

  const updateDays = (value: string) => {
    setDays(value);
    if (plan) {
      setPlan(null);
      setBudget(null);
    }
  };

  const updateInterests = (value: string) => {
    setInterests(value);
    if (plan) {
      setPlan(null);
      setBudget(null);
    }
  };

  const fetchBudget = async (places: any[], dayCount: number) => {
    try {
      if (!places?.length) {
        setBudget(null);
        return;
      }

      const res = await fetch("http://10.0.2.2:8000/budget-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          places,
          days: dayCount,
          traveler_count: 1,
          language,
        }),
      });

      const data = await res.json();
      setBudget(data);
    } catch (error) {
      console.log("Budget error:", error);
      setBudget(null);
    }
  };

  const generateTrip = async () => {
    const cleanCity = city.trim();
    const cleanDays = days.trim();
    const cleanInterests = interests.trim();

    if (!cleanCity || !cleanDays) {
      Alert.alert(t("tripPlanner.missingTitle"), t("tripPlanner.missingMessage"));
      return;
    }

    try {
      setLoading(true);
      setPlan(null);
      setBudget(null);

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

      const allPlaces =
        data?.places ||
        (data?.days || []).flatMap((day: any) => day.places || []);

      await fetchBudget(allPlaces, Number(cleanDays) || 1);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 520, animated: true });
      }, 120);
    } catch (error) {
      console.log(error);
      Alert.alert(t("common.error"), t("tripPlanner.createError"));
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

        return `${t("tripPlanner.day")} ${day.day}${day.title ? ` - ${day.title}` : ""}\n${places}${
          day.note ? `\n\n${day.note}` : ""
        }`;
      })
      .join("\n\n");

    try {
      await Share.share({
        message: `${t("tripPlanner.shareTitle")}\n\n${text}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const saveRoute = async () => {
    try {
      if (!plan?.days?.length) return;

      const raw = await AsyncStorage.getItem("saved_routes");
      const list = raw ? JSON.parse(raw) : [];

      const route = {
        id: Date.now().toString(),
        title: `${city} - ${days} ${t("tripPlanner.day")}`,
        city,
        days,
        interests,
        plan,
        budget,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        "saved_routes",
        JSON.stringify([route, ...(Array.isArray(list) ? list : [])])
      );

      Alert.alert(t("tripPlanner.routeSavedTitle"), t("tripPlanner.routeSavedMessage"));
    } catch (error) {
      console.log(error);
      Alert.alert(t("common.error"), t("tripPlanner.routeSaveError"));
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
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{t("tripPlanner.title")}</Text>
        <Text style={styles.subtitle}>{t("tripPlanner.subtitle")}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t("tripPlanner.city")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("tripPlanner.cityPlaceholder")}
            placeholderTextColor="#5C627D"
            value={city}
            onChangeText={updateCity}
          />

          <Text style={styles.label}>{t("tripPlanner.days")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("tripPlanner.daysPlaceholder")}
            placeholderTextColor="#5C627D"
            value={days}
            onChangeText={updateDays}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t("tripPlanner.interests")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("tripPlanner.interestsPlaceholder")}
            placeholderTextColor="#5C627D"
            value={interests}
            onChangeText={updateInterests}
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
                <Ionicons name="sparkles-outline" size={18} color={COLORS.white} />
                <Text style={styles.buttonText}>{t("tripPlanner.generate")}</Text>
              </>
            )}
          </TouchableOpacity>

          {(plan || city || days || interests) && (
            <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
              <Ionicons name="refresh-outline" size={16} color={COLORS.text} />
              <Text style={styles.clearButtonText}>Yeni plan yaz</Text>
            </TouchableOpacity>
          )}
        </View>

        {plan && (
          <View style={styles.resultWrapper}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{t("tripPlanner.generatedPlan")}</Text>
                {plan.reply ? (
                  <Text style={styles.resultIntro}>{plan.reply}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={resetPlan}>
                <Ionicons name="create-outline" size={16} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Düzenle</Text>
              </TouchableOpacity>

              {plan.days?.length > 0 && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={saveRoute}>
                    <Ionicons name="download-outline" size={16} color={COLORS.text} />
                    <Text style={styles.actionButtonText}>{t("tripPlanner.save")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={shareTrip}>
                    <Ionicons name="share-social-outline" size={16} color={COLORS.text} />
                    <Text style={styles.actionButtonText}>{t("tripPlanner.share")}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {budget && (
              <View style={styles.budgetCard}>
                <View style={styles.budgetTop}>
                  <Ionicons name="wallet-outline" size={20} color={COLORS.accent} />
                  <Text style={styles.budgetTitle}>{t("tripPlanner.budgetEstimate")}</Text>
                </View>

                <Text style={styles.budgetAmount}>
                  {budget.min_total} - {budget.max_total} {budget.currency || "TRY"}
                </Text>

                <Text style={styles.budgetText}>
                  {t("tripPlanner.dailyAverage")}: {budget.daily_average} {budget.currency || "TRY"}
                </Text>

                {budget.note ? <Text style={styles.budgetNote}>{budget.note}</Text> : null}
              </View>
            )}

            {plan.days?.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t("tripPlanner.noPlan")}</Text>
              </View>
            )}

            {plan.days?.map((day: any) => (
              <View key={day.day} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.dayTitle}>
                      {t("tripPlanner.day")} {day.day}
                    </Text>
                    {day.title ? (
                      <Text style={styles.daySubtitle}>{day.title}</Text>
                    ) : null}
                  </View>

                  {day.places?.length > 0 && (
                    <TouchableOpacity
                      style={styles.routeButton}
                      onPress={() => showDayRoute(day.places)}
                    >
                      <Ionicons name="map-outline" size={15} color={COLORS.white} />
                      <Text style={styles.routeButtonText}>{t("tripPlanner.route")}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {day.note ? <Text style={styles.note}>{day.note}</Text> : null}

                {day.places?.map((place: any) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.placeCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      router.push({
                        pathname: "/place",
                        params: { id: String(place.id) },
                      })
                    }
                  >
                    {place.image ? (
                      <Image source={{ uri: place.image }} style={styles.placeImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Ionicons name="image-outline" size={24} color={COLORS.textSoft} />
                      </View>
                    )}

                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
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

  clearButton: {
    marginTop: 12,
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  clearButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
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
    marginBottom: 12,
  },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  actionButton: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  actionButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 5,
  },

  budgetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  budgetTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  budgetTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  budgetAmount: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  budgetText: {
    color: COLORS.textSoft,
    fontSize: 14,
    marginBottom: 8,
  },

  budgetNote: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 18,
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
    lineHeight: 20,
    marginBottom: 12,
  },

  placeCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  placeImage: {
    width: 82,
    height: 82,
  },

  placeholderImage: {
    width: 82,
    height: 82,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  placeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },

  placeName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  placeMeta: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginBottom: 3,
  },

  placeCity: {
    color: COLORS.textSoft,
    fontSize: 12,
  },
});
