import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { API_BASE_URL } from "../config/api";

type Role = "admin" | "user";

interface User {
  id: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type StoredAuth = {
  user: User;
  accessToken: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore auth from storage on app start
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem("auth");
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          setUser(parsed.user);
          setAccessToken(parsed.accessToken);
        }
      } catch (e) {
        console.warn("Failed to restore auth", e);
      } finally {
        setLoading(false);
      }
    };
    restoreAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.log("Login error body:", errBody);
        throw new Error(errBody?.message || "Invalid credentials");
      }

      const data = (await res.json()) as {
        accessToken: string;
        user: User;
      };

      setUser(data.user);
      setAccessToken(data.accessToken);

      await AsyncStorage.setItem(
        "auth",
        JSON.stringify({
          user: data.user,
          accessToken: data.accessToken,
        } satisfies StoredAuth)
      );

      router.replace("/(app)/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      alert(err.message || "Login failed");
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    await AsyncStorage.removeItem("auth");
    router.replace("/(auth)/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
