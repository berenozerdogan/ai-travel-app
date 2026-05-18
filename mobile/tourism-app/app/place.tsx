import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE PLACE DETAILS RENKLERİ
const COLORS = {
  bg: "#131622",          // Derin, puslu gece denizi rengi
  surface: "#1C1F30",     // Gece mavisi-gri asil kart yüzeyi
  surfaceSoft: "#272B42", // Bilgi kartları, etiket çipleri ve avatar zeminleri
  border: "rgba(255, 255, 255, 0.03)",
  text: "#F1F3F9",        // Göz yormayan kirli beyaz ana başlıklar
  textSoft: "#8E95B2",    // Sis bulutlarının puslu grisi
  accent: "#D65A5A",      // O büyüleyici köprü kırmızısı (Muted Crimson)
  white: "#FFFFFF",
  shadow: "#090A10",
};

export default function Place() {
  const { name } = useLocalSearchParams();
  const { t, language } = useLanguage();

  const [place, setPlace] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [insightData, setInsightData] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);

  useEffect(() => {
    if (!name) return;

    const encodedName = encodeURIComponent(String(name));

    fetch(`http://10.0.2.2:8000/places/${encodedName}`)
      .then((res) => res.json())
      .then((data) => setPlace(data))
      .catch((err) => console.log(err));

    fetch(`http://10.0.2.2:8000/analyze/${encodedName}`)
      .then((res) => res.json())
      .then((data) => setAnalysis(data))
      .catch((err) => console.log(err));

    fetch(
      `http://10.0.2.2:8000/summary/${encodedName}?language=${encodeURIComponent(
        language
      )}`
    )
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.log(err));
  }, [name, language]);

  useEffect(() => {
    if (!place?.name) return;

    setLoadingReviews(true);
    setLoadingInsight(true);

    fetch(
      `http://10.0.2.2:8000/reviews?place=${encodeURIComponent(
        `${place.name} ${place.city || ""}`
      )}&language=${encodeURIComponent(language)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setReviewsData(data);
        setLoadingReviews(false);
      })
      .catch((err) => {
        console.log(err);
        setLoadingReviews(false);
      });

    fetch(
      `http://10.0.2.2:8000/place-insight?place=${encodeURIComponent(
        place.name
      )}&city=${encodeURIComponent(place.city || "")}&language=${encodeURIComponent(
        language
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setInsightData(data);
        setLoadingInsight(false);
      })
      .catch((err) => {
        console.log(err);
        setLoadingInsight(false);
      });
  }, [place, language]);

  const savePlace = async () => {
    try {
      if (!place) return;

      const existing = await AsyncStorage.getItem("saved_places");
      const savedPlaces = existing ? JSON.parse(existing) : [];

      const alreadySaved = savedPlaces.some((item: any) => item.id === place.id);

      if (alreadySaved) {
        Alert.alert(
          t("place.alreadySavedTitle"),
          t("place.alreadySavedMessage")
        );
        return;
      }

      const updatedPlaces = [...savedPlaces, place];
      await AsyncStorage.setItem("saved_places", JSON.stringify(updatedPlaces));

      Alert.alert(t("place.savedTitle"), t("place.savedMessage"));
    } catch (error) {
      console.log(error);
      Alert.alert(t("place.errorTitle"), t("place.saveError"));
    }
  };

  const showOnMap = () => {
    try {
      if (!place) return;

      router.push({
        pathname: "/(tabs)/map",
        params: {
          route: JSON.stringify([place]),
        },
      });
    } catch (error) {
      console.log(error);
      Alert.alert(t("place.errorTitle"), t("place.mapError"));
    }
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const cleanDistrict = (district?: string) => {
    if (!district) return "";
    let value = String(district).trim();
    value = value.replace(/^\d{5}\s*/, "").trim();

    if (value.includes("/")) {
      value = value.split("/")[0].trim();
    }
    if (value.includes(",")) {
      value = value.split(",")[0].trim();
    }
    return value;
  };

  const categoryLabel = (category?: string) => {
    if (!category) return "";
    if (category === "attraction") return t("categories.attraction");
    if (category === "restaurant") return t("categories.restaurant");
    if (category === "hotel") return t("categories.hotel");
    if (category === "cafe") return t("categories.cafe");
    if (category === "museum") return t("categories.museum");
    if (category === "shopping") return t("home.shopping");
    return category;
  };

  const subcategoryLabel = (subcategory?: string) => {
    if (!subcategory) return "";
    const key = String(subcategory).toLowerCase();
    const map: any = {
      beach: "🏖️ Beach",
      nature: "🌿 Nature",
      shopping: "🛍️ Shopping",
      historical: "🏛️ Historical",
      museum: t("categories.museum"),
      cafe: t("categories.cafe"),
      hotel: t("categories.hotel"),
      restaurant: t("categories.restaurant"),
      attraction: t("categories.attraction"),
    };
    return map[key] || subcategory;
  };

  const shouldShowPrice =
    place?.price_level &&
    place.price_level !== "unknown" &&
    place.price_level !== "UNKNOWN";

  if (!place) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const hasWebMentions = !!(
    insightData?.web_mentions && insightData.web_mentions.length > 0
  );
  const hasLocalReviews = !!(place.reviews && place.reviews.length > 0);
  const hasAiAnalysis = !!(analysis?.keywords && analysis.keywords.length > 0);
  const hasAiSummary = !!(
    summary?.summary &&
    typeof summary.summary === "string" &&
    summary.summary.trim() !== "" &&
    !summary.summary.toLowerCase().includes("no reviews") &&
    !summary.summary.toLowerCase().includes("yorum bulunamadı")
  );
  const hasGoogleReviews = !!(
    reviewsData &&
    reviewsData.found &&
    reviewsData.reviews &&
    reviewsData.reviews.length > 0
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      <View style={styles.heroWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {place.image ? (
          <Image source={{ uri: place.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>{t("common.noImage")}</Text>
          </View>
        )}

        {/* Maske geçişi yeni koyu temaya kusursuzca entegre edildi */}
        <LinearGradient
          colors={[
            "rgba(19,22,34,0.05)",
            "rgba(19,22,34,0.25)",
            "rgba(19,22,34,0.85)",
          ]}
          style={styles.imageOverlay}
        />

        <View style={styles.heroInfo}>
          <Text style={styles.title}>{place.name}</Text>
          <Text style={styles.heroMeta}>
            {place.city} • {subcategoryLabel(place.subcategory) || categoryLabel(place.category)}
          </Text>
        </View>

        <View style={styles.floatingActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.saveButton}
            onPress={savePlace}
          >
            <Ionicons name="heart-outline" size={18} color={COLORS.white} />
            <Text style={styles.saveButtonText}>
              {t("common.save") || "Kaydet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.mapButton}
            onPress={showOnMap}
          >
            <Ionicons name="map-outline" size={18} color={COLORS.text} />
            <Text style={styles.mapButtonText}>
              {t("common.showOnMap")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {!loadingInsight && insightData ? (
          <>
            <View style={styles.smartScoreBox}>
              <Text style={styles.smartScoreLabel}>{t("place.smartScore")}</Text>
              <Text style={styles.smartScoreValue}>
                ⭐ {insightData.smart_score ?? "-"} / 5
              </Text>
              {insightData.score_breakdown ? (
                <Text style={styles.smartScoreSub}>
                  Google: {insightData.score_breakdown.google_rating || 0} • Dataset:{" "}
                  {insightData.score_breakdown.dataset_rating || 0} • Reviews:{" "}
                  {insightData.score_breakdown.review_count || 0}
                </Text>
              ) : null}
            </View>

            {insightData.ai_insight ? (
              <View style={styles.insightBox}>
                <Text style={styles.mainInsightTitle}>{t("place.aiInsight")}</Text>
                <Text style={styles.insightSummary}>
                  {insightData.ai_insight.summary}
                </Text>

                {insightData.ai_insight.best_for?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.bestFor")}</Text>
                    {insightData.ai_insight.best_for.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {insightData.ai_insight.strengths?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.strengths")}</Text>
                    {insightData.ai_insight.strengths.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {insightData.ai_insight.watch_out?.length > 0 && (
                  <View style={styles.insightSection}>
                    <Text style={styles.insightLabel}>{t("place.watchOut")}</Text>
                    {insightData.ai_insight.watch_out.map(
                      (item: string, index: number) => (
                        <Text key={index} style={styles.insightBullet}>
                          • {item}
                        </Text>
                      )
                    )}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("place.datasetRating")}</Text>
            <Text style={styles.infoValue}>⭐ {place.rating}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("place.city")}</Text>
            <Text style={styles.infoValue}>{place.city}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("place.district")}</Text>
            <Text style={styles.infoValue}>
              {cleanDistrict(place.district) || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("place.category")}</Text>
            <Text style={styles.infoValue}>{categoryLabel(place.category)}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("place.subcategory")}</Text>
            <Text style={styles.infoValue}>
              {subcategoryLabel(place.subcategory) || "-"}
            </Text>
          </View>

          {shouldShowPrice && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("place.price")}</Text>
              <Text style={styles.infoValue}>{place.price_level}</Text>
            </View>
          )}

          <View style={styles.infoCardWide}>
            <Text style={styles.infoLabel}>{t("place.visitTime")}</Text>
            <Text style={styles.infoValue}>
              ⏱ {place.estimated_visit_time} min
            </Text>
          </View>
        </View>

        {reviewsData && reviewsData.found && (
          <View style={styles.ratingBox}>
            <Text style={styles.ratingTitle}>
              ⭐ {t("place.googleRating")}: {reviewsData.rating} / 5
            </Text>
            <Text style={styles.reviewCount}>
              {reviewsData.review_count} Google reviews
            </Text>
            {reviewsData.address ? (
              <Text style={styles.googleAddress}>{reviewsData.address}</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("place.description")}</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.description}>{place.description}</Text>
        </View>

        {hasGoogleReviews && (
          <>
            <View style={styles.reviewHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>{t("place.googleReviews")}</Text>
                <Text style={styles.reviewSectionSubtitle}>
                  {reviewsData.review_count} Google reviews • ⭐ {reviewsData.rating}
                </Text>
              </View>
            </View>

            {reviewsData.reviews.slice(0, 3).map((review: any, index: number) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {(review.author || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text style={styles.reviewTime}>
                      ⭐ {review.rating} {review.publish_time ? `• ${review.publish_time}` : ""}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reviewText} numberOfLines={5}>
                  {review.text}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.moreReviewsButton}
              onPress={() =>
                openLink(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${place.name} ${place.city || ""}`
                  )}`
                )
              }
            >
              <Ionicons name="logo-google" size={18} color={COLORS.white} />
              <Text style={styles.moreReviewsButtonText}>
                Google Maps'te daha fazla yorum gör
              </Text>
            </TouchableOpacity>
          </>
        )}

        {hasWebMentions && (
          <>
            <Text style={styles.sectionTitle}>{t("place.webMentions")}</Text>
            {insightData.web_mentions.slice(0, 5).map((item: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.webCard}
                onPress={() => openLink(item.link)}
              >
                <Text style={styles.webTitle}>{item.title}</Text>
                <Text style={styles.webSnippet}>{item.snippet}</Text>
                <Text style={styles.webLink}>{item.displayLink}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {hasLocalReviews && (
          <>
            <Text style={styles.sectionTitle}>{t("place.localReviews")}</Text>
            <View style={styles.sectionCard}>
              {place.reviews.map((review: string, index: number) => (
                <Text key={index} style={styles.review}>
                  • {review}
                </Text>
              ))}
            </View>
          </>
        )}

        {hasAiAnalysis && (
          <>
            <Text style={styles.sectionTitle}>{t("place.aiAnalysis")}</Text>
            <View style={styles.keywordContainer}>
              {analysis.keywords.map((keyword: string, index: number) => (
                <Text key={index} style={styles.keyword}>
                  {keyword}
                </Text>
              ))}
            </View>
          </>
        )}

        {hasAiSummary && (
          <>
            <Text style={styles.sectionTitle}>{t("place.aiSummary")}</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.description}>{summary.summary}</Text>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },

  heroWrap: {
    position: "relative",
    margin: 18,
    marginBottom: 0,
    paddingBottom: 34,
  },

  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 3,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(28, 31, 48, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  image: {
    width: "100%",
    height: 280,
    borderRadius: 24,
  },

  imagePlaceholder: {
    width: "100%",
    height: 280,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 280,
    borderRadius: 24,
  },

  placeholderText: {
    color: COLORS.textSoft,
    fontSize: 16,
  },

  heroInfo: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 56,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  heroMeta: {
    fontSize: 15,
    color: "rgba(255,255,255,0.90)",
    fontWeight: "500",
  },

  floatingActions: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    flexDirection: "row",
    zIndex: 4,
  },

  saveButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 10,
    gap: 8,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  mapButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  mapButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  smartScoreBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },

  smartScoreLabel: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  smartScoreValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },

  smartScoreSub: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },

  insightBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  mainInsightTitle: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  insightSummary: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },

  insightSection: {
    marginTop: 8,
  },

  insightLabel: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  insightBullet: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 8,
  },

  infoCard: {
    width: "48.5%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  infoCardWide: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontWeight: "700",
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "700",
  },

  ratingBox: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  ratingTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },

  reviewCount: {
    color: COLORS.textSoft,
    marginTop: 4,
    fontSize: 14,
  },

  googleAddress: {
    color: COLORS.textSoft,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 10,
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSoft,
  },

  review: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
    color: COLORS.textSoft,
  },

  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  keyword: {
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  reviewCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  reviewAuthor: {
    color: COLORS.accent,
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 15,
  },

  reviewText: {
    color: COLORS.textSoft,
    lineHeight: 22,
    fontSize: 14,
  },

  reviewTime: {
    color: COLORS.textSoft,
    marginTop: 8,
    fontSize: 12,
  },

  webCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  webTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  webSnippet: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  webLink: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  reviewHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
  },

  reviewSectionSubtitle: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -4,
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  reviewAvatarText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "700",
  },

  moreReviewsButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
  },

  moreReviewsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});