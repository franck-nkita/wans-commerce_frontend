import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Card, ConfirmDialog, Field, Heading, Icon, ReadOnlyValue, Select, TextArea, TextInput, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { orderTotals } from '@/lib/domain'
import { formatFC, matchesQuery, todayISO } from '@/lib/format'
import { percent, required, type Schema } from '@/lib/validation'
import { customersService, ordersService, productsService, warehousesService, type OrderMode } from '@/services'
import { paymentMethods, type PaymentMethod, type Product } from '@/types/domain'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Line { sku: string; name: string; quantity: string; unitPrice: string; available: number }

interface Values {
  customerId: string
  lines: Line[]
  discountPct: string
  paymentMethod: PaymentMethod
  warehouseId: string
  date: string
  notes: string
}

const lineError = (line: Line) => {
  const q = Number(line.quantity)
  const p = Number(line.unitPrice)
  if (!Number.isInteger(q) || q <= 0) return 'Quantité invalide.'
  if (!Number.isFinite(p) || p <= 0) return 'Prix invalide.'
  return undefined
}

const schema: Schema<Values> = {
  customerId: [required('Sélectionnez un client.')],
  lines: [value => (Array.isArray(value) && value.length === 0 ? 'Ajoutez au moins un produit.' : undefined),
    value => (Array.isArray(value) && value.some(l => lineError(l)) ? 'Corrigez les quantités et les prix des produits.' : undefined)],
  discountPct: [percent()],
  date: [required('Indiquez la date.'), value => (String(value) > todayISO() ? 'La date ne peut pas être dans le futur.' : undefined)],
}

