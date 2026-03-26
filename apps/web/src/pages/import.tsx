import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowLeft, ArrowRight, Download } from 'lucide-react'
import type { ParsedRow, ConfirmRow, ImportPreview } from '@cuentas-claras/shared'
import { useParseImport, useConfirmImport } from '../lib/hooks/use-import'
import { useCategories } from '../lib/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Checkbox } from '@/components/ui/checkbox'

type Step = 'upload' | 'preview' | 'done'

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

export default function ImportPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [defaultType, setDefaultType] = useState<string>('expense')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ expenses: number; incomes: number } | null>(null)

  const parseMutation = useParseImport()
  const confirmMutation = useConfirmImport()
  const { data: categories = [] } = useCategories()

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  async function handleParse() {
    if (!file) return
    setError('')
    try {
      const data = await parseMutation.mutateAsync({ file, defaultType })
      setPreview(data)

      // Select all valid, non-duplicate rows that have a matched category
      const validIndices = new Set<number>()
      data.rows.forEach((row) => {
        if (row.errors.length === 0 && !row.isDuplicate && row.matchedCategoryId) {
          validIndices.add(row.rowIndex)
        }
      })
      setSelected(validIndices)
      setCategoryOverrides({})
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar archivo')
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setError('')

    const rows: ConfirmRow[] = preview.rows
      .filter((r) => selected.has(r.rowIndex))
      .map((r) => {
        const catId = categoryOverrides[r.rowIndex] || r.matchedCategoryId
        return {
          date: r.date!,
          amount: r.amount!,
          type: r.type,
          categoryId: catId!,
          description: r.description ?? undefined,
          source: r.source ?? undefined,
        }
      })

    if (rows.length === 0) {
      setError('No hay filas seleccionadas para importar')
      return
    }

    // Validate all selected rows have a category
    const missingCat = rows.some((r) => !r.categoryId)
    if (missingCat) {
      setError('Todas las filas seleccionadas necesitan una categoría asignada')
      return
    }

    try {
      const res = await confirmMutation.mutateAsync(rows)
      setResult(res.inserted)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    }
  }

  function toggleRow(rowIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  function selectAll() {
    if (!preview) return
    const all = new Set<number>()
    preview.rows.forEach((r) => {
      if (r.errors.length === 0) all.add(r.rowIndex)
    })
    setSelected(all)
  }

  function deselectDuplicates() {
    if (!preview) return
    setSelected((prev) => {
      const next = new Set(prev)
      preview.rows.forEach((r) => {
        if (r.isDuplicate) next.delete(r.rowIndex)
      })
      return next
    })
  }

  function overrideCategory(rowIndex: number, categoryId: string) {
    setCategoryOverrides((prev) => ({ ...prev, [rowIndex]: categoryId }))
  }

  function getRowStatus(row: ParsedRow): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' } {
    if (row.errors.length > 0) return { label: 'Error', variant: 'destructive' }
    if (row.isDuplicate) return { label: 'Duplicado', variant: 'secondary' }
    return { label: 'Válido', variant: 'default' }
  }

  function getCategoriesForType(type: 'expense' | 'income') {
    return type === 'expense' ? expenseCategories : incomeCategories
  }

  function downloadExample() {
    const BOM = '\uFEFF'
    const csv = [
      'fecha,monto,categoria,descripcion,tipo,fuente',
      '15/03/2026,1500.50,Supermercado,Compras semanales,gasto,',
      '15/03/2026,350,Transporte,SUBE,gasto,',
      '01/03/2026,85000,Salario,Sueldo marzo,ingreso,Empleo',
      '10/03/2026,12000,Freelance,Diseño web,ingreso,Cliente X',
    ].join('\n')
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ejemplo-importacion.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setSelected(new Set())
    setCategoryOverrides({})
    setError('')
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // --- UPLOAD STEP ---
  if (step === 'upload') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Importar datos</h1>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir archivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Archivo CSV o Excel</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Formatos: .csv, .xlsx, .xls (máx. 5MB).
                Columnas requeridas: fecha, monto.
                Opcionales: categoría, descripción, tipo, fuente.
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadExample}>
                <Download className="h-3 w-3" />
                Descargar archivo de ejemplo
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo por defecto</label>
              <Select value={defaultType} onValueChange={setDefaultType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gastos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="mixed">Mixto (usar columna tipo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleParse}
              disabled={!file || parseMutation.isPending}
              className="w-full"
            >
              {parseMutation.isPending ? 'Analizando...' : 'Analizar archivo'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- PREVIEW STEP ---
  if (step === 'preview' && preview) {
    const selectedCount = selected.size
    const selectedExpenses = preview.rows.filter((r) => selected.has(r.rowIndex) && r.type === 'expense').length
    const selectedIncomes = preview.rows.filter((r) => selected.has(r.rowIndex) && r.type === 'income').length

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Preview de importación</h1>
          <Button variant="outline" onClick={reset}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Total filas</p>
              <p className="text-2xl font-bold">{preview.summary.totalRows}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Válidas</p>
              <p className="text-2xl font-bold text-green-600">{preview.summary.validRows}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Con errores</p>
              <p className="text-2xl font-bold text-destructive">{preview.summary.errorRows}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Duplicados</p>
              <p className="text-2xl font-bold text-amber-600">{preview.summary.duplicateRows}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Seleccionadas</p>
              <p className="text-2xl font-bold text-primary">{selectedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Seleccionar válidas
          </Button>
          {preview.summary.duplicateRows > 0 && (
            <Button variant="outline" size="sm" onClick={deselectDuplicates}>
              Deseleccionar duplicados
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-x-auto mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-10">#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="min-w-[180px]">Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((row) => {
                const status = getRowStatus(row)
                const hasError = row.errors.length > 0
                const isSelected = selected.has(row.rowIndex)
                const currentCatId = categoryOverrides[row.rowIndex] || row.matchedCategoryId
                const typeCats = getCategoriesForType(row.type)

                return (
                  <TableRow
                    key={row.rowIndex}
                    className={hasError ? 'bg-destructive/5' : row.isDuplicate ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(row.rowIndex)}
                        disabled={hasError}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{row.rowIndex}</TableCell>
                    <TableCell>{row.date ? formatDate(row.date) : '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.amount !== null ? formatAmount(row.amount) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.type === 'expense' ? 'destructive' : 'default'}>
                        {row.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentCatId ?? '__none'}
                        onValueChange={(v) => overrideCategory(row.rowIndex, v === '__none' ? '' : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Sin categoría</SelectItem>
                          {typeCats.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.category && !row.matchedCategoryId && !categoryOverrides[row.rowIndex] && (
                        <p className="text-xs text-amber-600 mt-0.5">"{row.category}" no encontrada</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {row.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {row.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5">{row.errors.join(', ')}</p>
                      )}
                      {row.warnings.length > 0 && row.errors.length === 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">{row.warnings.join(', ')}</p>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Confirm bar */}
        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
          <p className="text-sm">
            Se importarán <strong>{selectedExpenses} gastos</strong> y <strong>{selectedIncomes} ingresos</strong>
          </p>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0 || confirmMutation.isPending}
          >
            {confirmMutation.isPending ? 'Importando...' : (
              <>
                <Check className="h-4 w-4" />
                Confirmar importación
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // --- DONE STEP ---
  if (step === 'done' && result) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Importación completada</h1>

        <Card className="max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Datos importados correctamente</p>
                <p className="text-sm text-muted-foreground">
                  {result.expenses > 0 && `${result.expenses} gastos`}
                  {result.expenses > 0 && result.incomes > 0 && ' y '}
                  {result.incomes > 0 && `${result.incomes} ingresos`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {result.expenses > 0 && (
                <Button variant="outline" onClick={() => navigate('/expenses')}>
                  <ArrowRight className="h-4 w-4" />
                  Ver gastos
                </Button>
              )}
              {result.incomes > 0 && (
                <Button variant="outline" onClick={() => navigate('/incomes')}>
                  <ArrowRight className="h-4 w-4" />
                  Ver ingresos
                </Button>
              )}
              <Button onClick={reset}>
                <Upload className="h-4 w-4" />
                Importar otro archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
