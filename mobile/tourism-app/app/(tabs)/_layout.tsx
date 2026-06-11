import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  surface: "#1C1F30",
  border: "rgba(255, 255, 255, 0.04)",
  active: "#D65A5A",
  activeBg: "rgba(214, 90, 90, 0.14)",
  inactive: "#8E95B2",
  shadow: "#090A10",
};

const TAB_CONFIG = [
  {
    name: "index",
    labelKey: "tabs.home",
    fallback: "Home",
    icons: ["compass-outline", "compass"],
  },
  {
    name: "explore",
    labelKey: "tabs.explore",
    fallback: "Explore",
    icons: ["search-outline", "search"],
  },
  {
    name: "trip-planner",
    labelKey: "tabs.planner",
    fallback: "Planner",
    icons: ["sparkles-outline", "sparkles"],
  },
  {
    name: "map",
    labelKey: "tabs.map",
    fallback: "Map",
    icons: ["map-outline", "map"],
  },
  {
    name: "saved",
    labelKey: "tabs.favorites",
    fallback: "Saved",
    icons: ["heart-outline", "heart"],
  },
  {
    name: "chat",
    labelKey: "tabs.chat",
    fallback: "Chat",
    icons: ["chatbubble-ellipses-outline", "chatbubble-ellipses"],
  },
  {
    name: "profile",
    labelKey: "tabs.profile",
    fallback: "Profile",
    icons: ["person-outline", "person"],
  },
] as const;

function CustomTabBar({ state, navigation }: any) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrapper}>
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

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
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
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.85}
              style={styles.tabItem}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName as any}
                  size={18}
                  color={isFocused ? COLORS.active : COLORS.inactive}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
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
    left: 8,
    right: 8,
    bottom: 12,
  },

  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 1,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },

  iconWrapActive: {
    backgroundColor: COLORS.activeBg,
  },

  label: {
    fontSize: 9,
    fontWeight: "700",
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
