import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCategories, useCreateCategory, useDeleteCategory } from '../lib/hooks/use-categories'
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NewCategoryForm {
  name: string
  type: 'expense' | 'income'
}

export default function CategoriesPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<NewCategoryForm>({ name: '', type: 'expense' })
  const [error, setError] = useState('')

  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  function openCreate() {
    setForm({ name: '', type: 'expense' })
    setError('')
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createCategory.mutateAsync({ name: form.name, type: form.type })
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear categoría')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la categoría "${name}"?`)) return
    try {
      await deleteCategory.mutateAsync(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CategoryList title="Gastos" categories={expenseCategories} onDelete={handleDelete} />
        <CategoryList title="Ingresos" categories={incomeCategories} onDelete={handleDelete} />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: Transporte"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'expense' | 'income' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface Category {
  id: string
  name: string
  isDefault: boolean
}

function CategoryList({
  title,
  categories,
  onDelete,
}: {
  title: string
  categories: Category[]
  onDelete: (id: string, name: string) => void
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      {categories.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">Sin categorías</p>
      ) : (
        <ul className="divide-y divide-border">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{cat.name}</span>
                {cat.isDefault && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              {!cat.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(cat.id, cat.name)}
                  title="Eliminar"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
