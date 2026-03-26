import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr',
  'May', 'Jun', 'Jul', 'Ago',
  'Sep', 'Oct', 'Nov', 'Dic',
]

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface MonthPickerProps {
  value: string // YYYY-MM
  onChange: (value: string) => void
}

function toYearMonth(value: string): { year: number; month: number } {
  const [y, m] = value.split('-').map(Number)
  return { year: y, month: m }
}

function toValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const { year: selYear, month: selMonth } = toYearMonth(value)
  const [open, setOpen] = useState(false)
  const [navYear, setNavYear] = useState(selYear)

  function handleSelect(month: number) {
    onChange(toValue(navYear, month))
    setOpen(false)
  }

  function handleThisMonth() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    setNavYear(y)
    onChange(toValue(y, m))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setNavYear(selYear) }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 font-normal">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {MONTHS_LONG[selMonth - 1]} {selYear}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setNavYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{navYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setNavYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {MONTHS.map((label, i) => {
            const m = i + 1
            const isSelected = navYear === selYear && m === selMonth
            return (
              <button
                key={m}
                onClick={() => handleSelect(m)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-accent hover:text-accent-foreground text-foreground',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-border pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 text-xs px-2"
            onClick={() => { onChange(''); setOpen(false) }}
          >
            Limpiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleThisMonth}
          >
            Este mes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
