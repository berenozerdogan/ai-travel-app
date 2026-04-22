import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../lib/firebase";

const COLORS = {
  bg: "#D9D2C3",
  surface: "#F6F1E7",
  surfaceSoft: "#EFE7D8",
  border: "#E8E0D1",
  text: "#1E2418",
  textSoft: "#5F6656",
  accent: "#B8CC2A",
  accentDark: "#28310F",
  shadow: "#9E9688",
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await AsyncStorage.setItem(
        "logged_user",
        JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
        })
      );

      Alert.alert("Success", "Logged in successfully");
      router.replace("/(tabs)/chat" as any);
    } catch (error: any) {
      Alert.alert("Login error", error.message);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#E7DFD0", "#DDD5C5", "#D9D2C3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <TouchableOpacity
  style={styles.backButton}
  onPress={() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }}
>
  <Ionicons name="chevron-back" size={22} color={COLORS.text} />
</TouchableOpacity>

        <View style={styles.centerWrap}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={26}
              color={COLORS.text}
            />
          </View>

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>
            Access your account and continue planning your trip.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={COLORS.textSoft}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#7D806F"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={COLORS.textSoft}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#7D806F"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push("/register" as any)}>
            <Text style={styles.link}>Don’t have an account? Register</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          By continuing, you agree to our Terms & Privacy Policy.
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    paddingBottom: 28,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },

  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  inputWrap: {
    height: 54,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 10,
    fontSize: 15,
  },

  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },

  buttonText: {
    fontWeight: "800",
    fontSize: 16,
    color: COLORS.accentDark,
  },

  link: {
    color: COLORS.accentDark,
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },

  footerText: {
    color: COLORS.textSoft,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});