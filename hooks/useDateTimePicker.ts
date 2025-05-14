import { useState } from "react";

export function useDateTimePicker(initialDate?: Date) {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [hours, setHours] = useState<number>(
    initialDate ? initialDate.getHours() : 0
  );
  const [minutes, setMinutes] = useState<number>(
    initialDate ? Math.floor(initialDate.getMinutes() / 5) * 5 : 0
  );
  const [step, setStep] = useState<"date" | "time">("date");

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      setStep("time");
      if (hours === 0 && minutes === 0) {
        setHours(new Date().getHours());
        setMinutes(Math.floor(new Date().getMinutes() / 5) * 5);
      }
    }
  };

  const handleHoursChange = (newHours: number) => {
    setHours(newHours);
    if (!date) setDate(new Date());
  };

  const handleMinutesChange = (newMinutes: number) => {
    setMinutes(newMinutes);
    if (!date) setDate(new Date());
  };

  const combinedDateTime = date
    ? new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes
      )
    : undefined;

  return {
    date,
    hours,
    minutes,
    step,
    combinedDateTime,
    handleDateChange,
    handleHoursChange,
    handleMinutesChange,
    setStep,
  };
}
