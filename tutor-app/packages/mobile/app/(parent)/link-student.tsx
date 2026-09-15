import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../src/api/client";

// A parent invites by student email; the student must separately approve
// the resulting invite code (see (student) invite-approval flow, TODO) —
// links are never created automatically.
export default function LinkStudentScreen() {
  const { t } = useTranslation();
  const [studentEmail, setStudentEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function sendInvite() {
    setStatus(null);
    try {
      const link = await apiFetch<{ inviteCode: string }>("/users/links/invite", {
        method: "POST",
        body: JSON.stringify({ studentEmail }),
      });
      setStatus(`Invite sent. Code: ${link.inviteCode}`);
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("parent.linkStudent")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={studentEmail}
        onChangeText={setStudentEmail}
      />
      <TouchableOpacity style={styles.button} onPress={sendInvite}>
        <Text style={styles.buttonText}>{t("common.submit")}</Text>
      </TouchableOpacity>
      {status && <Text>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
