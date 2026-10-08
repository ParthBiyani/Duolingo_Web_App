"use client";

import { Mascot } from "@/components/mascot";
import { Button, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { isUnexpectedError, useClaimChest, usePath, type PathNode } from "@/lib/api";

import { LearningPath } from "./LearningPath";
import { PathSkeleton } from "./PathSkeleton";
import { pathStrings } from "./strings";

/**
 * Learn page container: loads the path, owns the chest mutation and the placeholder actions,
 * and leaves all drawing to LearningPath.
 */
export function LearnScreen({ highlightNodeId }: { highlightNodeId: number | null }) {
  const path = usePath();
  const claimChest = useClaimChest();

  const openChest = async (node: PathNode) => {
    try {
      const result = await claimChest.mutateAsync(node.id);
      toast.success(pathStrings.chestReward(result.reward));
      return true;
    } catch (error) {
      // Network and server failures are already reported by the shared mutation handler.
      if (!isUnexpectedError(error)) toast.error(pathStrings.chestFailed);
      return false;
    }
  };

  const showGuidebook = () => toast(strings.common.comingSoon, { id: "guidebook" });

  if (path.isPending) return <PathSkeleton />;

  if (path.isError) {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-[592px] flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <Mascot pose="sad" size={140} />
        <h1 className="text-heading text-title">{pathStrings.loadErrorTitle}</h1>
        <p className="text-muted">{pathStrings.loadErrorBody}</p>
        <Button variant="secondary" loading={path.isFetching} onClick={() => void path.refetch()}>
          {pathStrings.retry}
        </Button>
      </div>
    );
  }

  if (path.data.units.length === 0) {
    return <p className="py-16 text-center text-muted">{pathStrings.empty}</p>;
  }

  return (
    <LearningPath
      path={path.data}
      highlightNodeId={highlightNodeId}
      onGuidebook={showGuidebook}
      onOpenChest={openChest}
    />
  );
}
