import React, { useState } from 'react'
import { useExpenses } from '../lib/hooks/use-expenses'
import { useIncomes } from '../lib/hooks/use-incomes'
import { useCategories } from '../lib/hooks/use-categories'
import { useDashboardSummary, useDashboardByCategory, useRecurringUpcoming } from '../lib/hooks/use-dashboard'
import { SectionCards } from '@/components/section-cards'
import { MonthPicker } from '@/components/month-picker'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short' })
}

function dueBadgeVariant(days: number) {
  if (days === 0) return 'destructive' as const
  if (days <= 3) return 'secondary' as const
  return 'outline' as const
}

function dueBadgeClass(days: number) {
  if (days === 0) return ''
  if (days <= 3) return 'text-amber-600 border-amber-400'
  return 'text-green-600 border-green-400'
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth())

  const { data: summary } = useDashboardSummary(month)
  const { data: categoryBreakdown = [] } = useDashboardByCategory(month)
  const { data: upcoming = [] } = useRecurringUpcoming()

  // For the chart and recent transactions table
  const { data: expensesResult } = useExpenses({ month })
  const { data: incomesResult } = useIncomes({ month })
  const { data: categories = [] } = useCategories()

  const expenses = expensesResult?.data ?? []
  const incomes = incomesResult?.data ?? []
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  const recentIncomes = [...incomes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-end px-4 lg:px-6">
        <MonthPicker value={month} onChange={(v) => setMonth(v || currentMonth())} />
      </div>
      <SectionCards
        totalExpenses={summary?.totalExpenses ?? 0}
        totalIncomes={summary?.totalIncomes ?? 0}
        balance={summary?.balance ?? 0}
        expenseVariation={summary?.expenseVariation ?? null}
        incomeVariation={summary?.incomeVariation ?? null}
        avgDailyExpense={summary?.avgDailyExpense ?? 0}
      />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive
          expenses={expenses}
          incomes={incomes}
          month={month}
        />
      </div>

      {/* KPI widgets */}
      <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6">
        {/* Top 5 categorías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top categorías del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground text-center">
                Sin gastos este mes
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium truncate">{cat.categoryName}</div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <div className="text-right text-sm tabular-nums w-24 shrink-0">
                      {formatAmount(cat.total)}
                    </div>
                    <div className="text-xs text-muted-foreground w-10 shrink-0 text-right">
                      {cat.percentage.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos vencimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos vencimientos (7 días)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground text-center">
                Sin vencimientos en los próximos 7 días
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">
                        {r.description ?? r.categoryName}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatAmount(r.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(r.nextDueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={dueBadgeVariant(r.daysUntilDue)}
                          className={`text-xs ${dueBadgeClass(r.daysUntilDue)}`}
                        >
                          {r.daysUntilDue === 0 ? 'Hoy' : `${r.daysUntilDue}d`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos gastos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentExpenses.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground text-center">
                Sin gastos este mes
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {categoryMap[e.categoryId] ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-destructive">
                        -{formatAmount(e.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos ingresos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentIncomes.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground text-center">
                Sin ingresos este mes
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIncomes.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(i.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {categoryMap[i.categoryId] ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-600">
                        +{formatAmount(i.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
