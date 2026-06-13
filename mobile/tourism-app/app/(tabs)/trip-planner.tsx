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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLanguage } from "../../context/LanguageContext";


const PLANNER_UI: Record<string, Record<string, string>> = {
  budgetPreference: {
    tr: "Bütçe Tercihi",
    en: "Budget Preference",
    de: "Budgetpräferenz",
    ru: "Бюджет",
  },
  lowBudget: {
    tr: "Düşük",
    en: "Low",
    de: "Niedrig",
    ru: "Низкий",
  },
  mediumBudget: {
    tr: "Orta",
    en: "Medium",
    de: "Mittel",
    ru: "Средний",
  },
  highBudget: {
    tr: "Yüksek",
    en: "High",
    de: "Hoch",
    ru: "Высокий",
  },
  pdf: {
    tr: "PDF",
    en: "PDF",
    de: "PDF",
    ru: "PDF",
  },
  pdfTitle: {
    tr: "AI Gezi Planı",
    en: "AI Travel Plan",
    de: "AI-Reiseplan",
    ru: "AI-план поездки",
  },
  pdfError: {
    tr: "PDF oluşturulamadı.",
    en: "Could not create PDF.",
    de: "PDF konnte nicht erstellt werden.",
    ru: "Не удалось создать PDF.",
  },
  openMapAll: {
    tr: "Tüm Rotayı Haritada Aç",
    en: "Open Full Route on Map",
    de: "Gesamte Route auf Karte öffnen",
    ru: "Открыть весь маршрут на карте",
  },
  rainyMode: {
    tr: "Yağmurlu Gün Modu",
    en: "Rainy Day Mode",
    de: "Regentag-Modus",
    ru: "Режим дождливого дня",
  },
  rainyModeDesc: {
    tr: "Kapalı mekan, müze, AVM ve daha az yürüyüş içeren plan oluşturur.",
    en: "Creates a plan with indoor places, museums, malls and less walking.",
    de: "Erstellt einen Plan mit Innenräumen, Museen, Einkaufszentren und weniger Fußweg.",
    ru: "Создает план с закрытыми местами, музеями, ТЦ и меньшим количеством ходьбы.",
  },
  achievements: {
    tr: "Plan Başarımları",
    en: "Plan Achievements",
    de: "Plan-Erfolge",
    ru: "Достижения плана",
  },
  firstPlan: {
    tr: "İlk AI Planı",
    en: "First AI Plan",
    de: "Erster AI-Plan",
    ru: "Первый AI-план",
  },
  multiDay: {
    tr: "Çok Günlü Rota",
    en: "Multi-day Route",
    de: "Mehrtägige Route",
    ru: "Маршрут на несколько дней",
  },
  budgetReady: {
    tr: "Bütçe Analizi",
    en: "Budget Analysis",
    de: "Budgetanalyse",
    ru: "Анализ бюджета",
  },
};

function plannerText(key: string, language: string) {
  const lang = String(language || "en").toLowerCase();
  return PLANNER_UI[key]?.[lang] || PLANNER_UI[key]?.en || key;
}

