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
import { createUserWithEmailAndPassword } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const result = await createUserWithEmailAndPassword(
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

      Alert.alert("Success", "Account created successfully");
      router.replace("/(tabs)/chat" as any);
    } catch (error: any) {
      Alert.alert("Register error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login" as any)}>
        <Text style={styles.link}>Already have an account? Login</Text>
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