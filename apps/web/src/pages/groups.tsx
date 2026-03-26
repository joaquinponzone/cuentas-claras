import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, LogIn, Users } from 'lucide-react'
import { useGroups, useCreateGroup, useJoinGroup } from '../lib/hooks/use-groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function GroupsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const { data: groups = [], isLoading } = useGroups()
  const createGroup = useCreateGroup()
  const joinGroup = useJoinGroup()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createGroup.mutateAsync({
        name: createForm.name,
        description: createForm.description || undefined,
      })
      setCreateOpen(false)
      setCreateForm({ name: '', description: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear grupo')
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await joinGroup.mutateAsync(joinCode.trim())
      setJoinOpen(false)
      setJoinCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setError(''); setJoinCode(''); setJoinOpen(true) }}>
            <LogIn className="h-4 w-4" />
            Unirse
          </Button>
          <Button onClick={() => { setError(''); setCreateForm({ name: '', description: '' }); setCreateOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nuevo grupo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No perteneces a ningún grupo.</p>
          <p className="text-sm mt-1">Crea uno nuevo o únete con un código de invitación.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  {group.description && (
                    <CardDescription className="line-clamp-2">{group.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ej: Familia, Departamento"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Ej: Gastos del hogar"
                maxLength={500}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? 'Creando...' : 'Crear grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unirse a un grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label>Código de invitación</Label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Ej: Ab3kMn7p"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setJoinOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={joinGroup.isPending}>
                {joinGroup.isPending ? 'Uniéndose...' : 'Unirse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
