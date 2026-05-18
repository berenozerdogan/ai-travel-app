import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE PROFILE/SETTINGS RENKLERİ
const COLORS = {
  bg: "#131622",          // Derin, puslu gece denizi rengi
  surface: "#1C1F30",     // Gece mavisi-gri asil kart yüzeyi
  surfaceSoft: "#272B42", // Dil butonlarının inaktif zemin teli
  border: "rgba(255, 255, 255, 0.03)",
  text: "#F1F3F9",        // Kirli beyaz metinler
  textSoft: "#8E95B2",    // Sis bulutlarının puslu grisi
  accent: "#D65A5A",      // O büyüleyici köprü kırmızısı (Muted Crimson)
  white: "#FFFFFF",
  shadow: "#090A10",
};

export default function Profile() {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { key: "tr", label: "🇹🇷 Türkçe" },
    { key: "en", label: "🇬🇧 English" },
    { key: "de", label: "🇩🇪 Deutsch" },
    { key: "ru", label: "🇷🇺 Русский" },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* 🌅 TÜM SEKELERLE UYUMLU ASİL KOYU GRADYAN BAŞLIK ALANI */}
      <LinearGradient
        colors={["#1C1F30", "#161826", "#131622"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.title}>{t("settings.title")}</Text>
        <Text style={styles.subtitle}>
          Choose your preferred app language.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.sectionCard}>
          <Text style={styles.section}>{t("settings.language")}</Text>

          <View style={styles.grid}>
            {languages.map((item) => {
              const isActive = language === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.button, isActive && styles.active]}
                  onPress={() => setLanguage(item.key as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.buttonTop}>
                    <Text style={[styles.text, isActive && styles.activeText]}>
                      {item.label}
                    </Text>

                    {isActive && (
                      <View style={styles.checkWrap}>
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={COLORS.white}
                        />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.helperText,
                      isActive && styles.activeHelperText,
                    ]}
                  >
                    {isActive ? "Selected" : "Tap to switch"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.footerText}>
          Your language choice updates the app experience and AI responses.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  hero: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    lineHeight: 22,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  section: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  grid: {
    gap: 12,
  },

  button: {
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  active: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  buttonTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  checkWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  text: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },

  activeText: {
    color: COLORS.white,
    fontWeight: "700",
  },

  helperText: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 8,
  },

  activeHelperText: {
    color: "rgba(255,255,255,0.8)",
  },

  footerText: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 12,
  },
});