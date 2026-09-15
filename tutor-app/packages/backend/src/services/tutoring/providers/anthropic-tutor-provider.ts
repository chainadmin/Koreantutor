import Anthropic from "@anthropic-ai/sdk";
import type { TutorConcept, TutorEvaluation, TutorMessage, TutorProvider } from "../tutor-provider.interface";

const MODEL = "claude-sonnet-5";

/**
 * Concrete TutorProvider backed by the Anthropic API. This is the only
 * file in the tutoring subsystem allowed to import the Anthropic SDK —
 * everything else talks to TutorProvider, never to Anthropic directly.
 */
export class AnthropicTutorProvider implements TutorProvider {
  private readonly client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.client = new Anthropic({ apiKey });
  }

  async explain(concept: TutorConcept): Promise<string> {
    return this.complete([
      {
        role: "user",
        content: `Explain the concept "${concept.title}" (${concept.description}) to a middle school student in Korean, in 2-3 short sentences. Do not ask a question yet.`,
      },
    ]);
  }

  async ask(concept: TutorConcept, history: TutorMessage[]): Promise<string> {
    return this.complete([
      ...toAnthropicHistory(history),
      {
        role: "user",
        content: `Ask one question that tests whether the student understood "${concept.title}". Ask only the question, nothing else.`,
      },
    ]);
  }

  async evaluate(concept: TutorConcept, question: string, studentAnswer: string): Promise<TutorEvaluation> {
    const content = await this.complete([
      {
        role: "user",
        content: [
          `Concept: ${concept.title}`,
          `Question: ${question}`,
          `Student answer: ${studentAnswer}`,
          "Reply with exactly one line: CORRECT or INCORRECT, then a newline, then one short sentence of feedback in Korean.",
        ].join("\n"),
      },
    ]);

    const [verdictLine, ...rest] = content.split("\n");
    return {
      isCorrect: verdictLine.trim().toUpperCase().startsWith("CORRECT"),
      feedback: rest.join("\n").trim() || content,
    };
  }

  async hint(concept: TutorConcept, question: string, priorAttempts: string[]): Promise<string> {
    return this.complete([
      {
        role: "user",
        content: [
          `Concept: ${concept.title}`,
          `Question: ${question}`,
          `Prior incorrect attempts: ${priorAttempts.join(", ")}`,
          "Give one short hint in Korean that nudges the student toward the answer without revealing it.",
        ].join("\n"),
      },
    ]);
  }

  async reveal(concept: TutorConcept, question: string): Promise<string> {
    return this.complete([
      {
        role: "user",
        content: `Concept: ${concept.title}\nQuestion: ${question}\nThe student was unable to answer after retries. Explain the correct answer and reasoning in Korean, briefly.`,
      },
    ]);
  }

  private async complete(messages: Anthropic.MessageParam[]): Promise<string> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages,
    });

    const block = response.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  }
}

function toAnthropicHistory(history: TutorMessage[]): Anthropic.MessageParam[] {
  return history.map((message) => ({
    role: message.role === "tutor" ? "assistant" : "user",
    content: message.content,
  }));
}
