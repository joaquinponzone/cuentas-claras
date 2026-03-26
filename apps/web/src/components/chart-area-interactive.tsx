import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Expense, Income } from "@cuentas-claras/shared"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  gastos: {
    label: "Gastos",
    color: "hsl(var(--chart-3))",
  },
  ingresos: {
    label: "Ingresos",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

function toDayKey(isoStr: string) {
  return isoStr.split("T")[0]
}

function buildDailyData(
  expenses: Expense[],
  incomes: Income[],
  month: string,
) {
  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  const expenseByDay: Record<string, number> = {}
  const incomeByDay: Record<string, number> = {}

  for (const e of expenses) {
    const day = toDayKey(e.date)
    expenseByDay[day] = (expenseByDay[day] ?? 0) + e.amount
  }
  for (const i of incomes) {
    const day = toDayKey(i.date)
    incomeByDay[day] = (incomeByDay[day] ?? 0) + i.amount
  }

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0")
    const date = `${month}-${day}`
    return {
      date,
      gastos: expenseByDay[date] ?? 0,
      ingresos: incomeByDay[date] ?? 0,
    }
  })
}

interface ChartAreaInteractiveProps {
  expenses: Expense[]
  incomes: Income[]
  month: string
}

export function ChartAreaInteractive({ expenses, incomes, month }: ChartAreaInteractiveProps) {
  const data = React.useMemo(
    () => buildDailyData(expenses, incomes, month),
    [expenses, incomes, month],
  )

  const [y, m] = month.split("-").map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardTitle>Gastos vs. Ingresos</CardTitle>
        <CardDescription className="capitalize">{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ingresos)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-ingresos)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-gastos)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-gastos)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(v) =>
                new Date(v + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat("es-AR", { notation: "compact", currency: "ARS" }).format(v)
              }
              width={60}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(v) =>
                    new Date(v + "T12:00:00").toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  }
                  formatter={(value) =>
                    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      Number(value),
                    )
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="ingresos"
              type="monotone"
              fill="url(#fillIngresos)"
              stroke="var(--color-ingresos)"
              stackId="a"
            />
            <Area
              dataKey="gastos"
              type="monotone"
              fill="url(#fillGastos)"
              stroke="var(--color-gastos)"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
