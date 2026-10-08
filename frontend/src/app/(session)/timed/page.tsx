import { LessonPlayer } from "@/features/lesson/LessonPlayer";

/** /timed: answer as many as possible before the clock runs out (+7 s per correct answer). */
export default function TimedPage() {
  return <LessonPlayer kind="timed" />;
}
