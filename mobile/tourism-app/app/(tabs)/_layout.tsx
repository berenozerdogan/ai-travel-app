import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  border: "#E8E0D1",
  active: "#B8CC2A",
  activeDark: "#28310F",
  inactive: "#8B8A7C",
  text: "#1E2418",
  shadow: "#9E9688",
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { t } = useLanguage();

  const labels = [
    t("tabs.home"),
    t("tabs.explore"),
    t("tabs.map"),
    t("tabs.favorites"),
    t("tabs.chat"),
    t("tabs.settings"),
  ];

  const icons = [
    ["compass-outline", "compass"],
    ["search-outline", "search"],
    ["map-outline", "map"],
    ["heart-outline", "heart"],
    ["chatbubble-ellipses-outline", "chatbubble-ellipses"],
    ["settings-outline", "settings"],
  ] as const;

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

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

          const [outlineIcon, filledIcon] = icons[index];
          const iconName = isFocused ? filledIcon : outlineIcon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.9}
              style={styles.tabItem}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName as any}
                  size={22}
                  color={isFocused ? COLORS.activeDark : COLORS.inactive}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
              >
                {labels[index]}
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
    left: 14,
    right: 14,
    bottom: 14,
  },

  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  iconWrapActive: {
    backgroundColor: COLORS.active,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
  },

  labelActive: {
    color: COLORS.activeDark,
  },

  labelInactive: {
    color: COLORS.inactive,
  },
});