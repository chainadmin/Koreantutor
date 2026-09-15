import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

// Placeholder screen: wire this to a parent-facing mastery endpoint
// (e.g. GET /api/v1/users/students/:studentId/mastery) once implemented.
export default function StudentProgressScreen() {
  const { t } = useTranslation();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("parent.progress")}</Text>
      <Text style={styles.hint}>DEMO DATA — mastery breakdown for student {studentId} will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  hint: { color: "#6b7280" },
});
