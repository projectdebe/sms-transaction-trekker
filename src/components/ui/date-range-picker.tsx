import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerWithRangeProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
}: DatePickerWithRangeProps) {
  const predefinedRanges = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "custom": "Custom Range",
    "month": "Select Month"
  }

  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    format(new Date(), 'yyyy-MM')
  )

  const months = React.useMemo(() => {
    const result = []
    const today = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      result.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      })
    }
    return result
  }, [])

  const handleRangeSelect = (value: string) => {
    const today = new Date()
    switch (value) {
      case "7d":
        onDateChange({
          from: subDays(today, 7),
          to: today
        })
        break
      case "30d":
        onDateChange({
          from: subDays(today, 30),
          to: today
        })
        break
      case "90d":
        onDateChange({
          from: subDays(today, 90),
          to: today
        })
        break
      case "month":
        // Keep the month selection UI open but don't change the date yet
        break
      case "custom":
        // Keep current date range if exists, otherwise set to undefined
        onDateChange(date)
        break
    }
  }

  const handleMonthSelect = (monthValue: string) => {
    const [year, month] = monthValue.split('-').map(Number)
    const monthDate = new Date(year, month - 1)
    onDateChange({
      from: startOfMonth(monthDate),
      to: endOfMonth(monthDate)
    })
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <Select 
              onValueChange={handleRangeSelect}
              defaultValue="custom"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(predefinedRanges).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={handleMonthSelect}
              value={selectedMonth}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedMonth(format(new Date(), 'yyyy-MM'))
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
