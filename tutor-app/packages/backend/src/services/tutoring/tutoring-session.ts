import type { TutoringPhase } from "@prisma/client";
import type { TutorConcept, TutorMessage, TutorProvider } from "./tutor-provider.interface";

const MAX_RETRIES = 2;

export interface TutoringStep {
  phase: TutoringPhase;
  content: string;
  /** Set only on an EVALUATE step. */
  isCorrect?: boolean;
  /** True once the session has nothing left to do. */
  done: boolean;
}

/**
 * Enforces the tutoring flow as a state machine — the flow itself
 * (explain -> question -> evaluate -> hint -> retry -> reveal -> record
 * weakness) is guaranteed by this code, not left to prompting alone.
 *
 * One instance covers one concept for one student. Callers persist each
 * TutoringStep as a TutoringMessage and advance the session's `phase`
 * column to match `this.phase` after every call.
 */
export class TutoringSession {
  phase: TutoringPhase = "EXPLAIN";

  private currentQuestion: string | null = null;
  private attempts: string[] = [];
  private readonly history: TutorMessage[] = [];

  constructor(
    private readonly provider: TutorProvider,
    private readonly concept: TutorConcept,
  ) {}

  /** Drives the session forward. Call once per turn; pass the student's
   * answer only when the session is currently waiting on one (phase
   * QUESTION or RETRY). */
  async advance(studentAnswer?: string): Promise<TutoringStep> {
    switch (this.phase) {
      case "EXPLAIN": {
        const content = await this.provider.explain(this.concept);
        this.history.push({ role: "tutor", content });
        this.phase = "QUESTION";
        return { phase: "EXPLAIN", content, done: false };
      }

      case "QUESTION": {
        const content = await this.provider.ask(this.concept, this.history);
        this.currentQuestion = content;
        this.history.push({ role: "tutor", content });
        this.phase = "EVALUATE";
        return { phase: "QUESTION", content, done: false };
      }

      case "EVALUATE": {
        if (studentAnswer === undefined) {
          throw new Error("EVALUATE requires a student answer");
        }
        this.history.push({ role: "student", content: studentAnswer });
        this.attempts.push(studentAnswer);

        const { isCorrect, feedback } = await this.provider.evaluate(
          this.concept,
          this.currentQuestion!,
          studentAnswer,
        );
        this.history.push({ role: "tutor", content: feedback });

        if (isCorrect) {
          this.phase = "COMPLETE";
        } else if (this.attempts.length > MAX_RETRIES) {
          this.phase = "REVEAL";
        } else {
          this.phase = "HINT";
        }

        return { phase: "EVALUATE", content: feedback, isCorrect, done: false };
      }

      case "HINT": {
        const content = await this.provider.hint(this.concept, this.currentQuestion!, this.attempts);
        this.history.push({ role: "tutor", content });
        this.phase = "RETRY";
        return { phase: "HINT", content, done: false };
      }

      case "RETRY": {
        if (studentAnswer === undefined) {
          throw new Error("RETRY requires a student answer");
        }
        this.history.push({ role: "student", content: studentAnswer });
        this.attempts.push(studentAnswer);

        const { isCorrect, feedback } = await this.provider.evaluate(
          this.concept,
          this.currentQuestion!,
          studentAnswer,
        );
        this.history.push({ role: "tutor", content: feedback });

        if (isCorrect) {
          this.phase = "COMPLETE";
        } else if (this.attempts.length > MAX_RETRIES) {
          this.phase = "REVEAL";
        } else {
          this.phase = "HINT";
        }

        return { phase: "RETRY", content: feedback, isCorrect, done: false };
      }

      case "REVEAL": {
        const content = await this.provider.reveal(this.concept, this.currentQuestion!);
        this.history.push({ role: "tutor", content });
        this.phase = "RECORD_WEAKNESS";
        return { phase: "REVEAL", content, done: false };
      }

      case "RECORD_WEAKNESS": {
        // Caller is responsible for calling MasteryService.recordAttempt(false, ...)
        // using the EVALUATE/RETRY outcomes before advancing past this phase.
        this.phase = "COMPLETE";
        return { phase: "RECORD_WEAKNESS", content: "", done: false };
      }

      case "COMPLETE":
        return { phase: "COMPLETE", content: "", done: true };

      default: {
        const _exhaustive: never = this.phase;
        throw new Error(`Unhandled tutoring phase: ${_exhaustive}`);
      }
    }
  }
}
