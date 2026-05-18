import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

// 🌉 BOĞAZIN KIZILI & SİSLİ GECE TAB BAR RENKLERİ
const COLORS = {
  surface: "#1C1F30",     // Home ekranındaki kart yüzeyi ile birebir aynı (Gece Mavisi)
  border: "rgba(255, 255, 255, 0.04)", // Çok hafif puslu şeffaf sınır çizgisi
  active: "#D65A5A",      // 🎯 O asil köprü kırmızısı (Aktif ikon ve yazı rengi)
  activeBg: "rgba(214, 90, 90, 0.14)", // Aktif olan ikonun arkasındaki soft kızıl parlama
  inactive: "#8E95B2",    // Sis bulutlarının puslu grisi (İnaktif ögeler)
  shadow: "#090A10",      // Derin gölge tonu
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
    labelKey: "",
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
    labelKey: "tabs.settings",
    fallback: "Settings",
    icons: ["settings-outline", "settings"],
  },
] as const;

function CustomTabBar({ state, navigation }: any) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any) => {
          const index = TAB_CONFIG.findIndex((item) => item.name === route.name);
          const config = TAB_CONFIG[index];

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
          const label = config.labelKey ? t(config.labelKey) : config.fallback;

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
                  size={19}
                  color={isFocused ? COLORS.active : COLORS.inactive}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
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

export default function Layout() {
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
    bottom: 14,
  },

  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
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

  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  labelActive: {
    color: COLORS.active,
  },

  labelInactive: {
    color: COLORS.inactive,
  },
});