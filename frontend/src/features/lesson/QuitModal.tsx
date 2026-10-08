"use client";

import { Mascot } from "@/components/mascot";
import { Button, Modal, ModalDescription, ModalTitle } from "@/components/ui";

import { lessonStrings } from "./strings";

interface QuitModalProps {
  open: boolean;
  onKeepLearning: () => void;
  onEndSession: () => void;
}

/** Shown on X or Escape: KEEP LEARNING (blue) closes it, END SESSION (red text) quits. */
export function QuitModal({ open, onKeepLearning, onEndSession }: QuitModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeepLearning();
      }}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <Mascot pose="sad" size={140} />
        <div>
          <ModalTitle>{lessonStrings.quitTitle}</ModalTitle>
          <ModalDescription>{lessonStrings.quitBody}</ModalDescription>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={onKeepLearning}>
            {lessonStrings.keepLearning}
          </Button>
          <Button variant="ghost" size="lg" fullWidth className="text-red" onClick={onEndSession}>
            {lessonStrings.endSession}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
