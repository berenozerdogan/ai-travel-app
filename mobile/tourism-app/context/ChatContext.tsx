import React, { createContext, useContext, useMemo, useState } from "react";

type DayPlan = {
  day: number;
  places: string[];
};

export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "ai";
  places?: string[];
  days?: DayPlan[];
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};

type ChatContextType = {
  chats: ChatSession[];
  activeChatId: string | null;
  activeChat: ChatSession | null;
  createNewChat: (welcomeText: string) => string;
  setActiveChatId: (id: string) => void;
  appendMessageToChat: (chatId: string, message: ChatMessage) => void;
  loadChatSession: (chat: ChatSession) => void;
  resetChats: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  const createNewChat = (welcomeText: string) => {
    const id = Date.now().toString();

    const newChat: ChatSession = {
      id,
      title: "Yeni Sohbet",
      createdAt: Date.now(),
      messages: [
        {
          id: `welcome_${id}`,
          text: welcomeText,
          sender: "ai",
          places: [],
          days: [],
        },
      ],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(id);

    return id;
  };

  const appendMessageToChat = (chatId: string, message: ChatMessage) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;

        const updatedMessages = [...chat.messages, message];

        let updatedTitle = chat.title;
        const firstUserMessage = updatedMessages.find((m) => m.sender === "user");

        if (firstUserMessage) {
          updatedTitle = firstUserMessage.text.slice(0, 40);
        }

        return {
          ...chat,
          title: updatedTitle || "Yeni Sohbet",
          messages: updatedMessages,
        };
      })
    );
  };

  const loadChatSession = (chat: ChatSession) => {
    setChats((prev) => {
      const exists = prev.some((item) => item.id === chat.id);

      if (exists) {
        return prev.map((item) => (item.id === chat.id ? chat : item));
      }

      return [chat, ...prev];
    });

    setActiveChatId(chat.id);
  };

  const resetChats = () => {
    setChats([]);
    setActiveChatId(null);
  };

  const value = useMemo(
    () => ({
      chats,
      activeChatId,
      activeChat,
      createNewChat,
      setActiveChatId,
      appendMessageToChat,
      loadChatSession,
      resetChats,
    }),
    [chats, activeChatId, activeChat]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used inside ChatProvider");
  }

  return context;
}