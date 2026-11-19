import { useState, type FormEvent } from 'react'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Heading, Icon, LoadingState, Modal, PageIntro, Select, TextInput, useToast, type Tone,
} from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { formatFCCompact, formatNumber } from '@/lib/format'
import { hasErrors, integer, minLength, positiveNumber, required, validate, type Errors } from '@/lib/validation'
import { warehousesService, type WarehouseInput } from '@/services'
import type { Warehouse, WarehouseStatus } from '@/types/domain'

const statusTone: Record<WarehouseStatus, Tone> = { Opérationnel: 'success', 'Presque saturé': 'warning', 'En maintenance': 'danger' }

interface FormValues { name: string; city: string; manager: string; capacity: string; status: WarehouseStatus }

const toValues = (w?: Warehouse): FormValues => ({
  name: w?.name ?? '', city: w?.city ?? '', manager: w?.manager ?? '', capacity: w ? String(w.capacity) : '', status: w?.status ?? 'Opérationnel',
})

function WarehouseForm({ initial, onCancel, onSubmit }: { initial?: Warehouse; onCancel: () => void; onSubmit: (input: WarehouseInput) => Promise<void> }) {
  const [values, setValues] = useState<FormValues>(() => toValues(initial))
  const [errors, setErrors] = useState<Errors<FormValues>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const set = (key: keyof FormValues) => (value: string) => setValues(v => ({ ...v, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values, {
      name: [required(), minLength(3)], city: [required()], manager: [required()],
      capacity: [positiveNumber('Saisissez une capacité supérieure à 0 m².'), integer()],
    })
    setErrors(found)
    if (hasErrors(found)) return
    setSubmitting(true)
    setFormError('')
    try {
      await onSubmit({ name: values.name, city: values.city.trim(), manager: values.manager.trim(), capacity: Number(values.capacity), status: values.status })
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {formError && <p className="form-banner form-banner-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <Field label="Nom de l’entrepôt" required error={errors.name}>{p => <TextInput {...p} value={values.name} onChange={e => set('name')(e.target.value)} />}</Field>
        <Field label="Localisation" required error={errors.city}>{p => <TextInput {...p} value={values.city} onChange={e => set('city')(e.target.value)} placeholder="Ville" />}</Field>
        <Field label="Responsable" required error={errors.manager}>{p => <TextInput {...p} value={values.manager} onChange={e => set('manager')(e.target.value)} />}</Field>
        <Field label="Capacité (m²)" required error={errors.capacity}>{p => <TextInput {...p} type="number" min={1} inputMode="numeric" value={values.capacity} onChange={e => set('capacity')(e.target.value)} />}</Field>
        <Field label="Statut">{p => (
          <Select {...p} value={values.status} onChange={e => set('status')(e.target.value)}>
            {(Object.keys(statusTone) as WarehouseStatus[]).map(s => <option key={s}>{s}</option>)}
          </Select>
        )}</Field>
      </div>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={submitting}>{initial ? 'Enregistrer les modifications' : 'Enregistrer l’entrepôt'}</Button>
      </div>
    </form>
  )
}

export default function Warehouses() {
  const notify = useToast()
  const warehouses = useAsync(() => warehousesService.list())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="page">
      <PageIntro title="Entrepôts" description={`Gestion des entrepôts · ${warehouses.data?.length ?? '…'} sites physiques en République démocratique du Congo`}>
        <Button onClick={() => setAdding(true)}><Icon name="plus" className="h-4 w-4" />Ajouter un entrepôt</Button>
      </PageIntro>

      {warehouses.status === 'error' && <ErrorState message={warehouses.error} onRetry={warehouses.reload} />}
      {warehouses.status === 'loading' && !warehouses.data && <LoadingState />}
      {warehouses.data?.length === 0 && <EmptyState icon="warehouse" title="Aucun entrepôt" message="Ajoutez votre premier site de stockage." />}

      <div className="warehouse-grid">
        {warehouses.data?.map(w => {
          const pct = Math.round((w.used / w.capacity) * 100)
          const open = expanded === w.id
          return (
            <Card key={w.id} className="warehouse-card">
              <div className="warehouse-top">
                <div>
                  <span className="mono accent-text warehouse-id">{w.id}</span>
                  <Heading level={3}>{w.name}</Heading>
                  <p>{w.city}, {w.country}</p>
                </div>
                <Badge tone={statusTone[w.status]}>{w.status}</Badge>
              </div>
              <div className="capacity">
                <div className="capacity-head"><span>Capacité utilisée</span><strong>{pct} %</strong></div>
                <span className="stock-bar stock-bar-wide" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Capacité utilisée : ${pct} %`}>
                  <b className={pct > 80 ? 'stock-bar-Faible' : 'stock-bar-accent'} style={{ width: `${Math.min(pct, 100)}%` }} />
                </span>
                <div className="capacity-foot"><span>{formatNumber(w.used)} m²</span><span>{formatNumber(w.capacity)} m²</span></div>
              </div>
              <div className="warehouse-stats">
                <div><strong>{formatNumber(w.skus)}</strong><span>Références actives</span></div>
                <div><strong>{w.manager}</strong><span>Responsable</span></div>
                <div className="text-right"><strong>{formatFCCompact(w.stockValue)}</strong><span>Valeur du stock</span></div>
              </div>
              <div className="warehouse-actions">
                <Button variant="secondary" className="flex-1" onClick={() => setExpanded(open ? null : w.id)} aria-expanded={open} aria-controls={`details-${w.id}`}>
                  {open ? 'Masquer les détails' : 'Voir les détails'}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(w)} aria-label={`Modifier ${w.name}`}><Icon name="edit" className="h-4 w-4" />Modifier</Button>
              </div>
              {open && (
                <dl id={`details-${w.id}`} className="warehouse-details">
                  <div><dt>Localisation</dt><dd>{w.city}, {w.country}</dd></div>
                  <div><dt>Responsable</dt><dd>{w.manager}</dd></div>
                  <div><dt>Nombre de produits</dt><dd>{formatNumber(w.skus)}</dd></div>
                  <div><dt>Valeur du stock</dt><dd>{formatFCCompact(w.stockValue)}</dd></div>
                  <div><dt>Surface libre</dt><dd>{formatNumber(Math.max(w.capacity - w.used, 0))} m²</dd></div>
                </dl>
              )}
            </Card>
          )
        })}
      </div>

      <Modal open={adding} title="Nouvel entrepôt" description="Ajoutez un site physique de stockage." onClose={() => setAdding(false)}>
        <WarehouseForm onCancel={() => setAdding(false)} onSubmit={async input => {
          const created = await warehousesService.create(input)
          setAdding(false)
          notify('success', 'Entrepôt ajouté', `${created.name} (${created.id}) a été créé.`)
        }} />
      </Modal>
      <Modal open={Boolean(editing)} title="Modifier l’entrepôt" description={editing?.id} onClose={() => setEditing(null)}>
        {editing && <WarehouseForm initial={editing} onCancel={() => setEditing(null)} onSubmit={async input => {
          await warehousesService.update(editing.id, input)
          setEditing(null)
          notify('success', 'Modifications enregistrées', `${input.name} a été mis à jour.`)
        }} />}
      </Modal>
    </div>
  )
}
