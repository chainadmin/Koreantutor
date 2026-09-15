/**
 * Provider-agnostic interface for the AI that powers a tutoring session.
 * Nothing outside this file (and its concrete implementations) may talk to
 * a vendor SDK directly — the state machine in tutoring-session.ts only
 * ever calls through this interface.
 */

export interface TutorConcept {
  id: string;
  title: string;
  description: string;
}

export interface TutorMessage {
  role: "tutor" | "student";
  content: string;
}

export interface TutorEvaluation {
  isCorrect: boolean;
  feedback: string;
}

export interface TutorProvider {
  /** Phase: EXPLAIN — teach the concept before asking anything. */
  explain(concept: TutorConcept): Promise<string>;

  /** Phase: QUESTION — pose a question that exercises the concept. */
  ask(concept: TutorConcept, history: TutorMessage[]): Promise<string>;

  /** Phase: EVALUATE — judge the student's answer to the last question asked. */
  evaluate(concept: TutorConcept, question: string, studentAnswer: string): Promise<TutorEvaluation>;

  /** Phase: HINT — give a hint without revealing the answer, after an incorrect attempt. */
  hint(concept: TutorConcept, question: string, priorAttempts: string[]): Promise<string>;

  /** Phase: REVEAL — after retries are exhausted, explain the correct answer. */
  reveal(concept: TutorConcept, question: string): Promise<string>;
}
