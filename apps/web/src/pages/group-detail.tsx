import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Plus, Trash2, LogOut, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/lib/hooks/use-categories'
import {
  useGroupDetail,
  useGroupExpenses,
  useGroupSummary,
  useUpdateGroup,
  useDeleteGroup,
  useAddMember,
  useRemoveMember,
  useLeaveGroup,
  useCreateGroupExpense,
} from '@/lib/hooks/use-groups'
import { Pagination } from '@/components/pagination'
import { MonthPicker } from '@/components/month-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: group, isLoading } = useGroupDetail(id!)
  const isOwner = group?.members.some((m) => m.userId === user?.id && m.role === 'owner')

  // Expenses tab state
  const [month, setMonth] = useState(currentMonth)
  const [page, setPage] = useState(1)
  const { data: expensesResult } = useGroupExpenses(id!, { month, page })
  const expenses = expensesResult?.data ?? []
  const pagination = expensesResult?.pagination

  // Summary tab state
  const [summaryMonth, setSummaryMonth] = useState(currentMonth)
  const { data: summary } = useGroupSummary(id!, summaryMonth)

  // Categories
  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  // Dialog states
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })

  // Member form
  const [memberEmail, setMemberEmail] = useState('')

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', description: '' })

  // Mutations
  const createExpense = useCreateGroupExpense()
  const addMember = useAddMember()
  const removeMember = useRemoveMember()
  const leaveGroup = useLeaveGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()

  function openExpenseDialog() {
    setError('')
    setExpenseForm({
      categoryId: expenseCategories[0]?.id ?? '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    })
    setExpenseOpen(true)
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createExpense.mutateAsync({
        groupId: id!,
        data: {
          categoryId: expenseForm.categoryId,
          amount: parseFloat(expenseForm.amount),
          date: toISODate(expenseForm.date),
          description: expenseForm.description || undefined,
        },
      })
      setExpenseOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear gasto')
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await addMember.mutateAsync({ groupId: id!, email: memberEmail.trim() })
      setMemberOpen(false)
      setMemberEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar miembro')
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!window.confirm('¿Remover este miembro del grupo?')) return
    try {
      await removeMember.mutateAsync({ groupId: id!, userId })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al remover miembro')
    }
  }

  async function handleLeave() {
    if (!window.confirm('¿Salir del grupo?')) return
    try {
      await leaveGroup.mutateAsync(id!)
      navigate('/groups')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al salir del grupo')
    }
  }

  function openEditDialog() {
    if (!group) return
    setError('')
    setEditForm({ name: group.name, description: group.description ?? '' })
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateGroup.mutateAsync({
        id: id!,
        data: {
          name: editForm.name,
          description: editForm.description || undefined,
        },
      })
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar grupo')
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este grupo? Se perderán todos los datos del grupo.')) return
    try {
      await deleteGroup.mutateAsync(id!)
      navigate('/groups')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar grupo')
    }
  }

  async function copyInviteCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!group) {
    return <div className="text-center py-12 text-muted-foreground">Grupo no encontrado.</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              <Badge variant={isOwner ? 'default' : 'secondary'}>
                {isOwner ? 'Owner' : 'Miembro'}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        {/* ---- Gastos Tab ---- */}
        <TabsContent value="expenses" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <MonthPicker value={month} onChange={(v) => { setMonth(v || currentMonth()); setPage(1) }} />
            <Button onClick={openExpenseDialog}>
              <Plus className="h-4 w-4" />
              Nuevo gasto
            </Button>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay gastos para este período.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Pagó</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium">{expense.userName}</TableCell>
                      <TableCell>{categoryMap[expense.categoryId] ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{expense.description ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatAmount(expense.amount)}</TableCell>
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
        </TabsContent>

        {/* ---- Miembros Tab ---- */}
        <TabsContent value="members" className="mt-4">
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/40 rounded-lg border border-border">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Código de invitación</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">
                  {group.inviteCode}
                </code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyInviteCode}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setError(''); setMemberEmail(''); setMemberOpen(true) }}
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.name}</span>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                        {member.role === 'owner' ? 'Owner' : 'Miembro'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </div>
                {isOwner && member.userId !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---- Resumen Tab ---- */}
        <TabsContent value="summary" className="mt-4">
          <div className="mb-4">
            <MonthPicker value={summaryMonth} onChange={(v) => setSummaryMonth(v || currentMonth())} />
          </div>

          {summary && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total del mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatAmount(summary.totalExpenses)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Cantidad de gastos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{summary.expenseCount}</p>
                  </CardContent>
                </Card>
              </div>

              {summary.byMember.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Desglose por miembro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.byMember.map((m) => {
                      const pct = summary.totalExpenses > 0
                        ? Math.round((m.total / summary.totalExpenses) * 100)
                        : 0
                      return (
                        <div key={m.userId}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">
                              {formatAmount(m.total)} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo gasto del grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={expenseForm.categoryId}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, categoryId: v })}
              >
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
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                type="text"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Ej: Cena grupal"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createExpense.isPending}>
                {createExpense.isPending ? 'Creando...' : 'Crear gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar miembro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label>Email del usuario</Label>
              <Input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="usuario@email.com"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMemberOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? 'Agregando...' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                maxLength={500}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
