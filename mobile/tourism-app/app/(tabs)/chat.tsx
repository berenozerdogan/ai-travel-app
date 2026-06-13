import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { useChat, ChatMessage } from "../../context/ChatContext";

type DayPlan = {
  day: number;
  places: string[];
};

const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31,41,55,0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.25)",
  shadow: "#D6CEC2",
};


const CHAT_FALLBACKS: Record<string, Record<string, string>> = {
  "chat.title": {
    tr: "AI Rehber",
    en: "AI Guide",
    de: "AI Reiseführer",
    ru: "AI Гид",
  },
  "chat.subtitle": {
    tr: "Türkiye genelinde gezileri; gezilecek yerler, oteller ve restoranlarla planla.",
    en: "Plan trips across Turkey with attractions, hotels and restaurants.",
    de: "Plane Reisen in der Türkei mit Sehenswürdigkeiten, Hotels und Restaurants.",
    ru: "Планируй поездки по Турции с достопримечательностями, отелями и ресторанами.",
  },
  "chat.welcome": {
    tr: "Merhaba! Ben Türkiye için AI seyahat asistanınım. Bana şehir planları, oteller, restoranlar, rotalar veya gezilecek yerler sorabilirsin.",
    en: "Hi! I’m your AI travel assistant for Turkey. Ask me for city plans, hotels, restaurants, routes or attractions.",
    de: "Hallo! Ich bin dein AI-Reiseassistent für die Türkei. Frag mich nach Stadtplänen, Hotels, Restaurants, Routen oder Sehenswürdigkeiten.",
    ru: "Привет! Я твой AI-помощник по путешествиям в Турции. Спроси меня о планах городов, отелях, ресторанах, маршрутах или достопримечательностях.",
  },
  "chat.chats": {
    tr: "Sohbetler",
    en: "Chats",
    de: "Chats",
    ru: "Чаты",
  },
  "chat.newChat": {
    tr: "Yeni Sohbet",
    en: "New Chat",
    de: "Neuer Chat",
    ru: "Новый чат",
  },
  "chat.untitledChat": {
    tr: "Başlıksız sohbet",
    en: "Untitled chat",
    de: "Unbenannter Chat",
    ru: "Без названия",
  },
  "chat.noSavedChats": {
    tr: "Henüz kayıtlı sohbet yok.",
    en: "No saved chats yet.",
    de: "Noch keine gespeicherten Chats.",
    ru: "Пока нет сохранённых чатов.",
  },
  "chat.thinking": {
    tr: "AI düşünüyor...",
    en: "AI is thinking...",
    de: "AI denkt nach...",
    ru: "AI думает...",
  },
  "chat.askPlaceholder": {
    tr: "Seyahat asistanına sor...",
    en: "Ask travel assistant...",
    de: "Frag den Reiseassistenten...",
    ru: "Спроси помощника...",
  },
  "chat.serverError": {
    tr: "Üzgünüm, sunucuya bağlanamadım.",
    en: "Sorry, I could not connect to the server.",
    de: "Entschuldigung, ich konnte keine Verbindung zum Server herstellen.",
    ru: "Извините, не удалось подключиться к серверу.",
  },
  "chat.somethingWrong": {
    tr: "Bir şeyler ters gitti.",
    en: "Something went wrong.",
    de: "Etwas ist schiefgelaufen.",
    ru: "Что-то пошло не так.",
  },
  "chat.day": {
    tr: "Gün",
    en: "Day",
    de: "Tag",
    ru: "День",
  },
  "chat.showDayRoute": {
    tr: "Günün Rotasını Göster",
    en: "Show Day Route",
    de: "Tagesroute anzeigen",
    ru: "Показать маршрут дня",
  },
  "chat.showRoute": {
    tr: "Rotayı Göster",
    en: "Show Route",
    de: "Route anzeigen",
    ru: "Показать маршрут",
  },
  "chat.showFullRoute": {
    tr: "Tüm Rotayı Haritada Aç",
    en: "Open Full Route on Map",
    de: "Gesamte Route auf Karte öffnen",
    ru: "Открыть весь маршрут на карте",
  },
  "common.showOnMap": {
    tr: "Haritada Göster",
    en: "Show on Map",
    de: "Auf Karte anzeigen",
    ru: "Показать на карте",
  },
};

