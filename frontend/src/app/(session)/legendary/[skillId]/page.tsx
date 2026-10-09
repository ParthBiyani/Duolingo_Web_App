import { notFound } from "next/navigation";

import { LessonPlayer } from "@/features/lesson/LessonPlayer";
import { parseRouteId } from "@/features/lesson/routeParams";

/** /legendary/:skillId: the no-hearts challenge with a budget of mistakes. */
export default async function LegendaryPage({ params }: PageProps<"/legendary/[skillId]">) {
  const { skillId } = await params;
  const id = parseRouteId(skillId);
  if (id === null) notFound();

  return <LessonPlayer key={id} kind="legendary" skillId={id} />;
}
