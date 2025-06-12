"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleGroupProps {
  type?: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  className?: string
  children?: React.ReactNode
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ type = "single", value, onValueChange, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex rounded-md shadow-sm", className)}
        role="group"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              isSelected: type === "single" ? value === child.props.value : value?.includes(child.props.value),
              onClick: () => {
                if (type === "single") {
                  onValueChange?.(child.props.value)
                } else {
                  const currentValue = value as string[] || []
                  const newValue = currentValue.includes(child.props.value)
                    ? currentValue.filter(v => v !== child.props.value)
                    : [...currentValue, child.props.value]
                  onValueChange?.(newValue)
                }
              }
            })
          }
          return child
        })}
      </div>
    )
  }
)

ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps {
  value: string
  isSelected?: boolean
  onClick?: () => void
  className?: string
  children?: React.ReactNode
  "aria-label"?: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, isSelected, onClick, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors",
          "first:rounded-l-md last:rounded-r-md",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-background hover:bg-muted border border-input",
          className
        )}
        data-state={isSelected ? "on" : "off"}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem } 