import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLanguage } from "../../context/LanguageContext";

export default function Profile() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      <Text style={styles.section}>{t("settings.language")}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, language === "tr" && styles.active]}
          onPress={() => setLanguage("tr")}
        >
          <Text style={[styles.text, language === "tr" && styles.activeText]}>
            🇹🇷 Türkçe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, language === "en" && styles.active]}
          onPress={() => setLanguage("en")}
        >
          <Text style={[styles.text, language === "en" && styles.activeText]}>
            🇬🇧 English
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, language === "de" && styles.active]}
          onPress={() => setLanguage("de")}
        >
          <Text style={[styles.text, language === "de" && styles.activeText]}>
            🇩🇪 Deutsch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, language === "ru" && styles.active]}
          onPress={() => setLanguage("ru")}
        >
          <Text style={[styles.text, language === "ru" && styles.activeText]}>
            🇷🇺 Русский
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    padding: 20,
    paddingTop: 60,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 30,
  },

  section: {
    color: "#9BE000",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    marginBottom: 12,
  },

  button: {
    flex: 1,
    backgroundColor: "#171717",
    paddingVertical: 14,
    borderRadius: 16,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  active: {
    backgroundColor: "#9BE000",
    borderColor: "#9BE000",
  },

  text: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  activeText: {
    color: "#111",
  },
});