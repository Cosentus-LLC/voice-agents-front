"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  bullets,
  confirmLabel = "Delete",
  onConfirm,
  confirming = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: React.ReactNode
  /** Optional “What happens next” list; omit for a minimal confirm. */
  bullets?: string[]
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  confirming?: boolean
}) {
  const runConfirm = () => {
    void Promise.resolve(onConfirm()).catch(() => {})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden sm:max-w-[440px]">
        <div className="space-y-4 pb-2">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-foreground/85">
              {description}
            </DialogDescription>
          </DialogHeader>

          {bullets && bullets.length > 0 ? (
            <div className="rounded-xl border border-black/[0.06] bg-secondary/50 px-4 py-3.5">
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                What happens next
              </p>
              <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="-mx-6 -mb-6 mt-2 flex shrink-0 gap-3 rounded-b-2xl bg-secondary/20 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 basis-0 justify-center"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 basis-0 justify-center font-medium"
            onClick={runConfirm}
            disabled={confirming}
          >
            {confirming ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
