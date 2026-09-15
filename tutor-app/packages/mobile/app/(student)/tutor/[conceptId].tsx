import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiFetch } from "../../../src/api/client";

interface TutoringStep {
  phase: string;
  content: string;
  isCorrect?: boolean;
  done: boolean;
}

// Drives one TutoringSession state machine turn per tap. Each POST to
// /tutoring/sessions/:id/advance mirrors one TutoringSession.advance() call
// on the backend (see packages/backend/src/services/tutoring/tutoring-session.ts).
export default function TutorSessionScreen() {
  const { conceptId } = useLocalSearchParams<{ conceptId: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TutoringStep[]>([]);
  const [answer, setAnswer] = useState("");

  async function start() {
    const { sessionId: id } = await apiFetch<{ sessionId: string }>("/tutoring/sessions", {
      method: "POST",
      body: JSON.stringify({ conceptId }),
    });
    setSessionId(id);
    await advance(id);
  }

  async function advance(id: string, studentAnswer?: string) {
    const step = await apiFetch<TutoringStep>(`/tutoring/sessions/${id}/advance`, {
      method: "POST",
      body: JSON.stringify({ answer: studentAnswer }),
    });
    setSteps((prev) => [...prev, step]);
    setAnswer("");
  }

  const waitingForAnswer = steps.at(-1)?.phase === "QUESTION" || steps.at(-1)?.phase === "HINT";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.transcript}>
        {steps.map((step, i) => (
          <Text key={i} style={styles.step}>
            [{step.phase}] {step.content}
          </Text>
        ))}
      </ScrollView>

      {!sessionId ? (
        <TouchableOpacity style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      ) : waitingForAnswer ? (
        <View style={styles.answerRow}>
          <TextInput style={styles.input} value={answer} onChangeText={setAnswer} />
          <TouchableOpacity style={styles.button} onPress={() => advance(sessionId, answer)}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        !steps.at(-1)?.done && (
          <TouchableOpacity style={styles.button} onPress={() => advance(sessionId)}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  transcript: { flex: 1 },
  step: { marginBottom: 12 },
  answerRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
