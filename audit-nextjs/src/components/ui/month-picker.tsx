"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MONTH_LABELS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

interface MonthPickerProps {
  /** เดือนที่เลือกอยู่ (ใช้แค่ปี/เดือน ไม่สนวันที่) */
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
}

/**
 * ตัวเลือกเดือน (ไม่มีวัน) — สไตล์เดียวกับ shadcn Calendar แต่แสดงเป็น grid 12 เดือน
 * เลือกปีด้วยลูกศรซ้าย/ขวา แล้วคลิกเดือนที่ต้องการ
 */
function MonthPicker({ selected, onSelect, className }: MonthPickerProps) {
  const [viewYear, setViewYear] = React.useState(
    () => selected?.getFullYear() ?? new Date().getFullYear()
  )

  const selectedYear = selected?.getFullYear();
  const selectedMonth = selected?.getMonth();

  return (
    <div className={cn("bg-background p-3 w-[240px]", className)}>
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setViewYear((y) => y - 1)}
          aria-label="ปีก่อนหน้า"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-sm font-medium select-none">
          {(viewYear + 543).toLocaleString("th-TH", { useGrouping: false })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setViewYear((y) => y + 1)}
          aria-label="ปีถัดไป"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_LABELS_TH.map((label, monthIndex) => {
          const isSelected = selectedYear === viewYear && selectedMonth === monthIndex;
          return (
            <Button
              key={monthIndex}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className="h-9"
              onClick={() => onSelect?.(new Date(viewYear, monthIndex, 1))}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  )
}

/** format เดือน/ปี พ.ศ. สำหรับแสดงบนปุ่ม trigger เช่น "กรกฎาคม 2569" */
function formatMonthLabel(date: Date): string {
  const monthName = date.toLocaleDateString("th-TH", { month: "long" });
  const buddhistYear = date.getFullYear() + 543;
  return `${monthName} ${buddhistYear}`;
}

export { MonthPicker, formatMonthLabel }
