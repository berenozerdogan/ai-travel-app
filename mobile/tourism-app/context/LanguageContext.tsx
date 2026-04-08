import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import tr from "../locales/tr";
import en from "../locales/en";
import de from "../locales/de";
import ru from "../locales/ru";

type Language = "tr" | "en" | "de" | "ru";

const translations = { tr, en, de, ru };

const LanguageContext = createContext({
  language: "en" as Language,
  setLanguage: async (lang: Language) => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: any) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("app_language");
      if (saved === "tr" || saved === "en" || saved === "de" || saved === "ru") {
        setLanguageState(saved);
      }
    };
    load();
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem("app_language", lang);
    setLanguageState(lang);
  };

  // 🔥 EN KRİTİK KISIM
  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key;
      }
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);