"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useReducer, useRef, useState, type ReactNode } from "react";

import { Button, toast } from "@/components/ui";
import {
  isApiError,
  isUnexpectedError,
  useAbandonSession,
  useCompleteSession,
  useMe,
  useRefillHearts,
  useStartSession,
  useSubmitAnswer,
  type AnswerResult,
  type SessionKind,
  type StartSessionRequest,
} from "@/lib/api";
import { playComplete, playCorrect, playHeartLost, playIncorrect, playMatch } from "@/lib/sound";

import { Celebration } from "./celebrate/Celebration";
import { isRetryable, toLessonError } from "./errors";
import { ExerciseBadge } from "./ExerciseBadge";
import { exerciseRegistry, type ExerciseProps } from "./exercises/registry";
import { newId } from "./ids";
import { Interstitial } from "./Interstitial";
import { isOwnEnterTarget, isTypingTarget, useWindowKeyDown } from "./keyboard";
import { LessonFooter, type FooterMode } from "./LessonFooter";
import { LessonHeader } from "./LessonHeader";
import { LessonSkeleton, StatusMessage } from "./LessonStatus";
import { OutOfHeartsModal } from "./OutOfHeartsModal";
import { isCorrectOutcome } from "./queue";
import { QuitModal } from "./QuitModal";
import {
  canCheck,
  canSkip,
  comboLabel,
  createInitialState,
  currentExercise,
  currentItem,
  isInteractive,
  lessonProgress,
  lessonReducer,
  type ExitReason,
  type Phase,
  type PendingSubmission,
} from "./reducer";
import { lessonStrings } from "./strings";

/** How often the timed-practice clock ticks. */
const TICK_MS = 200;
/** The heart-lost sound follows the wrong-answer buzz instead of overlapping it. */
const HEART_SOUND_DELAY_MS = 280;

const PLAYING: readonly Phase[] = ["answering", "checking", "feedback", "interstitial"];
const CONTINUABLE: readonly Phase[] = ["feedback", "interstitial", "celebrate", "failed"];

export interface LessonPlayerProps {
  kind: SessionKind;
  lessonId?: number;
  skillId?: number;
}

function playResultSound(pending: PendingSubmission, result: AnswerResult, heartsBefore: number) {
  if (pending.kind === "silent-skip") return;
  if (pending.kind === "match" && result.pair_matched) {
    if (result.exercise_done) playCorrect();
    else playMatch();
  } else if (isCorrectOutcome(result)) {
    playCorrect();
  } else {
    playIncorrect();
  }
  if (result.hearts < heartsBefore) window.setTimeout(playHeartLost, HEART_SOUND_DELAY_MS);
}

/**
 * Runs one session: starts it on mount, sends each CHECK with a fresh answer id, completes it
 * when the queue is empty, then walks through the celebration screens. All decisions live in
 * the reducer; this component performs the side effects (API, sounds, navigation, keys).
 */
