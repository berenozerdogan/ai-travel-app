import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Linking, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../context/LanguageContext";

const COLORS = { bg: "#131622", surface: "#1C1F30", surfaceSoft: "#272B42", border: "rgba(255,255,255,0.03)", text: "#F1F3F9", textSoft: "#8E95B2", accent: "#D65A5A", white: "#FFFFFF" };

export default function Emergency() {
  const { t } = useLanguage();
  const items = [
    { title: t("emergency.emergencyCall"), desc: t("emergency.emergencyDesc"), icon: "call-outline", action: "tel:112" },
    { title: t("emergency.hospitals"), desc: t("emergency.hospitalsDesc"), icon: "medkit-outline", action: "https://www.google.com/maps/search/hospital+near+me" },
    { title: t("emergency.pharmacies"), desc: t("emergency.pharmaciesDesc"), icon: "medical-outline", action: "https://www.google.com/maps/search/pharmacy+near+me" },
    { title: t("emergency.police"), desc: t("emergency.policeDesc"), icon: "shield-checkmark-outline", action: "https://www.google.com/maps/search/police+station+near+me" },
    { title: t("emergency.transport"), desc: t("emergency.transportDesc"), icon: "bus-outline", action: "https://www.google.com/maps/search/public+transport+near+me" },
  ];

  const open = (url: string) => Linking.openURL(url).catch(console.log);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1C1F30", "#161826", "#131622"]} style={styles.hero}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("emergency.title")}</Text>
        <Text style={styles.subtitle}>{t("emergency.subtitle")}</Text>
      </LinearGradient>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {items.map((item) => (
          <TouchableOpacity key={item.title} style={styles.card} onPress={() => open(item.action)} activeOpacity={0.88}>
            <View style={styles.iconBox}><Ionicons name={item.icon as any} size={22} color={COLORS.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardDesc}>{item.desc}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSoft} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:COLORS.bg}, hero:{paddingTop:56,paddingHorizontal:20,paddingBottom:24,borderBottomLeftRadius:30,borderBottomRightRadius:30}, backButton:{width:42,height:42,borderRadius:14,backgroundColor:COLORS.surfaceSoft,alignItems:"center",justifyContent:"center",marginBottom:18}, title:{fontSize:30,fontWeight:"800",color:COLORS.white}, subtitle:{color:"rgba(255,255,255,0.75)",fontSize:15,lineHeight:22,marginTop:8}, content:{flex:1,padding:18}, card:{backgroundColor:COLORS.surface,borderRadius:22,padding:16,marginBottom:14,borderWidth:1,borderColor:COLORS.border,flexDirection:"row",alignItems:"center"}, iconBox:{width:46,height:46,borderRadius:16,backgroundColor:COLORS.surfaceSoft,alignItems:"center",justifyContent:"center",marginRight:12}, cardTitle:{color:COLORS.text,fontSize:16,fontWeight:"800"}, cardDesc:{color:COLORS.textSoft,fontSize:13,lineHeight:19,marginTop:4} });
