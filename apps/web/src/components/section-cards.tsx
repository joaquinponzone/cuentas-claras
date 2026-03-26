import { TrendingDownIcon, TrendingUpIcon, WalletIcon, CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

interface SectionCardsProps {
  totalExpenses: number
  totalIncomes: number
  balance: number
  expenseVariation: number | null
  incomeVariation: number | null
  avgDailyExpense: number
}

export function SectionCards({
  totalExpenses,
  totalIncomes,
  balance,
  expenseVariation,
  incomeVariation,
  avgDailyExpense,
}: SectionCardsProps) {
  const expensePct = expenseVariation
  const incomePct = incomeVariation
  const savingsRate = totalIncomes > 0 ? ((totalIncomes - totalExpenses) / totalIncomes) * 100 : 0

  return (
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      {/* Gastos */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Gastos del mes</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {formatAmount(totalExpenses)}
          </CardTitle>
          {expensePct !== null && (
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="flex gap-1 rounded-lg text-xs"
              >
                {expensePct > 0 ? (
                  <TrendingUpIcon className="size-3 text-destructive" />
                ) : (
                  <TrendingDownIcon className="size-3 text-green-600" />
                )}
                {expensePct > 0 ? '+' : ''}{expensePct.toFixed(1)}%
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {expensePct === null
              ? 'Sin datos del mes anterior'
              : expensePct > 0
                ? `Subió vs. mes anterior`
                : `Bajó vs. mes anterior`}
            {expensePct !== null && expensePct > 0
              ? <TrendingUpIcon className="size-4 text-destructive" />
              : expensePct !== null && <TrendingDownIcon className="size-4 text-green-600" />}
          </div>
          <div className="text-muted-foreground">Comparado con el mes pasado</div>
        </CardFooter>
      </Card>

      {/* Ingresos */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Ingresos del mes</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {formatAmount(totalIncomes)}
          </CardTitle>
          {incomePct !== null && (
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="flex gap-1 rounded-lg text-xs"
              >
                {incomePct >= 0 ? (
                  <TrendingUpIcon className="size-3 text-green-600" />
                ) : (
                  <TrendingDownIcon className="size-3 text-destructive" />
                )}
                {incomePct > 0 ? '+' : ''}{incomePct.toFixed(1)}%
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {incomePct === null
              ? 'Sin datos del mes anterior'
              : incomePct >= 0
                ? `Subió vs. mes anterior`
                : `Bajó vs. mes anterior`}
            {incomePct !== null && incomePct >= 0
              ? <TrendingUpIcon className="size-4 text-green-600" />
              : incomePct !== null && <TrendingDownIcon className="size-4 text-destructive" />}
          </div>
          <div className="text-muted-foreground">Comparado con el mes pasado</div>
        </CardFooter>
      </Card>

      {/* Balance */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Balance</CardDescription>
          <CardTitle
            className={`@[250px]/card:text-3xl text-2xl font-semibold tabular-nums ${
              balance >= 0 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {formatAmount(balance)}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <WalletIcon className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {balance >= 0 ? 'Superávit este mes' : 'Déficit este mes'}
            {balance >= 0
              ? <TrendingUpIcon className="size-4 text-green-600" />
              : <TrendingDownIcon className="size-4 text-destructive" />}
          </div>
          <div className="text-muted-foreground">Ingresos menos gastos</div>
        </CardFooter>
      </Card>

      {/* Promedio diario */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Gasto diario promedio</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {formatAmount(avgDailyExpense)}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <CalendarIcon className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {savingsRate >= 20
              ? 'Ahorro excelente'
              : savingsRate >= 10
                ? 'Ahorro moderado'
                : savingsRate >= 0
                  ? 'Ahorro bajo'
                  : 'Déficit este mes'}
          </div>
          <div className="text-muted-foreground">Tasa de ahorro: {savingsRate.toFixed(1)}%</div>
        </CardFooter>
      </Card>
    </div>
  )
}
