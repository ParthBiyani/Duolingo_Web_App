import { notFound } from "next/navigation";

import { LessonPlayer } from "@/features/lesson/LessonPlayer";
import { parseRouteId } from "@/features/lesson/routeParams";

/** /lesson/:lessonId runs that lesson; `?kind=review` replays a completed one for review XP. */
export default async function LessonPage({
  params,
  searchParams,
}: PageProps<"/lesson/[lessonId]">) {
  const { lessonId } = await params;
  const { kind } = await searchParams;
  const id = parseRouteId(lessonId);
  if (id === null) notFound();

  return <LessonPlayer key={id} kind={kind === "review" ? "review" : "lesson"} lessonId={id} />;
}
