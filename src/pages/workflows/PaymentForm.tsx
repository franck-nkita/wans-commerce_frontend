import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Card, Field, ReadOnlyValue, Select, TextArea, TextInput, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { formatFC, todayISO } from '@/lib/format'
import { minLength, positiveNumber, required, type Schema } from '@/lib/validation'
import { customersService, ordersService, paymentsService } from '@/services'
import { paymentMethods, type PaymentMethod } from '@/types/domain'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Values { customerId: string; orderId: string; amount: string; method: PaymentMethod; reference: string; date: string; notes: string }

/** `dueOf` : reste à payer d'une commande, tel que fourni par la liste des commandes (calculé par le serveur en mode API). */
const buildSchema = (dueOf: (orderId: string) => number): Schema<Values> => ({
  customerId: [required('Sélectionnez un client.')],
  orderId: [required('Sélectionnez une commande.')],
  amount: [positiveNumber('Saisissez un montant supérieur à 0.'), (value, values) => {
    const due = values.orderId ? dueOf(values.orderId) : Infinity
    return Number(value) > due ? `Le montant dépasse le reste à payer (${formatFC(due)}).` : undefined
  }],
  reference: [required('La référence est obligatoire pour le rapprochement.'), minLength(4)],
  date: [required(), value => (String(value) > todayISO() ? 'La date ne peut pas être dans le futur.' : undefined)],
})

export default function PaymentForm() {
  const navigate = useNavigate()
  const notify = useToast()
  const [params] = useSearchParams()
  const customers = useAsync(() => customersService.list())
  const orders = useAsync(() => ordersService.list())
  const [saving, setSaving] = useState(false)
  const dueOf = useCallback((orderId: string) => orders.data?.find(o => o.id === orderId)?.amountDue ?? 0, [orders.data])
  const schema = useMemo(() => buildSchema(dueOf), [dueOf])
  const form = useForm<Values>(() => ({
    customerId: params.get('client') ?? '', orderId: '', amount: '', method: 'Mobile Money', reference: '', date: todayISO(), notes: '',
  }), schema)
  const { values, set, setValues, errors } = form

  const customerOrders = (orders.data ?? []).filter(o => o.customerId === values.customerId && o.status !== 'Brouillon' && (o.amountDue ?? 0) > 0)
  const due = values.orderId ? dueOf(values.orderId) : 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    form.setFormError('')
    if (!form.check()) return
    setSaving(true)
    try {
      const payment = await paymentsService.create({
        customerId: values.customerId, orderId: values.orderId, amount: Number(values.amount), method: values.method,
        reference: values.reference, date: values.date, notes: values.notes.trim(),
      })
      notify('success', 'Paiement enregistré', `${payment.id} · ${formatFC(payment.amount)} rapproché de ${payment.orderId}.`)
      navigate(`/paiements?q=${payment.id}`)
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkflowShell title="Enregistrer un paiement" parent="Payments" description="Rapprochez un règlement avec une commande client.">
      <Card className="form-card">
        <form onSubmit={submit} noValidate>
          <FormBanner message={form.formError} />
          <div className="form-grid">
            <Field label="Client" required error={errors.customerId}>{p => (
              <Select {...p} value={values.customerId} onChange={e => setValues(v => ({ ...v, customerId: e.target.value, orderId: '', amount: '' }))}>
                <option value="">Sélectionner un client…</option>
                {(customers.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}</Field>
            <Field label="Commande" required error={errors.orderId}
              hint={values.customerId && customerOrders.length === 0 ? 'Aucune commande en attente de règlement pour ce client.' : undefined}>
              {p => (
                <Select {...p} value={values.orderId} disabled={!values.customerId || customerOrders.length === 0}
                  onChange={e => { const id = e.target.value; setValues(v => ({ ...v, orderId: id, amount: id ? String(dueOf(id)) : '' })) }}>
                  <option value="">{values.customerId ? 'Sélectionner une commande…' : 'Choisissez d’abord un client'}</option>
                  {customerOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {formatFC(o.total)}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Montant (FC)" required error={errors.amount} hint={values.orderId ? `Reste à payer : ${formatFC(due)}` : undefined}>
              {p => <TextInput {...p} type="number" min={0} step="any" inputMode="decimal" value={values.amount} onChange={e => set('amount', e.target.value)} />}
            </Field>
            <Field label="Devise">{p => <ReadOnlyValue id={p.id}>Franc congolais (FC)</ReadOnlyValue>}</Field>
            <Field label="Mode de paiement">{p => (
              <Select {...p} value={values.method} onChange={e => set('method', e.target.value as PaymentMethod)}>
                {paymentMethods.map(m => <option key={m}>{m}</option>)}
              </Select>
            )}</Field>
            <Field label="Référence de transaction" required error={errors.reference}>{p => <TextInput {...p} value={values.reference} onChange={e => set('reference', e.target.value)} placeholder="Ex. TXN-84292" />}</Field>
            <Field label="Date" required error={errors.date}>{p => <TextInput {...p} type="date" max={todayISO()} value={values.date} onChange={e => set('date', e.target.value)} />}</Field>
            <Field label="Notes" wide>{p => <TextArea {...p} value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires" />}</Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/paiements')}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer le paiement</Button>
          </div>
        </form>
      </Card>
    </WorkflowShell>
  )
}
