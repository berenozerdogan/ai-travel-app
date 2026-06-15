import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    if (auth.currentUser) setUser(auth.currentUser);
  };

  const register = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    console.log("REGISTER SUCCESS", result.user.uid);

    setUser(result.user);

    await sendEmailVerification(result.user);
  } catch (e: any) {
    console.log("REGISTER ERROR");
    console.log("CODE:", e?.code);
    console.log("MESSAGE:", e?.message);
    throw e;
  }
};

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setUser({ ...auth.currentUser } as User);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, sendVerification, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export default AuthProvider;
