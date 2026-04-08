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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { useLanguage } from "../../context/LanguageContext";

type DayPlan = {
  day: number;
  places: string[];
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  places?: string[];
  days?: DayPlan[];
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

export default function Chat() {
  const params = useLocalSearchParams();
  const { t, language } = useLanguage();

  const welcomeMessage: Message = {
    id: "welcome",
    text: t("chat.welcome"),
    sender: "ai",
    places: [],
    days: [],
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
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
    setMessages([welcomeMessage]);
  }, [language]);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("logged_user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setSavedChats([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "chats"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    });

    return unsubscribe;
  }, [user?.uid]);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const newChat = () => {
    const newWelcome: Message = {
      id: "welcome_" + Date.now(),
      text: t("chat.welcome"),
      sender: "ai",
      places: [],
      days: [],
    };

    setMessages([newWelcome]);
    setInput("");
    setLoading(false);
    setHasAutoSent(false);
    setMenuVisible(false);
    router.replace("/(tabs)/chat");
  };

  const openSavedChat = (chat: SavedChat) => {
    const loadedMessages: Message[] = [
      {
        id: "welcome_loaded",
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

    setMessages(loadedMessages);
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
      setMessages([
        {
          id: "welcome_logout",
          text: t("chat.welcome"),
          sender: "ai",
          places: [],
          days: [],
        },
      ]);
      setMenuVisible(false);
      router.replace("/(tabs)/chat");
    } catch (error) {
      console.log(error);
    }
  };

  const showRoute = async (places: string[]) => {
    try {
      if (!places || places.length === 0) return;

      const res = await fetch("http://192.168.1.101:8000/route", {
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
    if (!finalText || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: finalText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("http://192.168.1.101:8000/ai-chat", {
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

      if (user?.uid) {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          message: finalText,
          reply: data.reply || "",
          places: data.places || [],
          days: data.days || [],
          language,
          createdAt: serverTimestamp(),
        });
      }

      const aiMessage: Message = {
        id: Date.now().toString() + "_ai",
        text: data.reply || t("chat.somethingWrong"),
        sender: "ai",
        places: data.places || [],
        days: data.days || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.log(err);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_error",
          text: t("chat.serverError"),
          sender: "ai",
          places: [],
          days: [],
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (
      typeof params.prompt === "string" &&
      params.prompt.trim() &&
      !hasAutoSent
    ) {
      setHasAutoSent(true);
      sendMessage(params.prompt);
    }
  }, [params.prompt, hasAutoSent]);

  const renderMessage = ({ item }: { item: Message }) => {
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
              <Text style={styles.sideNewChatText}>{t("chat.newChat")}</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {savedChats.length === 0 ? (
                <Text style={styles.emptyHistory}>{t("chat.noSavedChats")}</Text>
              ) : (
                savedChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => openSavedChat(chat)}
                  >
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {chat.message || t("chat.untitledChat")}
                    </Text>
                  </TouchableOpacity>
                ))
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
        <View style={styles.header}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newChatButton} onPress={newChat}>
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
                  <Text style={styles.registerButtonText}>{t("chat.register")}</Text>
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
        </View>

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
            placeholderTextColor="#7D7D7D"
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
            <Text style={styles.sendButtonText}>
              {loading ? "..." : t("chat.send")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0B" },
  wrapper: { flex: 1, backgroundColor: "#0B0B0B" },

  menuOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  menuBackdrop: {
    flex: 1,
  },

  sideMenu: {
    width: 300,
    backgroundColor: "#111111",
    paddingTop: 60,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#222",
  },

  sideMenuTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },

  sideNewChat: {
    backgroundColor: "#9BE000",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
  },

  sideNewChatText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 15,
  },

  emptyHistory: {
    color: "#888",
    fontSize: 14,
    marginTop: 10,
  },

  historyItem: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  historyItemText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  menuButton: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  menuButtonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },

  subtitle: {
    color: "#A8A8A8",
    fontSize: 14,
    lineHeight: 20,
  },

  newChatButton: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  newChatButtonText: {
    color: "#9BE000",
    fontSize: 13,
    fontWeight: "800",
  },

  authButtonsRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  loginButton: {
    backgroundColor: "#9BE000",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
  },

  loginButtonText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 14,
  },

  registerButton: {
    backgroundColor: "#171717",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },

  registerButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  logoutButton: {
    backgroundColor: "#171717",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },

  logoutButtonText: {
    color: "#FF5A5A",
    fontWeight: "700",
    fontSize: 14,
  },

  userStatus: {
    color: "#A8A8A8",
    marginTop: 10,
    fontSize: 13,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },

  quickChip: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
  },

  quickChipText: {
    color: "#D8D8D8",
    fontSize: 13,
    fontWeight: "600",
  },

  messagesContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
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
    backgroundColor: "#9BE000",
    borderBottomRightRadius: 6,
  },

  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1E1E1E",
    borderBottomLeftRadius: 6,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },

  userText: {
    color: "#111",
    fontWeight: "600",
  },

  aiText: {
    color: "#F4F4F4",
  },

  dayPlansContainer: {
    marginTop: 8,
  },

  dayCard: {
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },

  dayTitle: {
    color: "white",
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
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
  },

  placeChipText: {
    color: "#9BE000",
    fontSize: 14,
    fontWeight: "700",
  },

  routeButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#9BE000",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  routeButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "800",
  },

  loadingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1E1E1E",
    borderBottomLeftRadius: 6,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },

  loadingText: {
    color: "#BDBDBD",
    fontSize: 14,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
    backgroundColor: "#0B0B0B",
  },

  input: {
    flex: 1,
    minHeight: 58,
    maxHeight: 120,
    backgroundColor: "#171717",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: "white",
    fontSize: 16,
    marginRight: 10,
  },

  sendButton: {
    minHeight: 58,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: "#9BE000",
    justifyContent: "center",
    alignItems: "center",
  },

  sendDisabled: {
    opacity: 0.7,
  },

  sendButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "800",
  },
});