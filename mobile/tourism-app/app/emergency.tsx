import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../context/LanguageContext";

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

export default function Emergency() {
  const { t } = useLanguage();

  const items = [
    { title: t("emergency.emergencyCall"), desc: t("emergency.emergencyDesc"), icon: "call-outline", action: "tel:112" },
    { title: t("emergency.hospitals"), desc: t("emergency.hospitalsDesc"), icon: "medkit-outline", action: "https://www.google.com/maps/search/hospital+near+me" },
    { title: t("emergency.pharmacies"), desc: t("emergency.pharmaciesDesc"), icon: "medical-outline", action: "https://www.google.com/maps/search/pharmacy+near+me" },
    { title: t("emergency.police"), desc: t("emergency.policeDesc"), icon: "shield-checkmark-outline", action: "https://www.google.com/maps/search/police+station+near+me" },
    { title: t("emergency.transport"), desc: t("emergency.transportDesc"), icon: "bus-outline", action: "https://www.google.com/maps/search/public+transport+near+me" },
  ];

  const open = (url: string) => Linking.openURL(url).catch(console.log);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{t("emergency.title")}</Text>
        <Text style={styles.subtitle}>{t("emergency.subtitle")}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.card}
            onPress={() => open(item.action)}
            activeOpacity={0.88}
          >
            <View style={styles.iconBox}>
              <Ionicons name={item.icon as any} size={22} color={COLORS.accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={COLORS.textSoft} />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  content: {
    flex: 1,
    padding: 18,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  cardDesc: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});