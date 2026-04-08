import React from "react";
import { Tabs } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

export default function Layout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#9BE000",
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarStyle: {
          backgroundColor: "#111",
          borderTopColor: "#222",
          height: 82,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="compass" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.explore"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: t("tabs.map"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="map-pin" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: t("tabs.favorites"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}