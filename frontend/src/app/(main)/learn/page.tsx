import { LearnScreen } from "@/features/path/LearnScreen";

/** `/learn?done=<skillId>` is where a finished lesson returns; that node pops once. */
export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { done } = await searchParams;
  const highlightNodeId = typeof done === "string" && /^\d+$/.test(done) ? Number(done) : null;
  return <LearnScreen highlightNodeId={highlightNodeId} />;
}
