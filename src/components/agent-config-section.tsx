"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function AgentConfigSection({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group/section", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 px-4 py-4 text-left text-[14px] font-semibold outline-none transition-colors hover:bg-muted/40",
          "focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        <ChevronRight
          className="size-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-90"
          aria-hidden
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mx-3 mb-3 space-y-5 rounded-lg bg-white px-5 py-5">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
