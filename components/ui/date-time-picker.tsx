"use client";

import { useState } from "react";
import { format, isBefore } from "date-fns";
import { CalendarIcon, ChevronLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateTimePicker } from "@/hooks/useDateTimePicker";
import { Label } from "@/components/ui/label";
import { ScrollableTimePicker } from "./scrollable-time-picker";

interface DateTimePickerProps {
  initialDate?: Date;
  onDateTimeChange?: (dateTime: Date | undefined) => void;
}

export function DateTimePicker({
  initialDate,
  onDateTimeChange,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
   const today = new Date();
   today.setHours(0, 0, 0, 0);
  const {
    date,
    hours,
    minutes,
    step,
    combinedDateTime,
    handleDateChange,
    handleHoursChange,
    handleMinutesChange,
    setStep,
  } = useDateTimePicker(initialDate);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("date");
      if (onDateTimeChange) {
        onDateTimeChange(combinedDateTime);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(combinedDateTime!, "PPP p")
          ) : (
            <span>Select date and time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {step === "date" && (
          <Calendar
            mode="single"
            selected={date}
            disabled={(date) => isBefore(date, today)}
            onSelect={handleDateChange}
            initialFocus
          />
        )}
        {step === "time" && (
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 mr-2"
                onClick={() => setStep("date")}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <h2 className="font-medium">{format(date!, "MMMM d, yyyy")}</h2>
            </div>
            <div className="flex space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="hours" className="text-xs font-medium">
                  Hours
                </Label>
                <ScrollableTimePicker
                  value={hours}
                  onChange={handleHoursChange}
                  min={0}
                  max={23}
                  step={1}
                  formatValue={(value) => value.toString().padStart(2, "0")}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="minutes" className="text-xs font-medium">
                  Minutes
                </Label>
                <ScrollableTimePicker
                  value={minutes}
                  onChange={handleMinutesChange}
                  min={0}
                  max={59}
                  step={1}
                  formatValue={(value) => value.toString().padStart(2, "0")}
                />
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
