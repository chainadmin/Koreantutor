import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

// Placeholder screen: wire this to GET /api/v1/users/me/students once a
// real (seeded) backend session is available.
export default function ParentHomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("parent.home")}</Text>
      <Link href="/(parent)/link-student" style={styles.card}>
        <Text>{t("parent.linkStudent")}</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 16 },
});
