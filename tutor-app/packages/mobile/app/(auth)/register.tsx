import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { apiFetch, setAccessToken } from "../../src/api/client";

type Role = "STUDENT" | "PARENT";

// Backend contract: PARENT registers with just email/password/role — the
// schema stores no name for a parent. STUDENT additionally requires
// displayName + gradeId (StudentProfile is created alongside the User).
// TODO: replace the raw gradeId input with a picker backed by
// GET /api/v1/curriculum/grades once that UI exists.
export default function RegisterScreen() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    try {
      const body =
        role === "STUDENT" ? { email, password, role, displayName, gradeId } : { email, password, role };

      const tokens = await apiFetch<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAccessToken(tokens.accessToken);
      router.replace(role === "STUDENT" ? "/(student)/home" : "/(parent)/home");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.register")}</Text>
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
      <Text>{t("auth.iAmA")}</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleButton, role === "STUDENT" && styles.roleButtonActive]}
          onPress={() => setRole("STUDENT")}
        >
          <Text>{t("auth.student")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === "PARENT" && styles.roleButtonActive]}
          onPress={() => setRole("PARENT")}
        >
          <Text>{t("auth.parent")}</Text>
        </TouchableOpacity>
      </View>
      {role === "STUDENT" && (
        <>
          <TextInput
            style={styles.input}
            placeholder={t("auth.name")}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder={t("auth.gradeId")}
            value={gradeId}
            onChangeText={setGradeId}
          />
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>{t("auth.register")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  roleRow: { flexDirection: "row", gap: 12 },
  roleButton: { flex: 1, padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, alignItems: "center" },
  roleButtonActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "600" },
  error: { color: "#dc2626" },
});
