"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/date-utils";

export function RelativeTime({ date }: { date: Date | string }) {
  const [text, setText] = useState(() => formatRelativeTime(date));

  useEffect(() => {
    setText(formatRelativeTime(date));
    const interval = setInterval(() => setText(formatRelativeTime(date)), 30000);
    return () => clearInterval(interval);
  }, [date]);

  return <span>{text}</span>;
}
