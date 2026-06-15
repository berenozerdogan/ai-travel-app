import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../context/LanguageContext";

const COLORS = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F1EB",
  border: "rgba(31,41,55,0.08)",
  text: "#1F2937",
  textSoft: "#6B7280",
  accent: "#E85D75",
  white: "#FFFFFF",
  shadow: "#D6CEC2",
};

function infoText(key: string, language: string) {
  const texts: Record<string, Record<string, string>> = {
    title: {
      tr: "Pratik Bilgiler",
      en: "Practical Info",
      de: "Praktische Infos",
      ru: "Полезная информация",
    },
    subtitle: {
      tr: "Seyahat sırasında hızlı erişebileceğin güvenlik, ulaşım ve günlük ihtiyaç bilgileri.",
      en: "Quick access to safety, transport and daily travel essentials.",
      de: "Schneller Zugriff auf Sicherheit, Transport und Reiseinfos.",
      ru: "Быстрый доступ к безопасности, транспорту и полезной информации.",
    },
    emergencyNumbers: { tr: "Acil Numaralar", en: "Emergency Numbers", de: "Notrufnummern", ru: "Экстренные номера" },
    nearby: { tr: "Yakınımdakiler", en: "Nearby", de: "In der Nähe", ru: "Рядом" },
    safety: { tr: "Turist Güvenliği", en: "Tourist Safety", de: "Touristische Sicherheit", ru: "Безопасность туриста" },
    phrases: { tr: "Dil Yardım Cümleleri", en: "Helpful Phrases", de: "Hilfreiche Sätze", ru: "Полезные фразы" },
    travelTips: { tr: "Para / Ulaşım / İnternet", en: "Money / Transport / Internet", de: "Geld / Transport / Internet", ru: "Деньги / Транспорт / Интернет" },
  };

  const lang = String(language || "en").toLowerCase();
  return texts[key]?.[lang] || texts[key]?.en || key;
}

export default function Emergency() {
  const { language } = useLanguage();

  const open = (url: string) => Linking.openURL(url).catch(console.log);

  const emergencyItems = [
    { title: "112", desc: language === "tr" ? "Ambulans, polis, itfaiye ve genel acil durum hattı" : "Ambulance, police, fire and general emergency line", icon: "call-outline", action: "tel:112" },
    { title: "Tourism Police", desc: language === "tr" ? "Turistik bölgelerde güvenlik desteği için polis noktalarını aç" : "Open nearby police points for tourist safety support", icon: "shield-checkmark-outline", action: "https://www.google.com/maps/search/tourism+police+near+me" },
  ];

  const nearbyItems = [
    { title: language === "tr" ? "Yakındaki Hastaneler" : "Nearby Hospitals", desc: language === "tr" ? "En yakın hastaneleri Google Maps’te aç" : "Open closest hospitals in Google Maps", icon: "medkit-outline", action: "https://www.google.com/maps/search/hospital+near+me" },
    { title: language === "tr" ? "Yakındaki Eczaneler" : "Nearby Pharmacies", desc: language === "tr" ? "Nöbetçi veya yakındaki eczaneleri bul" : "Find nearby pharmacies", icon: "medical-outline", action: "https://www.google.com/maps/search/pharmacy+near+me" },
    { title: language === "tr" ? "Yakındaki Polis" : "Nearby Police", desc: language === "tr" ? "En yakın polis merkezi veya karakolu aç" : "Open the nearest police station", icon: "shield-outline", action: "https://www.google.com/maps/search/police+station+near+me" },
    { title: language === "tr" ? "Toplu Taşıma" : "Public Transport", desc: language === "tr" ? "Metro, otobüs, tramvay ve durakları göster" : "Show metro, bus, tram and stations", icon: "bus-outline", action: "https://www.google.com/maps/search/public+transport+near+me" },
  ];

  const safetyTips = [
    language === "tr" ? "Kalabalık yerlerde çantanı kapalı ve ön tarafta tut." : "Keep your bag closed and in front of you in crowded places.",
    language === "tr" ? "Taksi kullanırken rota ve ücret bilgisini uygulamadan kontrol et." : "Check route and fare details in an app when using taxis.",
    language === "tr" ? "Pasaport ve önemli belgelerin fotoğrafını güvenli bir yerde sakla." : "Keep photos of your passport and important documents safely.",
    language === "tr" ? "Gece geç saatte tenha sokaklardan kaçın." : "Avoid isolated streets late at night.",
  ];

  const phraseItems = [
    { tr: "Yardım eder misiniz?", en: "Can you help me?" },
    { tr: "En yakın hastane nerede?", en: "Where is the nearest hospital?" },
    { tr: "Polisi arayabilir misiniz?", en: "Can you call the police?" },
    { tr: "Bu adrese nasıl giderim?", en: "How can I get to this address?" },
  ];

  const practicalTips = [
    language === "tr" ? "Türkiye’de para birimi Türk Lirası’dır. Küçük işletmeler için nakit bulundurmak faydalı olabilir." : "The currency in Turkey is Turkish Lira. Carrying some cash can help in small shops.",
    language === "tr" ? "İstanbulkart; metro, tramvay, otobüs ve vapur için kullanılabilir." : "Istanbulkart can be used for metro, tram, bus and ferry.",
    language === "tr" ? "Mobil internet için eSIM veya yerel SIM seçenekleri değerlendirilebilir." : "For mobile internet, eSIM or local SIM options can be useful.",
  ];

  const renderActionCard = (item: any) => (
    <TouchableOpacity key={item.title} style={styles.card} onPress={() => open(item.action)} activeOpacity={0.88}>
      <View style={styles.iconBox}>
        <Ionicons name={item.icon as any} size={22} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSoft} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient colors={["#FFFFFF", "#FAF8F5", "#F7F4EF"]} style={styles.hero}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{infoText("title", language)}</Text>
        <Text style={styles.subtitle}>{infoText("subtitle", language)}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.sectionTitle}>{infoText("emergencyNumbers", language)}</Text>
        {emergencyItems.map(renderActionCard)}

        <Text style={styles.sectionTitle}>{infoText("nearby", language)}</Text>
        {nearbyItems.map(renderActionCard)}

        <Text style={styles.sectionTitle}>{infoText("safety", language)}</Text>
        <View style={styles.infoCard}>
          {safetyTips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={COLORS.accent} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{infoText("phrases", language)}</Text>
        <View style={styles.infoCard}>
          {phraseItems.map((item) => (
            <View key={item.tr} style={styles.phraseRow}>
              <Text style={styles.phraseMain}>{language === "tr" ? item.tr : item.en}</Text>
              <Text style={styles.phraseSub}>{language === "tr" ? item.en : item.tr}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{infoText("travelTips", language)}</Text>
        <View style={styles.infoCard}>
          {practicalTips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="information-circle-outline" size={17} color={COLORS.accent} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 30, fontWeight: "800", color: COLORS.text },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginTop: 8 },
  content: { flex: 1, padding: 18 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  cardDesc: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  phraseRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  phraseMain: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  phraseSub: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 3,
  },
});
