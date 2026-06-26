"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;

interface ScrollColumnProps {
  values: string[];
  selected: string;
  onSelect: (val: string) => void;
  label: string;
}

function ScrollColumn({ values, selected, onSelect, label }: ScrollColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      containerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior });
    },
    []
  );

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) scrollToIndex(idx, "instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const idx = values.indexOf(selected);
    if (idx >= 0) scrollToIndex(idx, "smooth");
  }, [selected, values, scrollToIndex]);

  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const idx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(idx, 0), values.length - 1);
      scrollToIndex(clamped, "smooth");
      onSelect(values[clamped]);
      isUserScrollingRef.current = false;
    }, 120);
  }, [values, onSelect, scrollToIndex]);

  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}>
        {/* Top separator line */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-border/50 z-20"
          style={{ top: ITEM_HEIGHT * 2 }}
        />
        {/* Bottom separator line */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-border/50 z-20"
          style={{ top: ITEM_HEIGHT * 3 }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-popover to-transparent"
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-popover to-transparent"
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />
        <div
          ref={containerRef}
          className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
          onScroll={handleScroll}
        >
          <div style={{ height: ITEM_HEIGHT * 2 }} />
          {values.map((val) => (
            <div
              key={val}
              className={cn(
                "flex items-center justify-center cursor-pointer select-none transition-all duration-100 font-mono text-sm",
                val === selected
                  ? "font-bold text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                scrollToIndex(values.indexOf(val), "smooth");
                onSelect(val);
              }}
            >
              {val}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </div>
      </div>
    </div>
  );
}

interface TimePickerScrollProps {
  date: Date | undefined;
  onTimeChange: (date: Date) => void;
}

export function TimePickerScroll({ date, onTimeChange }: TimePickerScrollProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const selectedHour = (date?.getHours() ?? 0).toString().padStart(2, "0");
  const selectedMinute = (date?.getMinutes() ?? 0).toString().padStart(2, "0");

  const handleHourSelect = (hour: string) => {
    const d = date ? new Date(date) : new Date();
    d.setHours(parseInt(hour), d.getMinutes(), 0, 0);
    onTimeChange(d);
  };

  const handleMinuteSelect = (minute: string) => {
    const d = date ? new Date(date) : new Date();
    d.setHours(d.getHours(), parseInt(minute), 0, 0);
    onTimeChange(d);
  };

  return (
    <div className="flex items-center justify-center gap-2 border-t pt-2 mt-1">
      <ScrollColumn
        values={hours}
        selected={selectedHour}
        onSelect={handleHourSelect}
        label="ชั่วโมง"
      />
      <span className="text-xl font-bold text-muted-foreground mt-5">:</span>
      <ScrollColumn
        values={minutes}
        selected={selectedMinute}
        onSelect={handleMinuteSelect}
        label="นาที"
      />
    </div>
  );
}
