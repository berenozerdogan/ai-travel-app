import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  bg: "#F7F4EF",
  surface: "rgba(255, 255, 255, 0.96)",
  border: "rgba(31, 41, 55, 0.08)",
  active: "#E85D75",
  active2: "#7C3AED",
  activeBg: "rgba(232, 93, 117, 0.12)",
  inactive: "#7B8190",
  shadow: "#C9BFB3",
  white: "#FFFFFF",
  text: "#1F2937",
};

const TAB_CONFIG = [
  { name: "index", labelKey: "tabs.home", fallback: "Keşfet", icons: ["compass-outline", "compass"] },
  { name: "explore", labelKey: "tabs.explore", fallback: "Ara", icons: ["search-outline", "search"] },
  { name: "trip-planner", labelKey: "tabs.planner", fallback: "Planlayıcı", icons: ["sparkles-outline", "sparkles"] },
  { name: "map", labelKey: "tabs.map", fallback: "Harita", icons: ["map-outline", "map"] },
  { name: "saved", labelKey: "tabs.favorites", fallback: "Favoriler", icons: ["heart-outline", "heart"] },
  { name: "chat", labelKey: "tabs.chat", fallback: "AI Chat", icons: ["chatbubble-ellipses-outline", "chatbubble-ellipses"] },
  { name: "profile", labelKey: "tabs.profile", fallback: "Profil", icons: ["person-outline", "person"] },
] as const;

function CustomTabBar({ state, navigation }: any) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["rgba(255,255,255,0.98)", "rgba(247,244,239,0.94)"]}
        style={styles.glowBorder}
      >
        <View style={styles.tabBar}>
          {state.routes.map((route: any) => {
            const config = TAB_CONFIG.find((item) => item.name === route.name);
            if (!config) return null;

            const isFocused = state.routes[state.index].name === route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconName = isFocused ? config.icons[1] : config.icons[0];
            const translatedLabel = config.labelKey ? t(config.labelKey) : "";
            const label =
              translatedLabel && !translatedLabel.startsWith("tabs.")
                ? translatedLabel
                : config.fallback;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.86}
                style={styles.tabItem}
              >
                <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                  {isFocused ? (
                    <LinearGradient
                      colors={[COLORS.active, COLORS.active2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeGradient}
                    >
                      <Ionicons name={iconName as any} size={18} color={COLORS.white} />
                    </LinearGradient>
                  ) : (
                    <Ionicons name={iconName as any} size={19} color={COLORS.inactive} />
                  )}
                </View>

                <Text
                  style={[
                    styles.label,
                    isFocused ? styles.labelActive : styles.labelInactive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="trip-planner" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 12,
  },

  glowBorder: {
    borderRadius: 28,
    padding: 1,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 27,
    paddingHorizontal: 5,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 1,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  iconWrapActive: {
    backgroundColor: COLORS.activeBg,
  },

  activeGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },

  labelActive: {
    color: COLORS.active,
  },

  labelInactive: {
    color: COLORS.inactive,
  },
});