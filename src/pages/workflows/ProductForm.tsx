import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Field, Select, SuggestInput, TextArea, TextInput, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { integer, minLength, nonNegativeNumber, pattern, positiveNumber, required, type Schema } from '@/lib/validation'
import { productsService, warehousesService } from '@/services'
import { isDemo } from '@/services/config'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Values {
  name: string; sku: string; category: string; brand: string; description: string; purchasePrice: string; price: string
  stock: string; minStock: string; warehouseId: string; supplier: string; image: File | null
}

const MAX_IMAGE = 2 * 1024 * 1024

const schema: Schema<Values> = {
  name: [required(), minLength(3)],
  sku: [required(), pattern(/^[A-Za-z0-9-]{4,20}$/, 'Utilisez 4 à 20 caractères : lettres, chiffres ou tirets.')],
  category: [required('Choisissez une catégorie.')],
  purchasePrice: [positiveNumber()],
  price: [positiveNumber(), (value, values) => Number(value) < Number(values.purchasePrice) ? 'Le prix de vente est inférieur au prix d’achat.' : undefined],
  stock: [nonNegativeNumber(), integer()],
  minStock: [nonNegativeNumber(), integer()],
  warehouseId: [required('Choisissez un entrepôt.')],
  supplier: [required('Choisissez un fournisseur.')],
  image: [value => {
    if (!(value instanceof File)) return undefined
    if (!value.type.startsWith('image/')) return 'Le fichier doit être une image (JPG, PNG, WebP).'
    return value.size > MAX_IMAGE ? 'L’image ne doit pas dépasser 2 Mo.' : undefined
  }],
}

export default function ProductForm() {
  const navigate = useNavigate()
  const notify = useToast()
  const categories = useAsync(() => productsService.categories())
  const suppliers = useAsync(() => productsService.suppliers())
  const warehouses = useAsync(() => warehousesService.list())
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({
    name: '', sku: '', category: '', brand: '', description: '', purchasePrice: '', price: '', stock: '0', minStock: '0',
    warehouseId: '', supplier: '', image: null,
  }, schema)
  const { values, set, errors } = form

  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!values.image || typeof URL.createObjectURL !== 'function') { setPreview(''); return }
    const url = URL.createObjectURL(values.image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [values.image])
  const margin = Number(values.price) - Number(values.purchasePrice)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    form.setFormError('')
    if (!form.check()) return
    setSaving(true)
    try {
      const product = await productsService.create({
        name: values.name, sku: values.sku, category: values.category, brand: values.brand.trim(), description: values.description.trim(),
        purchasePrice: Number(values.purchasePrice), price: Number(values.price), stock: Number(values.stock), minStock: Number(values.minStock),
        warehouseId: values.warehouseId, supplier: values.supplier, imageName: values.image?.name,
      })
      notify('success', 'Produit enregistré', `${product.name} (${product.sku}) a été ajouté au catalogue.`)
      navigate(`/produits?sku=${product.sku}`)
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkflowShell title="Ajouter un produit" parent="Products" description="Créez une fiche produit complète et initialisez son niveau de stock.">
      <Card className="form-card">
        <form onSubmit={submit} noValidate>
          <FormBanner message={form.formError} />
          <div className="form-grid">
            <Field label="Nom du produit" required error={errors.name}>{p => <TextInput {...p} value={values.name} onChange={e => set('name', e.target.value)} placeholder="Ex. Onduleur solaire 5 KVA" />}</Field>
            <Field label="Référence / SKU" required error={errors.sku} hint="Lettres, chiffres et tirets.">{p => <TextInput {...p} value={values.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="WC-EL-0103" autoCapitalize="characters" />}</Field>
            <Field label="Catégorie" required error={errors.category} hint={isDemo ? undefined : 'Choisissez une catégorie existante ou saisissez-en une nouvelle.'}>{p => isDemo ? (
              <Select {...p} value={values.category} onChange={e => set('category', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(categories.data ?? []).map(c => <option key={c}>{c}</option>)}
              </Select>
            ) : (
              <SuggestInput {...p} options={categories.data ?? []} value={values.category} onChange={e => set('category', e.target.value)} placeholder="Ex. Électronique" />
            )}</Field>
            <Field label="Marque">{p => <TextInput {...p} value={values.brand} onChange={e => set('brand', e.target.value)} placeholder="Nom de la marque" />}</Field>
            <Field label="Description" wide>{p => <TextArea {...p} value={values.description} onChange={e => set('description', e.target.value)} placeholder="Caractéristiques principales du produit" />}</Field>
            <Field label="Prix d’achat (FC)" required error={errors.purchasePrice}>{p => <TextInput {...p} type="number" min={0} step="any" inputMode="decimal" value={values.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />}</Field>
            <Field label="Prix de vente (FC)" required error={errors.price} hint={Number.isFinite(margin) && values.price && values.purchasePrice ? `Marge unitaire : ${margin.toLocaleString('fr-FR')} FC` : undefined}>
              {p => <TextInput {...p} type="number" min={0} step="any" inputMode="decimal" value={values.price} onChange={e => set('price', e.target.value)} />}
            </Field>
            <Field label="Quantité initiale" required error={errors.stock}>{p => <TextInput {...p} type="number" min={0} step={1} inputMode="numeric" value={values.stock} onChange={e => set('stock', e.target.value)} />}</Field>
            <Field label="Stock minimum" required error={errors.minStock}>{p => <TextInput {...p} type="number" min={0} step={1} inputMode="numeric" value={values.minStock} onChange={e => set('minStock', e.target.value)} />}</Field>
            <Field label="Entrepôt" required error={errors.warehouseId}>{p => (
              <Select {...p} value={values.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(warehouses.data ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            )}</Field>
            <Field label="Fournisseur" required error={errors.supplier}>{p => isDemo ? (
              <Select {...p} value={values.supplier} onChange={e => set('supplier', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(suppliers.data ?? []).map(s => <option key={s}>{s}</option>)}
              </Select>
            ) : (
              <SuggestInput {...p} options={suppliers.data ?? []} value={values.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Nom du fournisseur" />
            )}</Field>
            <Field label="Image du produit" wide error={errors.image} hint="JPG, PNG ou WebP, 2 Mo maximum. L’image reste sur cet appareil : le téléversement n’est pas encore disponible.">
              {p => (
                <div className="file-row">
                  <input {...p} type="file" accept="image/*" className="ui-input ui-file" onChange={e => set('image', e.target.files?.[0] ?? null)} />
                  {preview && !errors.image && <img src={preview} alt="Aperçu de l’image sélectionnée" className="file-preview" />}
                </div>
              )}
            </Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/produits')}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer le produit</Button>
          </div>
        </form>
      </Card>
    </WorkflowShell>
  )
}
