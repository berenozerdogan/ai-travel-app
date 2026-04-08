import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";

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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/register" as any)}>
        <Text style={styles.link}>Don’t have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#171717",
    color: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#9BE000",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#111",
  },
  link: {
    color: "#9BE000",
    marginTop: 18,
    textAlign: "center",
  },
});