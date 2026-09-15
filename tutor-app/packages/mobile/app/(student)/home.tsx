import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

// Placeholder screen: wire this to GET /api/v1/curriculum/subjects and
// GET /api/v1/homework once a real (seeded) backend session is available.
export default function StudentHomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("student.home")}</Text>
      <Link href="/(student)/homework" style={styles.card}>
        <Text>{t("student.homework")}</Text>
      </Link>
      <Text style={styles.hint}>
        DEMO DATA — pick a concept from the curriculum to start {t("student.startTutoring")}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 16 },
  hint: { color: "#6b7280" },
});
