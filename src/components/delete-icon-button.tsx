"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Black icon by default; light red background + red icon on hover. */
export function DeleteIconButton({
  className,
  title = "Delete",
  iconClassName,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
  iconClassName?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={title}
      aria-label={title}
      className={cn(
        "text-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:text-current",
        className
      )}
      {...props}
    >
      {children ?? <Trash2 size={14} className={cn("shrink-0", iconClassName)} />}
    </Button>
  )
}
