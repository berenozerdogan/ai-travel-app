import React, { useRef, useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { useChat, ChatMessage } from "../../context/ChatContext";

type DayPlan = {
  day: number;
  places: string[];
};

type LocalUser = {
  uid: string;
  email: string | null;
} | null;

type SavedChat = {
  id: string;
  message: string;
  reply: string;
  places?: string[];
  days?: DayPlan[];
};

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  surfaceSoft: "#EFE7D8",
  surfaceMuted: "#E9E1D2",
  text: "#1E2418",
  textSoft: "#5F6656",
  accent: "#B8CC2A",
  accentDark: "#28310F",
  white: "#FFFFFF",
  shadow: "#9E9688",
  overlay: "rgba(30,36,24,0.28)",
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
    resetChats,
  } = useChat();

  const messages = activeChat?.messages ?? [];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [user, setUser] = useState<LocalUser>(null);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const listRef = useRef<FlatList<any>>(null);

  const quickPrompts = [
    t("chat.quick1"),
    t("chat.quick2"),
    t("chat.quick3"),
    t("chat.quick4"),
  ];

  useEffect(() => {
    if (!activeChatId) {
      createNewChat(t("chat.welcome"));
    }
  }, [activeChatId, t, createNewChat]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
        setSavedChats([]);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) {
      setSavedChats([]);
      return;
    }

    const q = query(
      collection(db, "users", auth.currentUser.uid, "chats"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SavedChat[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            message: data.message || "",
            reply: data.reply || "",
            places: data.places || [],
            days: data.days || [],
          };
        });

        setSavedChats(items);
      },
      (error) => {
        console.log("FIRESTORE ERROR:", error);
      }
    );

    return unsubscribe;
  }, [user]);

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

  const openSavedChat = (chat: SavedChat) => {
    const loadedMessages: ChatMessage[] = [
      {
        id: `welcome_${chat.id}`,
        text: t("chat.welcome"),
        sender: "ai",
        places: [],
        days: [],
      },
      {
        id: `${chat.id}_user`,
        text: chat.message,
        sender: "user",
      },
      {
        id: `${chat.id}_ai`,
        text: chat.reply,
        sender: "ai",
        places: chat.places || [],
        days: chat.days || [],
      },
    ];

    loadChatSession({
      id: chat.id,
      title: chat.message || t("chat.untitledChat"),
      createdAt: Date.now(),
      messages: loadedMessages,
    });

    setMenuVisible(false);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 100);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("logged_user");
      setUser(null);
      setSavedChats([]);
      resetChats();
      setMenuVisible(false);
      router.replace("/(tabs)/chat");
    } catch (error) {
      console.log(error);
    }
  };

  const showRoute = async (places: string[]) => {
    try {
      if (!places || places.length === 0) return;

      const res = await fetch("http://192.168.1.102:8000/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ places }),
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
      const res = await fetch("http://192.168.1.102:8000/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalText,
          language: language,
        }),
      });

      const data = await res.json();

      if (auth.currentUser?.uid) {
        await addDoc(collection(db, "users", auth.currentUser.uid, "chats"), {
          message: finalText,
          reply: data.reply || "",
          places: data.places || [],
          days: data.days || [],
          language,
          createdAt: serverTimestamp(),
        });
      }

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
            {item.days!.map((dayItem, dayIndex) => (
              <View key={dayIndex} style={styles.dayCard}>
                <Text style={styles.dayTitle}>
                  {t("chat.day")} {dayItem.day}
                </Text>

                <View style={styles.chipsWrap}>
                  {dayItem.places.map((place, index) => (
                    <TouchableOpacity
                      key={`${place}-${index}`}
                      style={styles.placeChip}
                      onPress={() => router.push(`/place?name=${place}`)}
                    >
                      <Text style={styles.placeChipText}>{place}</Text>
                    </TouchableOpacity>
                  ))}
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
            <View style={styles.chipsWrap}>
              {item.places!.map((place, index) => (
                <TouchableOpacity
                  key={`${place}-${index}`}
                  style={styles.placeChip}
                  onPress={() => router.push(`/place?name=${place}`)}
                >
                  <Text style={styles.placeChipText}>{place}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
            <Text style={styles.sideMenuTitle}>{t("chat.chats")}</Text>

            <TouchableOpacity style={styles.sideNewChat} onPress={newChat}>
              <Ionicons name="add-outline" size={18} color={COLORS.text} />
              <Text style={styles.sideNewChatText}>{t("chat.newChat")}</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {chats.length > 0 &&
                chats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => openLocalChat(chat.id)}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={COLORS.accentDark}
                    />
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {chat.title || t("chat.untitledChat")}
                    </Text>
                  </TouchableOpacity>
                ))}

              {savedChats.length > 0 &&
                savedChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => openSavedChat(chat)}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={COLORS.accentDark}
                    />
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {chat.message || t("chat.untitledChat")}
                    </Text>
                  </TouchableOpacity>
                ))}

              {chats.length === 0 && savedChats.length === 0 && (
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
          colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
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
              <Ionicons
                name="add-outline"
                size={16}
                color={COLORS.accentDark}
              />
              <Text style={styles.newChatButtonText}>{t("chat.newChat")}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t("chat.title")}</Text>
          <Text style={styles.subtitle}>{t("chat.subtitle")}</Text>

          <View style={styles.authButtonsRow}>
            {!user ? (
              <>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push("/login" as any)}
                >
                  <Text style={styles.loginButtonText}>{t("chat.login")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => router.push("/register" as any)}
                >
                  <Text style={styles.registerButtonText}>
                    {t("chat.register")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>{t("chat.logout")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.userStatus}>
            {user
              ? `${t("chat.loggedIn")}: ${user.email}`
              : t("chat.notLoggedIn")}
          </Text>
        </LinearGradient>

        <View style={styles.quickRow}>
          {quickPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickChip}
              onPress={() => sendMessage(prompt)}
            >
              <Text style={styles.quickChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
            placeholderTextColor="#7D806F"
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
            <Ionicons name="arrow-up" size={20} color={COLORS.text} />
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
    borderLeftColor: "#EEE7D8",
  },

  sideMenuTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
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
    color: COLORS.text,
    fontWeight: "800",
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
    borderColor: "#ECE4D5",
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
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,241,231,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
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
    color: COLORS.accentDark,
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  authButtonsRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  loginButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
  },

  loginButtonText: {
    color: COLORS.accentDark,
    fontWeight: "800",
    fontSize: 14,
  },

  registerButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9E0D1",
  },

  registerButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },

  logoutButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9E0D1",
  },

  logoutButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },

  userStatus: {
    color: COLORS.textSoft,
    marginTop: 10,
    fontSize: 13,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: COLORS.bg,
  },

  quickChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#EBE3D4",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
  },

  quickChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  messagesContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
  },

  messageBlock: {
    marginBottom: 12,
  },

  messageBubble: {
    maxWidth: "84%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 6,
  },

  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#E9E0D1",
  },

  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },

  userText: {
    color: COLORS.text,
    fontWeight: "700",
  },

  aiText: {
    color: COLORS.text,
  },

  dayPlansContainer: {
    marginTop: 8,
  },

  dayCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#E9E0D1",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },

  dayTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },

  placeChip: {
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
  },

  placeChipText: {
    color: COLORS.accentDark,
    fontSize: 14,
    fontWeight: "700",
  },

  routeButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  routeButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  loadingBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E9E0D1",
  },

  loadingText: {
    color: COLORS.textSoft,
    fontSize: 14,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    marginBottom:50,
    borderTopWidth: 1,
    borderTopColor: "#E7DECF",
    backgroundColor: COLORS.bg,
  },

  input: {
    flex: 1,
    minHeight: 58,
    maxHeight: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: COLORS.text,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E9E0D1",
  },

  sendButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },

  sendDisabled: {
    opacity: 0.7,
  },

  sendButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
});