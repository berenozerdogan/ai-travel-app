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
  bg: "#131622",
  surface: "#1C1F30",
  surfaceSoft: "#272B42",
  border: "rgba(255,255,255,0.04)",
  text: "#F1F3F9",
  textSoft: "#8E95B2",
  accent: "#D65A5A",
  white: "#FFFFFF",
  overlay: "rgba(9,10,16,0.65)",
};

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

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (!activeChatId) {
      createNewChat(t("chat.welcome"));
    }
  }, [activeChatId, t, createNewChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const newChat = () => {
    createNewChat(t("chat.welcome"));
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
        text: data.reply || t("chat.somethingWrong"),
        sender: "ai",
        places: data.places || [],
        days: data.days || [],
      };

      appendMessageToChat(currentChatId, aiMessage);
    } catch (err) {
      console.log(err);

      appendMessageToChat(currentChatId, {
        id: Date.now().toString() + "_error",
        text: t("chat.serverError"),
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
                  {t("chat.day")} {dayItem.day}
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
                        ? t("common.showOnMap")
                        : t("chat.showDayRoute")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
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
                    ? t("common.showOnMap")
                    : t("chat.showRoute")}
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
      <StatusBar barStyle="light-content" />

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
            <Text style={styles.sideMenuTitle}>{t("chat.chats")}</Text>

            <TouchableOpacity style={styles.sideNewChat} onPress={newChat}>
              <Ionicons name="add-outline" size={18} color={COLORS.white} />
              <Text style={styles.sideNewChatText}>{t("chat.newChat")}</Text>
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
                      {chat.title || t("chat.untitledChat")}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyHistory}>{t("chat.noSavedChats")}</Text>
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
          colors={["#1C1F30", "#161826", "#131622"]}
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
              <Text style={styles.newChatButtonText}>{t("chat.newChat")}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t("chat.title")}</Text>
          <Text style={styles.subtitle}>{t("chat.subtitle")}</Text>
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
                <Text style={styles.loadingText}>{t("chat.thinking")}</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t("chat.askPlaceholder")}
            placeholderTextColor="#5C627D"
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
    borderLeftColor: "rgba(255,255,255,0.02)",
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
  },

  subtitle: {
    color: "rgba(255,255,255,0.75)",
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
