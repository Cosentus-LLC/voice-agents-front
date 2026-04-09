"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col",
        month: "flex flex-col gap-4",
        month_caption: "flex items-center justify-center h-8",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        button_next:
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-1 flex",
        day: "relative p-0 text-center text-sm",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-md font-normal transition-colors hover:bg-accent hover:text-foreground aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary",
        today: "font-semibold",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
