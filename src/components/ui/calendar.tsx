"use client"

import * as React from "react"
import { DayPicker, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium",
        dropdowns: "flex items-center justify-center gap-1 text-sm font-medium",
        dropdown_root: "relative rounded-md border border-border bg-popover px-2 py-1",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        nav: "absolute inset-x-0 top-1 flex items-center justify-between",
        button_previous: "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40",
        button_next: "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-center text-xs font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button: "inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        today: "font-bold text-primary",
        outside: "text-muted-foreground opacity-40",
        disabled: "pointer-events-none text-muted-foreground opacity-30",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        range_start: "rounded-l-md bg-primary text-primary-foreground",
        range_middle: "rounded-none bg-accent text-accent-foreground",
        range_end: "rounded-r-md bg-primary text-primary-foreground",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Calendar }
