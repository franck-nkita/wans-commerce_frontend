import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Card, Field, ReadOnlyValue, Select, SuggestInput, TextArea, TextInput, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { suggestedReorder } from '@/lib/domain'
import { formatDate, formatNumber, todayISO } from '@/lib/format'
import { integer, positiveNumber, required, type Schema } from '@/lib/validation'
import { inventoryService, productsService, warehousesService } from '@/services'
import { isDemo } from '@/services/config'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Values { sku: string; warehouseId: string; quantity: string; supplier: string; expectedDate: string; notes: string }

const inDays = (days: number) => {
  const date = new Date(`${todayISO()}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const schema: Schema<Values> = {
  sku: [required('Choisissez un produit.')],
  warehouseId: [required('Choisissez un entrepôt.')],
  quantity: [positiveNumber(), integer()],
  supplier: [required('Choisissez un fournisseur.')],
  expectedDate: [required('Indiquez la date prévue.'), value => (String(value) < todayISO() ? 'La date prévue ne peut pas être passée.' : undefined)],
}

export default function RestockForm() {
  const navigate = useNavigate()
  const notify = useToast()
  const [params] = useSearchParams()
  const products = useAsync(() => productsService.list())
  const warehouses = useAsync(() => warehousesService.list())
  const suppliers = useAsync(() => productsService.suppliers())
  const inventory = useAsync(() => inventoryService.list())
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const form = useForm<Values>({ sku: '', warehouseId: '', quantity: '', supplier: '', expectedDate: inDays(7), notes: '' }, schema)
  const { values, set, setValues, errors } = form
  const product = products.data?.find(p => p.sku === values.sku)

  /** Quantité suggérée : même règle qu'en démonstration, appliquée à la demande prévue de l'inventaire. */
  const suggestedQuantity = (sku: string) => {
    const item = inventory.data?.find(i => i.sku === sku)
    return item ? suggestedReorder({ stock: item.quantity, minStock: item.minStock }, item.predicted) : 0
  }

  const selectProduct = (sku: string) => {
    const p = products.data?.find(x => x.sku === sku)
    setValues(v => ({
      ...v, sku, warehouseId: p?.warehouseId ?? v.warehouseId, supplier: p?.supplier ?? v.supplier,
      quantity: p ? String(suggestedQuantity(sku) || p.minStock) : '',
    }))
  }

  // Pré-remplissage depuis l'URL (?sku=…&qte=…) une fois les produits chargés.
  useEffect(() => {
    if (initialized || !products.data || !inventory.data) return
    setInitialized(true)
    const sku = params.get('sku')
    if (!sku) return
    const p = products.data.find(x => x.sku === sku)
    if (!p) return
    setValues(v => ({
      ...v, sku, warehouseId: p.warehouseId, supplier: p.supplier,
      quantity: params.get('qte') ?? String(suggestedQuantity(sku) || p.minStock),
    }))
  }, [initialized, products.data, inventory.data, params, setValues])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    form.setFormError('')
    if (!form.check()) return
    setSaving(true)
    try {
      const restock = await inventoryService.createRestock({
        sku: values.sku, warehouseId: values.warehouseId, quantity: Number(values.quantity), supplier: values.supplier,
        expectedDate: values.expectedDate, notes: values.notes.trim(),
      })
      notify('success', 'Réapprovisionnement créé', `${restock.id} : ${formatNumber(restock.quantity)} unités attendues le ${formatDate(restock.expectedDate)}.`)
      navigate('/inventaire')
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkflowShell title="Réapprovisionnement" parent="Inventory" description="Planifiez une commande fournisseur pour sécuriser le niveau de stock.">
      <Card className="form-card">
        <form onSubmit={submit} noValidate>
          <FormBanner message={form.formError} />
          <div className="form-grid">
            <Field label="Produit" required error={errors.sku}>{p => (
              <Select {...p} value={values.sku} onChange={e => selectProduct(e.target.value)}>
                <option value="">Sélectionner un produit…</option>
                {(products.data ?? []).map(x => <option key={x.sku} value={x.sku}>{x.name} ({x.sku})</option>)}
              </Select>
            )}</Field>
            <Field label="Entrepôt" required error={errors.warehouseId}>{p => (
              <Select {...p} value={values.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(warehouses.data ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            )}</Field>
            <Field label="Stock actuel">{p => <ReadOnlyValue id={p.id}>{product ? `${formatNumber(product.stock)} unité${product.stock > 1 ? 's' : ''}` : '—'}</ReadOnlyValue>}</Field>
            <Field label="Stock minimum">{p => <ReadOnlyValue id={p.id}>{product ? `${formatNumber(product.minStock)} unités` : '—'}</ReadOnlyValue>}</Field>
            <Field label="Quantité à commander" required error={errors.quantity}
              hint={product ? `Suggestion : ${formatNumber(suggestedQuantity(product.sku))} unités (${isDemo ? 'demande prévue' : 'ventes des 30 derniers jours'} et double du minimum).` : undefined}>
              {p => <TextInput {...p} type="number" min={1} step={1} inputMode="numeric" value={values.quantity} onChange={e => set('quantity', e.target.value)} />}
            </Field>
            <Field label="Fournisseur" required error={errors.supplier}>{p => isDemo ? (
              <Select {...p} value={values.supplier} onChange={e => set('supplier', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(suppliers.data ?? []).map(s => <option key={s}>{s}</option>)}
              </Select>
            ) : (
              <SuggestInput {...p} options={suppliers.data ?? []} value={values.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Nom du fournisseur" />
            )}</Field>
            <Field label="Date prévue" required error={errors.expectedDate}>{p => <TextInput {...p} type="date" min={todayISO()} value={values.expectedDate} onChange={e => set('expectedDate', e.target.value)} />}</Field>
            <Field label="Notes" wide>{p => <TextArea {...p} value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Conditions ou priorité de livraison" />}</Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/inventaire')}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer le réapprovisionnement</Button>
          </div>
        </form>
      </Card>
    </WorkflowShell>
  )
}
