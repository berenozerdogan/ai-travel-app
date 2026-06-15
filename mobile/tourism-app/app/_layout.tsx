import { Slot } from "expo-router";
import { LanguageProvider } from "../context/LanguageContext";
import AuthProvider from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ChatProvider>
          <Slot />
        </ChatProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}