import React, { useState } from 'react'
import { Pencil, Trash2, Plus, Pause, Play } from 'lucide-react'
import type { RecurringExpense } from '@cuentas-claras/shared'
import { useRecurring, useCreateRecurring, useUpdateRecurring, useToggleRecurring, useDeleteRecurring } from '../lib/hooks/use-recurring'
import { useCategories } from '../lib/hooks/use-categories'
import type { CreateRecurringData, UpdateRecurringData } from '../lib/api/recurring-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  annual: 'Anual',
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

function toISODate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toISOString()
}

function isDueDatePast(isoStr: string) {
  return new Date(isoStr) < new Date()
}

interface FormState {
  categoryId: string
  amount: string
  description: string
  frequency: string
  nextDueDate: string
}

function emptyForm(defaultCategoryId = ''): FormState {
  return {
    categoryId: defaultCategoryId,
    amount: '',
    description: '',
    frequency: 'monthly',
    nextDueDate: new Date().toISOString().split('T')[0],
  }
}

function StatusBadge({ item }: { item: RecurringExpense }) {
  if (!item.isActive) {
    return <Badge variant="secondary">Pausado</Badge>
  }
  if (isDueDatePast(item.nextDueDate)) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Vencido</Badge>
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
}

export default function RecurringPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')

  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const { data: items = [], isLoading } = useRecurring()

  const createRecurring = useCreateRecurring()
  const updateRecurring = useUpdateRecurring()
  const toggleRecurring = useToggleRecurring()
  const deleteRecurring = useDeleteRecurring()

  function openCreate() {
    setEditing(null)
    setError('')
    setForm(emptyForm(expenseCategories[0]?.id ?? ''))
    setIsOpen(true)
  }

  function openEdit(item: RecurringExpense) {
    setEditing(item)
    setError('')
    setForm({
      categoryId: item.categoryId,
      amount: String(item.amount),
      description: item.description ?? '',
      frequency: item.frequency,
      nextDueDate: item.nextDueDate.split('T')[0],
    })
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const data: CreateRecurringData | UpdateRecurringData = {
      categoryId: form.categoryId,
      amount: parseFloat(form.amount),
      description: form.description || undefined,
      frequency: form.frequency as CreateRecurringData['frequency'],
      nextDueDate: toISODate(form.nextDueDate),
    }

    try {
      if (editing) {
        await updateRecurring.mutateAsync({ id: editing.id, data })
      } else {
        await createRecurring.mutateAsync(data as CreateRecurringData)
      }
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  async function handleToggle(id: string) {
    try {
      await toggleRecurring.mutateAsync(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este gasto recurrente?')) return
    try {
      await deleteRecurring.mutateAsync(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const isPending = createRecurring.isPending || updateRecurring.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Gastos Recurrentes</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo recurrente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay gastos recurrentes configurados.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Próxima fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description ?? '—'}</TableCell>
                  <TableCell>{categoryMap[item.categoryId] ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatAmount(item.amount)}</TableCell>
                  <TableCell>{FREQUENCY_LABELS[item.frequency] ?? item.frequency}</TableCell>
                  <TableCell>{formatDate(item.nextDueDate)}</TableCell>
                  <TableCell><StatusBadge item={item} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(item.id)}
                        title={item.isActive ? 'Pausar' : 'Activar'}
                      >
                        {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
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
              <Label>Descripción (opcional)</Label>
              <Input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Alquiler, Netflix"
              />
            </div>

            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Próxima fecha</Label>
              <Input
                type="date"
                value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear recurrente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