function safeT(
  t: (key: string) => string,
  key: string,
  fallback: string,
  language: string
) {
  const value = t(key);
  if (value && value !== key) return value;

  const lang = String(language || "en").toLowerCase();
  return CHAT_FALLBACKS[key]?.[lang] || CHAT_FALLBACKS[key]?.en || fallback;
}

export default function Chat() {
  const params = useLocalSearchParams();
  const { t, language } = useLanguage();

  const {
    chats,
    activeChat,
    activeChatId,
    createNewChat,
    appendMessageToChat,
    loadChatSession,
  } = useChat();

  const messages = activeChat?.messages ?? [];
  const welcomeText = safeT(t, "chat.welcome", "Merhaba! Ben Türkiye için AI seyahat asistanınım. Bana şehir planları, oteller, restoranlar, rotalar veya gezilecek yerler sorabilirsin.", language);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (!activeChatId) {
      createNewChat(welcomeText);
    }
  }, [activeChatId, welcomeText, createNewChat]);


  useEffect(() => {
    const onlyWelcome =
      messages.length <= 1 &&
      (!messages[0] || messages[0].sender === "ai");

    if (activeChatId && onlyWelcome) {
      createNewChat(welcomeText);
      setInput("");
      setLoading(false);
      setHasAutoSent(false);
    }
  }, [language]);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const newChat = () => {
    createNewChat(welcomeText);
    setInput("");
    setLoading(false);
    setHasAutoSent(false);
    setMenuVisible(false);
    router.replace("/(tabs)/chat");
  };

  const openLocalChat = (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;

    loadChatSession(chat);
    setMenuVisible(false);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  const showRoute = async (places: string[]) => {
    try {
      if (!places || places.length === 0) return;

      const res = await fetch("http://10.0.2.2:8000/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ places, language }),
      });

      const data = await res.json();

      router.push({
        pathname: "/(tabs)/map",
        params: {
          route: JSON.stringify(data.route || []),
        },
      });
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = async (customText?: string) => {
    const finalText = (customText ?? input).trim();
    if (!finalText || loading || !activeChatId) return;

    const currentChatId = activeChatId;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: finalText,
      sender: "user",
    };

    appendMessageToChat(currentChatId, userMessage);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("http://10.0.2.2:8000/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalText,
          language,
        }),
      });

      const data = await res.json();

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + "_ai",
        text: data.reply || safeT(t, "chat.somethingWrong", "Bir şeyler ters gitti.", language),
        sender: "ai",
        places: data.places || [],
        days: data.days || [],
      };

      appendMessageToChat(currentChatId, aiMessage);
    } catch (err) {
      console.log(err);

      appendMessageToChat(currentChatId, {
        id: Date.now().toString() + "_error",
        text: safeT(t, "chat.serverError", "Üzgünüm, sunucuya bağlanamadım.", language),
        sender: "ai",
        places: [],
        days: [],
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (
      typeof params.prompt === "string" &&
      params.prompt.trim() &&
      !hasAutoSent &&
      activeChatId
    ) {
      setHasAutoSent(true);
      sendMessage(params.prompt);
    }
  }, [params.prompt, hasAutoSent, activeChatId]);

  const renderPlaceChip = (place: string, index: number) => (
    <TouchableOpacity
      key={`${place}-${index}`}
      style={styles.placeChip}
      onPress={() =>
        router.push({
          pathname: "/place",
          params: { name: place },
        })
      }
    >
      <Text style={styles.placeChipText}>{place}</Text>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const hasDays = item.sender === "ai" && item.days && item.days.length > 0;
    const hasFlatPlaces =
      item.sender === "ai" &&
      (!item.days || item.days.length === 0) &&
      item.places &&
      item.places.length > 0;

    const fullRoutePlaces =
      hasDays && item.days
        ? item.days.flatMap((dayItem: DayPlan) => dayItem.places || [])
        : [];

    return (
      <View style={styles.messageBlock}>
        <View
          style={[
            styles.messageBubble,
            item.sender === "user" ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.sender === "user" ? styles.userText : styles.aiText,
            ]}
          >
            {item.text}
          </Text>
        </View>

        {hasDays && (
          <View style={styles.dayPlansContainer}>
            {item.days!.map((dayItem: DayPlan, dayIndex: number) => (
              <View key={dayIndex} style={styles.dayCard}>
                <Text style={styles.dayTitle}>
                  {safeT(t, "chat.day", "Gün", language)} {dayItem.day}
                </Text>

                <View style={styles.chipsWrap}>
                  {dayItem.places.map(renderPlaceChip)}
                </View>

                {dayItem.places.length > 0 && (
                  <TouchableOpacity
                    style={styles.routeButton}
                    onPress={() => showRoute(dayItem.places)}
                  >
                    <Text style={styles.routeButtonText}>
                      {dayItem.places.length === 1
                        ? safeT(t, "common.showOnMap", "Haritada Göster", language)
                        : safeT(t, "chat.showDayRoute", "Günün Rotasını Göster", language)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {fullRoutePlaces.length > 1 && (
              <TouchableOpacity
                style={styles.fullRouteButton}
                onPress={() => showRoute(fullRoutePlaces)}
              >
                <Ionicons name="map-outline" size={17} color={COLORS.white} />
                <Text style={styles.fullRouteButtonText}>
                  {safeT(t, "chat.showFullRoute", "Tüm Rotayı Haritada Aç", language)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasFlatPlaces && (
          <>
            <View style={styles.chipsWrap}>{item.places!.map(renderPlaceChip)}</View>

            {item.places && item.places.length > 0 && (
              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => showRoute(item.places!)}
              >
                <Text style={styles.routeButtonText}>
                  {item.places.length === 1
                    ? safeT(t, "common.showOnMap", "Haritada Göster", language)
                    : safeT(t, "chat.showRoute", "Rotayı Göster", language)}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          />

          <View style={styles.sideMenu}>
            <Text style={styles.sideMenuTitle}>{safeT(t, "chat.chats", "Sohbetler", language)}</Text>

            <TouchableOpacity style={styles.sideNewChat} onPress={newChat}>
              <Ionicons name="add-outline" size={18} color={COLORS.white} />
              <Text style={styles.sideNewChatText}>{safeT(t, "chat.newChat", "Yeni Sohbet", language)}</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {chats.length > 0 ? (
                chats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => openLocalChat(chat.id)}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={COLORS.accent}
                    />
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {chat.title || safeT(t, "chat.untitledChat", "Başlıksız sohbet", language)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyHistory}>{safeT(t, "chat.noSavedChats", "Henüz kayıtlı sohbet yok.", language)}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <LinearGradient
          colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="menu-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.newChatButton} onPress={newChat}>
              <Ionicons name="add-outline" size={16} color={COLORS.white} />
              <Text style={styles.newChatButtonText}>{safeT(t, "chat.newChat", "Yeni Sohbet", language)}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{safeT(t, "chat.title", "AI Rehber", language)}</Text>
          <Text style={styles.subtitle}>{safeT(t, "chat.subtitle", "Türkiye genelinde gezileri; gezilecek yerler, oteller ve restoranlarla planla.", language)}</Text>
        </LinearGradient>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={scrollToBottom}
          renderItem={renderMessage}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBubble}>
                <Text style={styles.loadingText}>{safeT(t, "chat.thinking", "AI düşünüyor...", language)}</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={safeT(t, "chat.askPlaceholder", "Seyahat asistanına sor...", language)}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendDisabled]}
            onPress={() => sendMessage()}
            disabled={loading}
          >
            <Ionicons name="arrow-up" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  menuOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.overlay,
  },

  menuBackdrop: {
    flex: 1,
  },

  sideMenu: {
    width: 300,
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 0 },
    elevation: 12,
  },

  sideMenuTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },

  sideNewChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  },

  sideNewChatText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },

  emptyHistory: {
    color: COLORS.textSoft,
    fontSize: 14,
    marginTop: 10,
  },

  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  historyItemText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },

  newChatButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 120,
  },

  messageBlock: {
    marginBottom: 14,
  },

  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 6,
  },

  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  userText: {
    color: COLORS.white,
    fontWeight: "600",
  },

  aiText: {
    color: COLORS.text,
  },

  dayPlansContainer: {
    marginTop: 10,
  },

  dayCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  dayTitle: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  placeChip: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  placeChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  routeButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    marginTop: 8,
  },

  routeButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  fullRouteButton: {
    alignSelf: "stretch",
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  fullRouteButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  loadingBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  loadingText: {
    color: COLORS.textSoft,
    fontSize: 14,
  },

  inputBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 74,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  input: {
    flex: 1,
    maxHeight: 110,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendDisabled: {
    opacity: 0.55,
  },
});
