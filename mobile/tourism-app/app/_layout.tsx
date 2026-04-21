import React from "react";
import { Stack } from "expo-router";
import { LanguageProvider } from "../context/LanguageContext";
import { ChatProvider } from "../context/ChatContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ChatProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ChatProvider>
    </LanguageProvider>
  );
}