function categoryDisplay(category: string | undefined, language: string) {
  const c = String(category || "").toLowerCase();
  if (c.includes("restaurant") || c.includes("food") || c.includes("cafe")) {
    return language === "tr" ? "Restoran" : language === "de" ? "Restaurant" : language === "ru" ? "Ресторан" : "Restaurant";
  }
  if (c.includes("hotel")) {
    return language === "tr" ? "Otel" : language === "de" ? "Hotel" : language === "ru" ? "Отель" : "Hotel";
  }
  if (c.includes("museum")) {
    return language === "tr" ? "Müze" : language === "de" ? "Museum" : language === "ru" ? "Музей" : "Museum";
  }
  return language === "tr" ? "Gezilecek Yer" : language === "de" ? "Sehenswürdigkeit" : language === "ru" ? "Достопримечательность" : "Attraction";
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

export default function TripPlanner() {
  const { language, t } = useLanguage();

  const [city, setCity] = useState("");
  const [days, setDays] = useState("");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [budgetPreference, setBudgetPreference] = useState<"low" | "medium" | "high">("medium");
  const [rainyMode, setRainyMode] = useState(false);

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
    setBudgetPreference("medium");
    setRainyMode(false);
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

  const updateBudgetPreference = (value: "low" | "medium" | "high") => {
    setBudgetPreference(value);
    if (plan) {
      setPlan(null);
      setBudget(null);
    }
  };

  const toggleRainyMode = () => {
    setRainyMode((old) => !old);
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
          budget_preference: budgetPreference,
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
          interests: rainyMode
            ? `${cleanInterests} | rainy day indoor museums malls less walking`
            : cleanInterests,
          budget_preference: budgetPreference,
          rainy_mode: rainyMode,
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


  const getAllPlaces = () => {
    return (
      plan?.places ||
      (plan?.days || []).flatMap((day: any) => day.places || [])
    ).filter((place: any) => place?.latitude && place?.longitude);
  };

  const showFullRoute = () => {
    const allPlaces = getAllPlaces();

    if (!allPlaces.length) return;

    router.push({
      pathname: "/(tabs)/map",
      params: {
        route: JSON.stringify(allPlaces),
      },
    });
  };

  const createPdfHtml = () => {
    const createdAt = new Date().toLocaleDateString(
      language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "ru" ? "ru-RU" : "en-US"
    );

    const daysHtml = (plan?.days || [])
      .map((day: any) => {
        const placesHtml = (day.places || [])
          .map(
            (place: any, index: number) => `
              <li>
                <strong>${index + 1}. ${escapeHtml(place.name)}</strong>
                <br/>
                <span>${escapeHtml(place.city || city)} ${place.district ? "• " + escapeHtml(place.district) : ""}</span>
                <br/>
                <small>${escapeHtml(categoryDisplay(place.category, language))}</small>
              </li>
            `
          )
          .join("");

        return `
          <section class="day">
            <h2>${escapeHtml(t("tripPlanner.day"))} ${escapeHtml(day.day)}${day.title ? " - " + escapeHtml(day.title) : ""}</h2>
            ${day.note ? `<p class="note">${escapeHtml(day.note)}</p>` : ""}
            <ol>${placesHtml}</ol>
          </section>
        `;
      })
      .join("");

    const budgetHtml = budget
      ? `
        <div class="budget">
          <h2>${escapeHtml(t("tripPlanner.budgetEstimate"))}</h2>
          <p class="budget-total">${escapeHtml(budget.min_total)} - ${escapeHtml(budget.max_total)} ${escapeHtml(budget.currency || "TRY")}</p>
          <p>${escapeHtml(t("tripPlanner.dailyAverage"))}: ${escapeHtml(budget.daily_average)} ${escapeHtml(budget.currency || "TRY")}</p>
          ${budget.note ? `<p>${escapeHtml(budget.note)}</p>` : ""}
        </div>
      `
      : "";

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #F7F4EF;
              color: #1F2937;
              padding: 28px;
            }
            .header {
              background: #FFFFFF;
              border-radius: 22px;
              padding: 24px;
              border: 1px solid rgba(31,41,55,0.08);
              margin-bottom: 18px;
            }
            h1 {
              margin: 0;
              font-size: 30px;
              color: #1F2937;
            }
            .meta {
              color: #6B7280;
              margin-top: 10px;
              line-height: 1.5;
            }
            .pill {
              display: inline-block;
              padding: 7px 12px;
              border-radius: 999px;
              background: #FFF1F4;
              color: #E85D75;
              font-weight: 700;
              margin-right: 6px;
              margin-top: 10px;
            }
            .day, .budget {
              background: #FFFFFF;
              border-radius: 20px;
              padding: 18px;
              margin-bottom: 14px;
              border: 1px solid rgba(31,41,55,0.08);
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 20px;
              color: #E85D75;
            }
            li {
              margin-bottom: 12px;
              line-height: 1.45;
            }
            small, span, .note {
              color: #6B7280;
            }
            .budget-total {
              font-size: 22px;
              font-weight: 800;
              color: #E85D75;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(plannerText("pdfTitle", language))}</h1>
            <div class="meta">
              <strong>${escapeHtml(t("tripPlanner.city"))}:</strong> ${escapeHtml(city)}<br/>
              <strong>${escapeHtml(t("tripPlanner.days"))}:</strong> ${escapeHtml(days)}<br/>
              <strong>${escapeHtml(t("tripPlanner.interests"))}:</strong> ${escapeHtml(interests || "-")}<br/>
              <strong>${escapeHtml(plannerText("budgetPreference", language))}:</strong> ${escapeHtml(plannerText(`${budgetPreference}Budget`, language))}<br/>
              <strong>${createdAt}</strong>
            </div>
            ${rainyMode ? `<span class="pill">${escapeHtml(plannerText("rainyMode", language))}</span>` : ""}
          </div>
          ${budgetHtml}
          ${daysHtml}
        </body>
      </html>
    `;
  };

  const exportTripPdf = async () => {
    try {
      if (!plan?.days?.length) return;

      const html = createPdfHtml();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: plannerText("pdfTitle", language),
          UTI: "com.adobe.pdf",
        });
      } else {
        await Share.share({ message: uri });
      }
    } catch (error) {
      console.log("PDF error", error);
      Alert.alert(t("common.error"), plannerText("pdfError", language));
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
        budgetPreference,
        rainyMode,
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
      <StatusBar barStyle="dark-content" />

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
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={updateCity}
          />

          <Text style={styles.label}>{t("tripPlanner.days")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("tripPlanner.daysPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={days}
            onChangeText={updateDays}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t("tripPlanner.interests")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("tripPlanner.interestsPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={interests}
            onChangeText={updateInterests}
          />


          <Text style={styles.label}>{plannerText("budgetPreference", language)}</Text>
          <View style={styles.budgetPreferenceRow}>
            {(["low", "medium", "high"] as const).map((item) => {
              const active = budgetPreference === item;

              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.86}
                  style={[styles.budgetChip, active && styles.budgetChipActive]}
                  onPress={() => updateBudgetPreference(item)}
                >
                  <Text style={[styles.budgetChipText, active && styles.budgetChipTextActive]}>
                    {plannerText(`${item}Budget`, language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            style={[styles.rainyCard, rainyMode && styles.rainyCardActive]}
            onPress={toggleRainyMode}
          >
            <View style={styles.rainyIconBox}>
              <Ionicons
                name={rainyMode ? "rainy" : "rainy-outline"}
                size={20}
                color={rainyMode ? COLORS.white : COLORS.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rainyTitle, rainyMode && styles.rainyTitleActive]}>
                {plannerText("rainyMode", language)}
              </Text>
              <Text style={[styles.rainyDesc, rainyMode && styles.rainyDescActive]}>
                {plannerText("rainyModeDesc", language)}
              </Text>
            </View>
          </TouchableOpacity>


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

                  <TouchableOpacity style={styles.actionButton} onPress={exportTripPdf}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.text} />
                    <Text style={styles.actionButtonText}>{plannerText("pdf", language)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={showFullRoute}>
                    <Ionicons name="map-outline" size={16} color={COLORS.text} />
                    <Text style={styles.actionButtonText}>{plannerText("openMapAll", language)}</Text>
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


            {plan.days?.length > 0 && (
              <View style={styles.achievementCard}>
                <View style={styles.achievementTop}>
                  <Ionicons name="trophy-outline" size={20} color={COLORS.accent} />
                  <Text style={styles.achievementTitle}>{plannerText("achievements", language)}</Text>
                </View>

                <View style={styles.achievementRow}>
                  <View style={styles.achievementPill}>
                    <Ionicons name="sparkles-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.achievementText}>{plannerText("firstPlan", language)}</Text>
                  </View>

                  {Number(days) > 1 && (
                    <View style={styles.achievementPill}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
                      <Text style={styles.achievementText}>{plannerText("multiDay", language)}</Text>
                    </View>
                  )}

                  {budget && (
                    <View style={styles.achievementPill}>
                      <Ionicons name="wallet-outline" size={14} color={COLORS.accent} />
                      <Text style={styles.achievementText}>{plannerText("budgetReady", language)}</Text>
                    </View>
                  )}
                </View>
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
                        {categoryDisplay(place.category, language)}
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


  budgetPreferenceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  budgetChip: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },

  budgetChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  budgetChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  budgetChipTextActive: {
    color: COLORS.white,
  },

  rainyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF1F4",
    borderWidth: 1,
    borderColor: "rgba(232,93,117,0.16)",
    borderRadius: 18,
    padding: 13,
    marginBottom: 14,
  },

  rainyCardActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  rainyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(232,93,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  rainyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },

  rainyTitleActive: {
    color: COLORS.white,
  },

  rainyDesc: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },

  rainyDescActive: {
    color: "rgba(255,255,255,0.88)",
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
    color: COLORS.accent,
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


  achievementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  achievementTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  achievementTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },

  achievementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  achievementPill: {
    backgroundColor: "#FFF1F4",
    borderWidth: 1,
    borderColor: "rgba(232,93,117,0.16)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  achievementText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
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
