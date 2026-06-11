import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import tr from "../locales/tr";
import en from "../locales/en";
import de from "../locales/de";
import ru from "../locales/ru";

export type Language = "tr" | "en" | "de" | "ru";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const dictionaries: Record<Language, any> = { tr, en, de, ru };

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: async () => {},
  t: (key, fallback) => fallback || key,
});

const getNestedValue = (source: any, key: string) => {
  return key.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) return acc[part];
    return undefined;
  }, source);
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem("app_language");
        if (saved === "tr" || saved === "en" || saved === "de" || saved === "ru") {
          setLanguageState(saved);
        }
      } catch (error) {
        console.log("Language load error:", error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem("app_language", lang);
    setLanguageState(lang);
  };

  const t = useMemo(() => {
    return (key: string, fallback?: string) => {
      const selectedValue = getNestedValue(dictionaries[language], key);
      if (typeof selectedValue === "string") return selectedValue;

      const englishValue = getNestedValue(dictionaries.en, key);
      if (typeof englishValue === "string") return englishValue;

      return fallback || key;
    };
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
