"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Heading announced as the dialog's name. Omit it and render <ModalTitle> for custom layouts. */
  title?: ReactNode;
  /** Keeps the title for screen readers only. */
  hideTitle?: boolean;
  description?: ReactNode;
  /** When false, Escape and outside clicks do not close the dialog. Defaults to true. */
  dismissible?: boolean;
  className?: string;
}

/**
 * Centred 384px card on a dimmed backdrop (Radix Dialog): focus is trapped
 * inside, restored to the trigger on close, and the page behind is inert.
 */
export function Modal({
  open,
  onOpenChange,
  children,
  title,
  hideTitle = false,
  description,
  dismissible = true,
  className,
}: ModalProps) {
  const blockDismiss = dismissible ? undefined : (event: Event) => event.preventDefault();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-overlay" />
        <DialogPrimitive.Content
          className={cn("ui-modal", className)}
          onEscapeKeyDown={blockDismiss}
          onPointerDownOutside={blockDismiss}
          onInteractOutside={blockDismiss}
        >
          {title !== undefined ? (
            <ModalTitle className={hideTitle ? "sr-only" : undefined}>{title}</ModalTitle>
          ) : null}
          {description !== undefined ? <ModalDescription>{description}</ModalDescription> : null}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ModalTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("ui-modal-title", className)} {...props} />;
}

export function ModalDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("ui-modal-description", className)} {...props} />
  );
}

/** Closes the surrounding Modal; wrap a Button with `asChild`. */
export const ModalClose = DialogPrimitive.Close;
