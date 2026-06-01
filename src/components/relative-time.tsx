"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getRelativeTimeParts } from "@/lib/date-utils";

export function RelativeTime({ date }: { date: Date | string }) {
  const t = useTranslations("relativeTime");
  const [parts, setParts] = useState(() => getRelativeTimeParts(date));

  useEffect(() => {
    setParts(getRelativeTimeParts(date));
    const interval = setInterval(() => setParts(getRelativeTimeParts(date)), 30000);
    return () => clearInterval(interval);
  }, [date]);

  return <span>{t(parts.unit, { count: parts.count })}</span>;
}
