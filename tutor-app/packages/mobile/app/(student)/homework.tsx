import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

// Placeholder screen: wire this to GET /api/v1/homework once a real
// (seeded) backend session is available.
export default function HomeworkScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("student.homework")}</Text>
      <Text style={styles.hint}>DEMO DATA — assignments generated from weak concepts will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  hint: { color: "#6b7280" },
});
