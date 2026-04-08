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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../context/LanguageContext";

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

    fetch(`http://192.168.1.101:8000/places/${encodedName}`)
      .then((res) => res.json())
      .then((data) => setPlace(data))
      .catch((err) => console.log(err));

    fetch(`http://192.168.1.101:8000/analyze/${encodedName}`)
      .then((res) => res.json())
      .then((data) => setAnalysis(data))
      .catch((err) => console.log(err));

    fetch(
      `http://192.168.1.101:8000/summary/${encodedName}?language=${encodeURIComponent(
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
      `http://192.168.1.101:8000/reviews?place=${encodeURIComponent(
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
      `http://192.168.1.101:8000/place-insight?place=${encodeURIComponent(
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

  if (!place) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "white" }}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>{t("place.back")}</Text>
      </TouchableOpacity>

      {place.image ? (
        <Image source={{ uri: place.image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>{t("common.noImage")}</Text>
        </View>
      )}

      <Text style={styles.title}>{place.name}</Text>

      <TouchableOpacity style={styles.saveButton} onPress={savePlace}>
        <Text style={styles.saveButtonText}>{t("common.save")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mapButton} onPress={showOnMap}>
        <Text style={styles.mapButtonText}>{t("common.showOnMap")}</Text>
      </TouchableOpacity>

      {loadingInsight ? (
        <Text style={styles.emptyText}>{t("place.smartInsight")}</Text>
      ) : insightData ? (
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

      <Text style={styles.info}>⭐ {t("place.datasetRating")}: {place.rating}</Text>
      <Text style={styles.info}>🏙 {t("place.city")}: {place.city}</Text>
      <Text style={styles.info}>📍 {t("place.district")}: {place.district}</Text>
      <Text style={styles.info}>🏛 {t("place.category")}: {place.category}</Text>
      <Text style={styles.info}>🏷 {t("place.subcategory")}: {place.subcategory}</Text>
      <Text style={styles.info}>💰 {t("place.price")}: {place.price_level}</Text>
      <Text style={styles.info}>
        ⏱ {t("place.visitTime")}: {place.estimated_visit_time} min
      </Text>

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
      <Text style={styles.description}>{place.description}</Text>

      <Text style={styles.sectionTitle}>{t("place.googleReviews")}</Text>
      {loadingReviews ? (
        <Text style={styles.emptyText}>{t("place.loadingGoogleReviews")}</Text>
      ) : reviewsData && reviewsData.found && reviewsData.reviews?.length > 0 ? (
        reviewsData.reviews.slice(0, 3).map((review: any, index: number) => (
          <View key={index} style={styles.reviewCard}>
            <Text style={styles.reviewAuthor}>
              {review.author} ⭐{review.rating}
            </Text>
            <Text style={styles.reviewText}>{review.text}</Text>
            {review.publish_time ? (
              <Text style={styles.reviewTime}>{review.publish_time}</Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{t("place.noGoogleReviews")}</Text>
      )}

      <Text style={styles.sectionTitle}>{t("place.webMentions")}</Text>
      {loadingInsight ? (
        <Text style={styles.emptyText}>{t("place.loadingWebMentions")}</Text>
      ) : insightData?.web_mentions?.length > 0 ? (
        insightData.web_mentions.slice(0, 5).map((item: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={styles.webCard}
            onPress={() => openLink(item.link)}
          >
            <Text style={styles.webTitle}>{item.title}</Text>
            <Text style={styles.webSnippet}>{item.snippet}</Text>
            <Text style={styles.webLink}>{item.displayLink}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>{t("place.noWebMentions")}</Text>
      )}

      <Text style={styles.sectionTitle}>{t("place.localReviews")}</Text>
      {place.reviews?.length > 0 ? (
        place.reviews.map((review: string, index: number) => (
          <Text key={index} style={styles.review}>
            • {review}
          </Text>
        ))
      ) : (
        <Text style={styles.emptyText}>{t("place.noLocalReviews")}</Text>
      )}

      <Text style={styles.sectionTitle}>{t("place.aiAnalysis")}</Text>
      {analysis && analysis.keywords?.length > 0 ? (
        <View style={styles.keywordContainer}>
          {analysis.keywords.map((keyword: string, index: number) => (
            <Text key={index} style={styles.keyword}>
              {keyword}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{t("place.noAnalysis")}</Text>
      )}

      <Text style={styles.sectionTitle}>{t("place.aiSummary")}</Text>
      {summary ? (
        <Text style={styles.description}>{summary.summary}</Text>
      ) : (
        <Text style={styles.emptyText}>{t("place.loadingSummary")}</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0B0B0B",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0B",
  },

  back: {
    fontSize: 18,
    color: "#9BE000",
    marginBottom: 20,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
  },

  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    color: "#888",
    fontSize: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "white",
  },

  saveButton: {
    backgroundColor: "#9BE000",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  saveButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "bold",
  },

  mapButton: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  mapButtonText: {
    color: "#9BE000",
    fontSize: 16,
    fontWeight: "bold",
  },

  smartScoreBox: {
    backgroundColor: "#111A0B",
    borderWidth: 1,
    borderColor: "#2E4A16",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  smartScoreLabel: {
    color: "#9BE000",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },

  smartScoreValue: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },

  smartScoreSub: {
    color: "#C8D7BE",
    fontSize: 13,
    lineHeight: 20,
  },

  info: {
    fontSize: 17,
    marginBottom: 8,
    color: "#EAEAEA",
  },

  ratingBox: {
    backgroundColor: "#171717",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#222",
  },

  ratingTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

  reviewCount: {
    color: "#AAA",
    marginTop: 4,
    fontSize: 14,
  },

  googleAddress: {
    color: "#CFCFCF",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10,
    color: "white",
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#D5D5D5",
  },

  review: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
    color: "#D5D5D5",
  },

  emptyText: {
    color: "#999",
    fontSize: 15,
  },

  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  keyword: {
    backgroundColor: "#1E2B10",
    color: "#9BE000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 14,
  },

  reviewCard: {
    backgroundColor: "#151515",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },

  reviewAuthor: {
    color: "#9BE000",
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 15,
  },

  reviewText: {
    color: "#DDD",
    lineHeight: 22,
    fontSize: 14,
  },

  reviewTime: {
    color: "#888",
    marginTop: 8,
    fontSize: 12,
  },

  insightBox: {
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 8,
  },

  mainInsightTitle: {
    color: "#9BE000",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  insightSummary: {
    color: "#F2F2F2",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },

  insightSection: {
    marginTop: 8,
  },

  insightLabel: {
    color: "#9BE000",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  insightBullet: {
    color: "#D8D8D8",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  webCard: {
    backgroundColor: "#151515",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },

  webTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  webSnippet: {
    color: "#D0D0D0",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  webLink: {
    color: "#9BE000",
    fontSize: 13,
    fontWeight: "600",
  },
});