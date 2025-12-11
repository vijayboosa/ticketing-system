import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("admin@mail.com");
  const [password, setPassword] = useState("qwerty");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    try {
      setSubmitting(true);
      await login(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || loading;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ticketing App Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title={disabled ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={disabled}
      />

      <Text style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        Try admin@example.com / admin123 or user1@example.com / user123 (if you
        created them in backend).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
});