export default function OrderForm({ variant }: { variant: 'order' | 'transaction' }) {
  const navigate = useNavigate()
  const notify = useToast()
  const [params] = useSearchParams()
  const customers = useAsync(() => customersService.list())
  const products = useAsync(() => productsService.list())
  const warehouses = useAsync(() => warehousesService.list())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<OrderMode | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Identifiant unique de cette saisie : un double envoi (double clic, réseau instable) ne crée pas deux ventes.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const isOrder = variant === 'order'

  const form = useForm<Values>(() => ({
    customerId: params.get('client') ?? '', lines: [], discountPct: '0', paymentMethod: 'Espèces',
    warehouseId: 'ENT-001', date: todayISO(), notes: '',
  }), schema)
  const { values, set, setValues, errors } = form

  // Entrepôt par défaut : le premier entrepôt réel de l'entreprise si la valeur initiale n'existe pas.
  useEffect(() => {
    const list = warehouses.data
    if (list?.length && !list.some(w => w.id === values.warehouseId)) set('warehouseId', list[0].id)
  }, [warehouses.data, values.warehouseId, set])

  const parsedLines = values.lines.map(l => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 }))
  const totals = orderTotals(parsedLines, Number(values.discountPct) || 0)

  const matches = useMemo(() => search.trim().length < 2 ? [] : (products.data ?? [])
    .filter(p => matchesQuery(search, p.name, p.sku))
    .filter(p => !values.lines.some(l => l.sku === p.sku))
    .slice(0, 6), [search, products.data, values.lines])

  const addProduct = (product: Product) => {
    setValues(v => ({ ...v, lines: [...v.lines, { sku: product.sku, name: product.name, quantity: '1', unitPrice: String(product.price), available: product.stock }] }))
    setSearch('')
  }
  const updateLine = (sku: string, patch: Partial<Line>) => set('lines', values.lines.map(l => (l.sku === sku ? { ...l, ...patch } : l)))
  const removeLine = (sku: string) => set('lines', values.lines.filter(l => l.sku !== sku))

  const save = async (mode: OrderMode) => {
    form.setFormError('')
    setSaving(mode)
    try {
      const order = await ordersService.create({
        customerId: values.customerId,
        lines: values.lines.map(l => ({ sku: l.sku, name: l.name, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        discountPct: Number(values.discountPct) || 0, paymentMethod: values.paymentMethod, warehouseId: values.warehouseId,
        notes: values.notes.trim(), date: values.date,
      }, mode, idempotencyKey)
      const messages: Record<OrderMode, [string, string]> = {
        brouillon: ['Commande enregistrée', `${order.id} est enregistrée en brouillon. Le stock n’a pas été modifié.`],
        vente: ['Vente confirmée', `${order.id} · ${formatFC(order.total)}. Le stock a été mis à jour.`],
        transaction: ['Transaction validée', `${order.id} · ${formatFC(order.total)} réglée par ${order.paymentMethod.toLowerCase()}.`],
      }
      notify('success', ...messages[mode])
      navigate(`/ventes?commande=${order.id}`)
    } catch (error) {
      form.setFormError(errorMessage(error))
      setConfirmOpen(false)
    } finally {
      setSaving(null)
    }
  }

  const submit = (event: Pick<FormEvent, 'preventDefault'>, mode: OrderMode) => {
    event.preventDefault()
    if (!form.check()) return
    if (mode === 'vente') setConfirmOpen(true)
    else void save(mode)
  }

  const customerName = customers.data?.find(c => c.id === values.customerId)?.name

  return (
    <WorkflowShell
      title={isOrder ? 'Nouvelle commande' : 'Nouvelle transaction'}
      parent={isOrder ? 'Sales' : 'Dashboard'}
      description={isOrder ? 'Préparez une commande client avec les conditions commerciales adaptées.' : 'Enregistrez une vente et son règlement dans une opération unique.'}>
      <form onSubmit={e => submit(e, isOrder ? 'brouillon' : 'transaction')} noValidate>
        <FormBanner message={form.formError} />
        <div className="order-layout">
          <Card className="form-card">
            <div className="form-grid">
              <Field label={isOrder ? 'Sélection du client' : 'Client'} required error={errors.customerId}>{p => (
                <Select {...p} value={values.customerId} onChange={e => set('customerId', e.target.value)}>
                  <option value="">Sélectionner un client…</option>
                  {(customers.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}</Field>
              {isOrder
                ? <Field label="Entrepôt">{p => (
                  <Select {...p} value={values.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
                    {(warehouses.data ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </Select>
                )}</Field>
                : <Field label="Date" required error={errors.date}>{p => <TextInput {...p} type="date" max={todayISO()} value={values.date} onChange={e => set('date', e.target.value)} />}</Field>}

              <Field label={isOrder ? 'Recherche de produits' : 'Produits'} wide hint="Saisissez au moins 2 caractères du nom ou de la référence.">{p => (
                <div className="product-picker">
                  <TextInput {...p} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou référence" autoComplete="off" />
                  {matches.length > 0 && (
                    <ul className="picker-results" aria-label="Produits correspondants">
                      {matches.map(m => (
                        <li key={m.sku}>
                          <button type="button" onClick={() => addProduct(m)} disabled={m.stock <= 0 && !isOrder}>
                            <span><strong>{m.name}</strong><small>{m.sku} · {m.stock} en stock</small></span>
                            <span className="mono">{formatFC(m.price)}</span>
                            <Icon name="plus" className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {search.trim().length >= 2 && matches.length === 0 && <p className="form-hint">Aucun produit disponible ne correspond.</p>}
                </div>
              )}</Field>
            </div>

            <div className="line-items">
              <Heading level={3}>{isOrder ? 'Liste des produits sélectionnés' : 'Produits de la transaction'}</Heading>
              {errors.lines && <p className="form-error" role="alert">{errors.lines}</p>}
              {values.lines.length === 0
                ? <p className="line-empty">Aucun produit ajouté pour le moment.</p>
                : (
                  <ul>
                    {values.lines.map(line => {
                      const err = lineError(line)
                      const over = Number(line.quantity) > line.available
                      return (
                        <li key={line.sku} className="line-item">
                          <div className="line-name"><strong>{line.name}</strong><small>{line.sku} · {line.available} en stock</small></div>
                          <label><span>Quantité</span><TextInput type="number" min={1} step={1} inputMode="numeric" value={line.quantity} onChange={e => updateLine(line.sku, { quantity: e.target.value })} aria-invalid={Boolean(err) || undefined} /></label>
                          <label><span>Prix unitaire (FC)</span><TextInput type="number" min={0} step="any" inputMode="decimal" value={line.unitPrice} onChange={e => updateLine(line.sku, { unitPrice: e.target.value })} aria-invalid={Boolean(err) || undefined} /></label>
                          <div className="line-total"><span>Montant</span><strong>{formatFC((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}</strong></div>
                          <Button variant="ghost" className="icon-button-plain" onClick={() => removeLine(line.sku)} aria-label={`Retirer ${line.name}`}><Icon name="trash" className="h-4 w-4" /></Button>
                          {over && <p className="line-warning">Quantité supérieure au stock disponible : la vente ne pourra pas être confirmée.</p>}
                        </li>
                      )
                    })}
                  </ul>
                )}
            </div>

            <div className="form-grid">
              <Field label="Mode de paiement">{p => (
                <Select {...p} value={values.paymentMethod} onChange={e => set('paymentMethod', e.target.value as PaymentMethod)}>
                  {paymentMethods.map(m => <option key={m}>{m}</option>)}
                </Select>
              )}</Field>
              <Field label="Remise (%)" error={errors.discountPct}>{p => <TextInput {...p} type="number" min={0} max={100} step="any" inputMode="decimal" value={values.discountPct} onChange={e => set('discountPct', e.target.value)} />}</Field>
              {isOrder && <Field label="Notes" wide>{p => <TextArea {...p} value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Instructions de livraison ou informations complémentaires" />}</Field>}
            </div>
          </Card>

          <Card className="summary-card">
            <Heading level={3}>Récapitulatif</Heading>
            <dl className="totals">
              <div><dt>Client</dt><dd>{customerName ?? '—'}</dd></div>
              <div><dt>Articles</dt><dd>{parsedLines.reduce((s, l) => s + l.quantity, 0)}</dd></div>
              <div><dt>Sous-total</dt><dd><ReadOnlyValue id="order-subtotal">{formatFC(totals.subtotal)}</ReadOnlyValue></dd></div>
              <div><dt>Remise</dt><dd>− {formatFC(totals.discount)}</dd></div>
              <div className="totals-grand"><dt>Total</dt><dd aria-live="polite">{formatFC(totals.total)}</dd></div>
            </dl>
            <div className="summary-actions">
              {isOrder ? (
                <>
                  <Button type="submit" variant="secondary" loading={saving === 'brouillon'} disabled={saving !== null}>Enregistrer la commande</Button>
                  <Button onClick={e => submit(e, 'vente')} loading={saving === 'vente'} disabled={saving !== null}>Confirmer la vente</Button>
                </>
              ) : (
                <Button type="submit" loading={saving === 'transaction'}>Valider la transaction</Button>
              )}
              <Button variant="ghost" onClick={() => navigate(isOrder ? '/ventes' : '/')}>Annuler</Button>
            </div>
            {isOrder && <p className="form-hint">« Enregistrer » crée un brouillon sans mouvement de stock. « Confirmer la vente » décrémente le stock.</p>}
          </Card>
        </div>
      </form>

      <ConfirmDialog open={confirmOpen} title="Confirmer la vente ?" confirmLabel="Confirmer la vente" loading={saving === 'vente'}
        message={<>La commande de <strong>{customerName}</strong> pour <strong>{formatFC(totals.total)}</strong> sera confirmée et le stock sera décrémenté.</>}
        onCancel={() => setConfirmOpen(false)} onConfirm={() => void save('vente')} />
    </WorkflowShell>
  )
}
