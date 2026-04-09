"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { TestCallPanel } from "@/components/test-call-panel"

export type TestCallModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string
  displayName: string
  isDraft: boolean
  /** From draft system prompt `{{var}}` scan; optional */
  promptVariables?: string[]
}

/** Optional modal wrapper around {@link TestCallPanel} for flows that need a dialog. */
export function TestCallModal({
  open,
  onOpenChange,
  agentName,
  displayName,
  isDraft,
  promptVariables = [],
}: TestCallModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-4 sm:max-w-md">
        {open ? (
          <TestCallPanel
            agentName={agentName}
            displayName={displayName}
            isDraft={isDraft}
            promptVariables={promptVariables}
            immediateStart
            autoCloseEndedMs={3000}
            onRequestClose={() => onOpenChange(false)}
            className="min-h-0 flex-1 border-0 bg-transparent shadow-none"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