export function LessonPlayer({ kind, lessonId, skillId }: LessonPlayerProps) {
  const router = useRouter();
  const me = useMe();
  // Sound effects and reduced motion are applied app-wide by PreferencesProvider.
  const settings = me.data?.settings;
  const motivational = settings?.motivational_messages ?? true;
  const animations = settings?.animations ?? true;
  const listening = settings?.listening_exercises ?? true;

  const [state, dispatch] = useReducer(lessonReducer, kind, (initialKind) =>
    createInitialState(initialKind),
  );
  // One id per visit: a retried or replayed start returns the same session.
  const [sessionId] = useState(newId);

  const startSession = useStartSession();
  const submitAnswer = useSubmitAnswer();
  const completeSession = useCompleteSession();
  const abandonSession = useAbandonSession();
  const refillHearts = useRefillHearts();

  // Settings -----------------------------------------------------------------------------------
  useEffect(() => {
    dispatch({ type: "SET_MOTIVATIONAL", enabled: motivational });
  }, [motivational]);

  // Start the session (again after RETRY or a refill) -------------------------------------------
  const requestStart = useEffectEvent(() => {
    const body: StartSessionRequest = { id: sessionId, kind };
    if (lessonId !== undefined) body.lesson_id = lessonId;
    if (skillId !== undefined) body.skill_id = skillId;
    return startSession.mutateAsync(body);
  });
  const shouldStart = state.phase === "loading" && state.error === null && state.modal === null;
  useEffect(() => {
    if (!shouldStart) return;
    let active = true;
    requestStart().then(
      (session) => {
        if (active) dispatch({ type: "LOADED", session });
      },
      (error: unknown) => {
        if (active) dispatch({ type: "LOAD_FAILED", error: toLessonError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [shouldStart, state.attempt]);

  // Grade each pending submission once ----------------------------------------------------------
  const sentRef = useRef<string | null>(null);
  const sendAnswer = useEffectEvent((pending: PendingSubmission) => {
    const session = state.session;
    if (session === null) return;
    const heartsBefore = state.hearts;
    submitAnswer
      .mutateAsync({
        sessionId: session.id,
        answer_id: pending.answerId,
        exercise_id: pending.exerciseId,
        answer: pending.answer,
      })
      .then(
        (result) => {
          playResultSound(pending, result, heartsBefore);
          dispatch({
            type: pending.kind === "match" ? "MATCH_RESULT" : "RESULT",
            answerId: pending.answerId,
            result,
            roll: Math.random(),
          });
        },
        (error: unknown) => {
          // Network and server failures are already reported app-wide.
          if (!isUnexpectedError(error)) {
            toast.error(lessonStrings.submitFailed, { id: "lesson-submit-failed" });
          }
          dispatch({ type: "SUBMIT_FAILED", answerId: pending.answerId });
        },
      );
  });
  useEffect(() => {
    const pending = state.pending;
    if (pending === null || sentRef.current === pending.answerId) return;
    sentRef.current = pending.answerId;
    sendAnswer(pending);
  }, [state.pending]);

  // Complete once the queue is empty (or the timer ran out) --------------------------------------
  const completingId =
    state.phase === "completing" && state.error === null ? (state.session?.id ?? null) : null;
  const requestComplete = useEffectEvent((id: string) => completeSession.mutateAsync(id));
  useEffect(() => {
    if (completingId === null) return;
    let active = true;
    requestComplete(completingId).then(
      (result) => {
        if (!active) return;
        playComplete();
        dispatch({ type: "COMPLETED", result });
      },
      (error: unknown) => {
        if (active) dispatch({ type: "COMPLETE_FAILED", error: toLessonError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [completingId, state.attempt]);

  // A failed legendary run is closed on the server straight away --------------------------------
  const abandon = useEffectEvent((id: string) => abandonSession.mutate(id));
  const failedId = state.phase === "failed" ? (state.session?.id ?? null) : null;
  useEffect(() => {
    if (failedId !== null) abandon(failedId);
  }, [failedId]);

  // Leave the player ----------------------------------------------------------------------------
  const leave = useEffectEvent((exit: ExitReason) => {
    const id = state.session?.id;
    const abandoning = exit === "quit" || exit === "no-thanks" || exit === "practice";
    if (abandoning && id !== undefined) abandonSession.mutate(id);
    router.push(exit === "practice" ? "/practice" : "/learn");
  });
  const exit = state.phase === "done" ? state.exit : null;
  useEffect(() => {
    if (exit !== null) leave(exit);
  }, [exit]);

  // Timed practice clock ------------------------------------------------------------------------
  const timerRunning =
    state.timeLeftMs !== null &&
    state.modal === null &&
    (state.phase === "answering" || state.phase === "checking");
  useEffect(() => {
    if (!timerRunning) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "TICK", ms: now - last });
      last = now;
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  // Actions -------------------------------------------------------------------------------------
  const check = () => dispatch({ type: "CHECK", answerId: newId() });
  const skip = () => dispatch({ type: "SKIP", answerId: newId() });
  const skipSilently = () => dispatch({ type: "SKIP", answerId: newId(), silent: true });
  const next = () => dispatch({ type: "CONTINUE", roll: Math.random() });
  const retry = () => dispatch({ type: "RETRY" });

  const refill = () => {
    refillHearts.mutate("lesson", {
      onSuccess: (result) => {
        toast.success(lessonStrings.refilled, { id: "lesson-refill" });
        dispatch({ type: "REFILLED", hearts: result.hearts });
      },
      onError: (error) => {
        if (isApiError(error, "hearts_full")) {
          dispatch({ type: "REFILLED", hearts: state.heartsMax });
          return;
        }
        const message = isApiError(error, "insufficient_gems")
          ? lessonStrings.notEnoughGems
          : lessonStrings.refillFailed;
        toast.error(message, { id: "lesson-refill" });
      },
    });
  };

  // Keyboard: Enter checks / continues, Escape asks to quit -------------------------------------
  useWindowKeyDown((event) => {
    if (state.modal !== null) return; // open dialogs handle their own keys
    if (event.key === "Escape") {
      if (PLAYING.includes(state.phase)) {
        event.preventDefault();
        dispatch({ type: "QUIT_OPEN" });
      }
      return;
    }
    if (event.key !== "Enter" || event.repeat || isOwnEnterTarget(event.target)) return;
    if (state.phase === "answering") {
      // Enter never adds a newline to a typed answer; it checks it.
      if (isTypingTarget(event.target)) event.preventDefault();
      if (canCheck(state)) {
        event.preventDefault();
        check();
      }
      return;
    }
    if (CONTINUABLE.includes(state.phase)) {
      event.preventDefault();
      next();
    }
  });

  // Rendering -----------------------------------------------------------------------------------
  if (state.completion !== null && (state.phase === "celebrate" || exit === "complete")) {
    const step = state.steps[state.stepIndex] ?? state.steps[state.steps.length - 1];
    return (
      <Celebration
        result={state.completion}
        kind={state.kind}
        step={step}
        stepIndex={state.stepIndex}
        animations={animations}
        onContinue={next}
      />
    );
  }

  const exercise = currentExercise(state);
  const item = currentItem(state);

  let content: ReactNode = null;
  let footerMode: FooterMode = "answer";
  let continueLabel: string | undefined;
  let onFooterContinue = next;

  if (state.phase === "loading") {
    const error = state.error;
    content =
      error !== null && error.code !== "no_hearts" ? (
        <StatusMessage
          pose="sad"
          title={lessonStrings.loadErrorTitle}
          body={lessonStrings.startErrors[error.code] ?? lessonStrings.loadErrorBody}
          live="assertive"
        >
          <div className="mt-2 flex w-full max-w-[320px] flex-col gap-3">
            {isRetryable(error) ? (
              <Button variant="secondary" size="lg" fullWidth onClick={retry}>
                {lessonStrings.retry}
              </Button>
            ) : null}
            <Button variant="outline" size="lg" fullWidth onClick={() => router.push("/learn")}>
              {lessonStrings.backToPath}
            </Button>
          </div>
        </StatusMessage>
      ) : (
        <LessonSkeleton />
      );
  } else if (state.phase === "interstitial" && state.interstitial !== null) {
    content = <Interstitial interstitial={state.interstitial} />;
    footerMode = "continue";
  } else if (state.phase === "completing") {
    if (state.error !== null) {
      content = (
        <StatusMessage
          pose="sad"
          title={lessonStrings.completeErrorTitle}
          body={lessonStrings.completeErrorBody}
          live="assertive"
        />
      );
      footerMode = "continue";
      continueLabel = lessonStrings.retry;
      onFooterContinue = retry;
    } else {
      content = <StatusMessage pose="cheer" title={lessonStrings.saving} />;
      footerMode = "busy";
    }
  } else if (state.phase === "failed") {
    content = (
      <StatusMessage pose="sad" title={lessonStrings.failedTitle} body={lessonStrings.failedBody} />
    );
    footerMode = "continue";
  } else if (exercise !== null && item !== null) {
    const ExerciseView = exerciseRegistry[exercise.type];
    const exerciseProps: ExerciseProps = {
      exercise,
      draft: state.draft,
      onDraft: (answer) => dispatch({ type: "DRAFT", answer }),
      locked: !isInteractive(state),
      result: state.feedback?.result ?? null,
      match: state.match,
      onMatchSelect: (side, tileId) =>
        dispatch({ type: "MATCH_SELECT", side, tileId, answerId: newId() }),
      onMatchFlashEnd: (flashKey) => dispatch({ type: "MATCH_FLASH_END", flashKey }),
      onSkipSilently: skipSilently,
      autoplayAudio: listening,
    };
    content = (
      <div
        key={item.key}
        className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center gap-6 px-4 py-6 md:gap-8 md:px-0"
      >
        <div className="flex flex-col gap-3">
          <ExerciseBadge previousMistake={item.previousMistake} newWord={exercise.is_new_word} />
          <h1 className="text-heading text-title md:text-display md:font-bold">
            {exercise.prompt}
          </h1>
        </div>
        <ExerciseView {...exerciseProps} />
      </div>
    );
    if (state.phase === "feedback") footerMode = "feedback";
  }

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <LessonHeader
        kind={state.kind}
        progress={lessonProgress(state)}
        combo={comboLabel(state)}
        hearts={state.hearts}
        heartLosses={state.heartLosses}
        mistakesLeft={state.mistakesLeft}
        timeLeftMs={state.timeLeftMs}
        timerTotalMs={(state.session?.rules.timer_seconds ?? 30) * 1000}
        ready={state.session !== null}
        onQuit={() => dispatch({ type: "QUIT_OPEN" })}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{content}</main>
      <LessonFooter
        mode={footerMode}
        checking={state.phase === "checking"}
        canCheck={canCheck(state)}
        canSkip={canSkip(state)}
        feedback={state.feedback}
        continueLabel={continueLabel}
        onCheck={check}
        onSkip={skip}
        onContinue={onFooterContinue}
      />
      <QuitModal
        open={state.modal === "quit"}
        onKeepLearning={() => dispatch({ type: "QUIT_CLOSE" })}
        onEndSession={() => dispatch({ type: "QUIT_CONFIRM" })}
      />
      <OutOfHeartsModal
        open={state.modal === "outOfHearts"}
        gems={me.data?.stats.gems ?? null}
        refilling={refillHearts.isPending}
        onRefill={refill}
        onPractice={() => dispatch({ type: "PRACTICE" })}
        onNoThanks={() => dispatch({ type: "NO_THANKS" })}
      />
    </div>
  );
}
