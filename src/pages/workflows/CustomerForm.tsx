import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Field, Select, TextArea, TextInput, useToast } from '@/components/ui'
import { errorMessage } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { email, minLength, phone, required, type Schema } from '@/lib/validation'
import { customersService } from '@/services'
import type { CustomerType } from '@/types/domain'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Values { name: string; phone: string; email: string; address: string; city: string; company: string; type: CustomerType; notes: string }

const customerTypes: CustomerType[] = ['Entreprise', 'Grossiste', 'Détaillant', 'Particulier']

const schema: Schema<Values> = {
  name: [required(), minLength(2)],
  phone: [required(), phone()],
  email: [email()],
  city: [required()],
  company: [(value, values) => values.type !== 'Particulier' && !String(value).trim() ? 'Indiquez l’entreprise pour un client professionnel.' : undefined],
}

export default function CustomerForm() {
  const navigate = useNavigate()
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({ name: '', phone: '', email: '', address: '', city: '', company: '', type: 'Entreprise', notes: '' }, schema)
  const { values, set, errors } = form

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    form.setFormError('')
    if (!form.check()) return
    setSaving(true)
    try {
      const customer = await customersService.create({
        name: values.name.trim(), phone: values.phone.trim(), email: values.email, address: values.address.trim(),
        city: values.city.trim(), company: values.company.trim(), type: values.type, notes: values.notes.trim(),
      })
      notify('success', 'Client enregistré', `${customer.name} (${customer.id}) a été ajouté au portefeuille.`)
      navigate(`/clients?client=${customer.id}`)
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkflowShell title="Ajouter un client" parent="Customers" description="Ajoutez un nouveau client au portefeuille commercial.">
      <Card className="form-card">
        <form onSubmit={submit} noValidate>
          <FormBanner message={form.formError} />
          <div className="form-grid">
            <Field label="Nom complet" required error={errors.name}>{p => <TextInput {...p} value={values.name} onChange={e => set('name', e.target.value)} placeholder="Nom du client ou du contact" autoComplete="name" />}</Field>
            <Field label="Téléphone" required error={errors.phone}>{p => <TextInput {...p} type="tel" value={values.phone} onChange={e => set('phone', e.target.value)} placeholder="+243 000 000 000" autoComplete="tel" />}</Field>
            <Field label="Adresse e-mail" error={errors.email}>{p => <TextInput {...p} type="email" value={values.email} onChange={e => set('email', e.target.value)} placeholder="contact@entreprise.cd" autoComplete="email" />}</Field>
            <Field label="Adresse">{p => <TextInput {...p} value={values.address} onChange={e => set('address', e.target.value)} placeholder="Avenue, numéro, commune" autoComplete="street-address" />}</Field>
            <Field label="Ville" required error={errors.city}>{p => <TextInput {...p} value={values.city} onChange={e => set('city', e.target.value)} placeholder="Kinshasa" autoComplete="address-level2" />}</Field>
            <Field label="Type de client">{p => (
              <Select {...p} value={values.type} onChange={e => set('type', e.target.value as CustomerType)}>
                {customerTypes.map(t => <option key={t}>{t}</option>)}
              </Select>
            )}</Field>
            <Field label="Entreprise" required={values.type !== 'Particulier'} error={errors.company}>{p => <TextInput {...p} value={values.company} onChange={e => set('company', e.target.value)} placeholder="Nom de l’entreprise" autoComplete="organization" />}</Field>
            <Field label="Notes" wide>{p => <TextArea {...p} value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations commerciales utiles" />}</Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/clients')}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer le client</Button>
          </div>
        </form>
      </Card>
    </WorkflowShell>
  )
}
