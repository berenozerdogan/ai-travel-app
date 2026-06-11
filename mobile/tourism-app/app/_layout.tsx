import { Slot } from "expo-router";
import { LanguageProvider } from "../context/LanguageContext";
import { ChatProvider } from "../context/ChatContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ChatProvider>
        <Slot />
      </ChatProvider>
    </LanguageProvider>
  );
}
