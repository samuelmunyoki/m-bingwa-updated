import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScrollableTimePickerProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
}

export function ScrollableTimePicker({
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
}: ScrollableTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const selectedItem = containerRef.current.querySelector(
        '[aria-selected="true"]'
      );
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [value]);

  return (
    <ScrollArea className="h-32 w-full">
      <div ref={containerRef} className="space-y-1 p-1">
        {Array.from({ length: (max - min) / step + 1 }).map((_, index) => {
          const itemValue = min + index * step;
          return (
            <div
              key={itemValue}
              className={cn(
                "py-1.5 px-2 rounded-sm text-sm cursor-pointer text-center transition-colors",
                itemValue === value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
              onClick={() => onChange(itemValue)}
              aria-selected={itemValue === value}
            >
              {formatValue(itemValue)}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
