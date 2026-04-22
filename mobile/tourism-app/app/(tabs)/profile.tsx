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
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
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
                  activeOpacity={0.9}
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
                          color={COLORS.accentDark}
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
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  subtitle: {
    color: COLORS.textSoft,
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  section: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },

  text: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },

  activeText: {
    color: COLORS.accentDark,
  },

  helperText: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 8,
  },

  activeHelperText: {
    color: "#4C5626",
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