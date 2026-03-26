import React, { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import type { Income } from '@cuentas-claras/shared'
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../lib/hooks/use-incomes'
import { useCategories } from '../lib/hooks/use-categories'
import { useDebounce } from '../lib/hooks/use-debounce'
import { Pagination } from '../components/pagination'
import { MonthPicker } from '../components/month-picker'
import type { CreateIncomeData, UpdateIncomeData } from '../lib/api/incomes-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function toISODate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toISOString()
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

interface FormState {
  categoryId: string
  amount: string
  date: string
  source: string
  description: string
}

interface FilterState {
  categoryId: string
  description: string
  amountMin: string
  amountMax: string
  sortBy: 'date' | 'amount'
  sortOrder: 'asc' | 'desc'
}

function emptyForm(defaultCategoryId = ''): FormState {
  return {
    categoryId: defaultCategoryId,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    description: '',
  }
}

function emptyFilters(): FilterState {
  return { categoryId: '', description: '', amountMin: '', amountMax: '', sortBy: 'date', sortOrder: 'desc' }
}

export default function IncomesPage() {
  const [month, setMonth] = useState(currentMonth)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<FilterState>(emptyFilters())
  const [page, setPage] = useState(1)

  const FILTER_DEBOUNCE_MS = 400
  const debouncedDescription = useDebounce(filters.description, FILTER_DEBOUNCE_MS)

  const { data: categories = [] } = useCategories()
  const incomeCategories = categories.filter((c) => c.type === 'income')

  const queryParams = {
    month,
    page,
    categoryId: filters.categoryId || undefined,
    description: debouncedDescription || undefined,
    amountMin: filters.amountMin ? parseFloat(filters.amountMin) : undefined,
    amountMax: filters.amountMax ? parseFloat(filters.amountMax) : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  }

  const { data: result, isLoading } = useIncomes(queryParams)
  const incomes = result?.data ?? []
  const pagination = result?.pagination

  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()
  const deleteIncome = useDeleteIncome()

  function applyFilter(partial: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...partial }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(emptyFilters())
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setError('')
    setForm(emptyForm(incomeCategories[0]?.id ?? ''))
    setIsOpen(true)
  }

  function openEdit(income: Income) {
    setEditing(income)
    setError('')
    setForm({
      categoryId: income.categoryId,
      amount: String(income.amount),
      date: income.date.split('T')[0],
      source: income.source ?? '',
      description: income.description ?? '',
    })
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const data: CreateIncomeData | UpdateIncomeData = {
      categoryId: form.categoryId,
      amount: parseFloat(form.amount),
      date: toISODate(form.date),
      source: form.source || undefined,
      description: form.description || undefined,
    }

    try {
      if (editing) {
        await updateIncome.mutateAsync({ id: editing.id, data })
      } else {
        await createIncome.mutateAsync(data as CreateIncomeData)
      }
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este ingreso?')) return
    try {
      await deleteIncome.mutateAsync(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const isPending = createIncome.isPending || updateIncome.isPending
  const hasActiveFilters = filters.categoryId || debouncedDescription || filters.amountMin || filters.amountMax

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Ingresos</h1>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={(v) => { setMonth(v || currentMonth()); setPage(1) }} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo ingreso
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2 mb-3 p-3 bg-muted/40 rounded-lg border border-border">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Categoría</Label>
          <Select value={filters.categoryId} onValueChange={(v) => applyFilter({ categoryId: v === '__all' ? '' : v })}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {incomeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Descripción</Label>
          <Input
            type="text"
            value={filters.description}
            onChange={(e) => applyFilter({ description: e.target.value })}
            placeholder="Buscar..."
            className="h-9 w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Monto mín.</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={filters.amountMin}
            onChange={(e) => applyFilter({ amountMin: e.target.value })}
            placeholder="0.00"
            className="h-9 w-28"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Monto máx.</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={filters.amountMax}
            onChange={(e) => applyFilter({ amountMax: e.target.value })}
            placeholder="0.00"
            className="h-9 w-28"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Ordenar por</Label>
          <Select value={filters.sortBy} onValueChange={(v) => applyFilter({ sortBy: v as 'date' | 'amount' })}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Fecha</SelectItem>
              <SelectItem value="amount">Monto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Orden</Label>
          <Select value={filters.sortOrder} onValueChange={(v) => applyFilter({ sortOrder: v as 'asc' | 'desc' })}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mayor primero</SelectItem>
              <SelectItem value="asc">Menor primero</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="self-end h-9"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Summary */}
      {pagination && (
        <p className="text-sm text-muted-foreground mb-3">
          {pagination.total} {pagination.total === 1 ? 'resultado' : 'resultados'}
          {pagination.totalPages > 1 && ` — página ${pagination.page} de ${pagination.totalPages}`}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : incomes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay ingresos para este período.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell>{formatDate(income.date)}</TableCell>
                  <TableCell>{categoryMap[income.categoryId] ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{income.source ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{income.description ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatAmount(income.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(income)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(income.id)}
                        title="Eliminar"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ingreso' : 'Nuevo ingreso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fuente (opcional)</Label>
              <Input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Ej: empresa, freelance"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: sueldo marzo"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear ingreso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
