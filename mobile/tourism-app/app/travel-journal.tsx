import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../context/LanguageContext";

const COLORS = { bg: "#131622", surface: "#1C1F30", surfaceSoft: "#272B42", border: "rgba(255,255,255,0.03)", text: "#F1F3F9", textSoft: "#8E95B2", accent: "#D65A5A", white: "#FFFFFF" };

type JournalItem = { placeId: number; placeName: string; city?: string; note: string; createdAt?: string };

export default function TravelJournal() {
  const { t } = useLanguage();
  const [items, setItems] = useState<JournalItem[]>([]);

  const loadJournal = async () => {
    const notesRaw = await AsyncStorage.getItem("user_place_notes");
    const placesRaw = await AsyncStorage.getItem("saved_places");
    const notes = notesRaw ? JSON.parse(notesRaw) : {};
    const places = placesRaw ? JSON.parse(placesRaw) : [];
    const list = Object.keys(notes)
      .filter((id) => String(notes[id] || "").trim())
      .map((id) => {
        const place = places.find((p: any) => String(p.id) === String(id));
        return { placeId: Number(id), placeName: place?.name || `${t("journal.placeFallback")} #${id}`, city: place?.city || "", note: notes[id], createdAt: new Date().toLocaleDateString() };
      });
    setItems(list);
  };

  useFocusEffect(useCallback(() => { loadJournal(); }, []));

  const clearJournal = async () => {
    Alert.alert(t("journal.clearTitle"), t("journal.clearMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => { await AsyncStorage.removeItem("user_place_notes"); setItems([]); } },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1C1F30", "#161826", "#131622"]} style={styles.hero}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.title}>{t("journal.title")}</Text>
        <Text style={styles.subtitle}>{t("journal.subtitle")}</Text>
      </LinearGradient>
      <View style={styles.content}>
        {items.length > 0 && <TouchableOpacity style={styles.clearButton} onPress={clearJournal}><Text style={styles.clearText}>{t("journal.clearAll")}</Text></TouchableOpacity>}
        {items.length === 0 ? <View style={styles.empty}><Ionicons name="journal-outline" size={36} color={COLORS.accent} /><Text style={styles.emptyTitle}>{t("journal.emptyTitle")}</Text><Text style={styles.emptyText}>{t("journal.emptyText")}</Text></View> : (
          <FlatList data={items} keyExtractor={(item) => String(item.placeId)} contentContainerStyle={{ paddingBottom: 120 }} renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/place", params: { id: String(item.placeId) } })}>
              <Text style={styles.cardTitle}>{item.placeName}</Text>
              <Text style={styles.cardCity}>{item.city}</Text>
              <Text style={styles.note}>{item.note}</Text>
            </TouchableOpacity>
          )} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:COLORS.bg}, hero:{paddingTop:56,paddingHorizontal:20,paddingBottom:24,borderBottomLeftRadius:30,borderBottomRightRadius:30}, backButton:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.surfaceSoft,alignItems:"center",justifyContent:"center",marginBottom:18}, title:{fontSize:32,fontWeight:"800",color:COLORS.white}, subtitle:{color:"rgba(255,255,255,0.75)",fontSize:15,lineHeight:22,marginTop:8}, content:{flex:1,padding:18}, empty:{backgroundColor:COLORS.surface,borderRadius:24,padding:28,alignItems:"center",borderWidth:1,borderColor:COLORS.border}, emptyTitle:{color:COLORS.text,fontSize:20,fontWeight:"800",marginTop:12}, emptyText:{color:COLORS.textSoft,textAlign:"center",marginTop:8,lineHeight:21}, card:{backgroundColor:COLORS.surface,borderRadius:22,padding:16,marginBottom:14,borderWidth:1,borderColor:COLORS.border}, cardTitle:{color:COLORS.text,fontSize:18,fontWeight:"800"}, cardCity:{color:COLORS.accent,fontSize:13,fontWeight:"700",marginTop:4}, note:{color:COLORS.textSoft,fontSize:15,lineHeight:22,marginTop:10}, clearButton:{alignSelf:"flex-end",backgroundColor:COLORS.surfaceSoft,paddingHorizontal:14,paddingVertical:9,borderRadius:14,marginBottom:14}, clearText:{color:COLORS.accent,fontWeight:"800"} });
