import { useState } from "react";
import { Link, router } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { apiFetch, setAccessToken } from "../../src/api/client";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    try {
      const tokens = await apiFetch<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(tokens.accessToken);
      // TODO: fetch the user's role and route accordingly instead of assuming student.
      router.replace("/(student)/home");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("common.appName")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t("auth.password")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>{t("auth.login")}</Text>
      </TouchableOpacity>
      <Link href="/(auth)/register" style={styles.link}>
        {t("auth.register")}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, color: "#2563eb" },
  error: { color: "#dc2626" },
});
