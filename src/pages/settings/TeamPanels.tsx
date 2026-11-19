import { useState, type FormEvent } from 'react'
import { Badge, Button, Card, ErrorState, Field, Heading, LoadingState, Select, TextInput, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { formatDate } from '@/lib/format'
import { email, hasErrors, minLength, required, validate, type Errors } from '@/lib/validation'
import { session, teamService } from '@/services'
import type { MemberRole, TeamMember } from '@/types/domain'

const assignableRoles: { value: Exclude<MemberRole, 'owner'>; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'seller', label: 'Vendeur' },
  { value: 'viewer', label: 'Lecteur' },
]

interface MemberValues { email: string; fullName: string; role: Exclude<MemberRole, 'owner'>; password: string }

function AddMemberForm({ canAssignAdmin, onDone }: { canAssignAdmin: boolean; onDone: () => void }) {
  const notify = useToast()
  const [values, setValues] = useState<MemberValues>({ email: '', fullName: '', role: 'seller', password: '' })
  const [errors, setErrors] = useState<Errors<MemberValues>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: keyof MemberValues) => (value: string) => setValues(v => ({ ...v, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values, { email: [required(), email()] })
    setErrors(found)
    if (hasErrors(found)) return
    setSaving(true)
    setFormError('')
    try {
      const member = await teamService.add({
        email: values.email.trim(), role: values.role,
        fullName: values.fullName.trim() || undefined, password: values.password || undefined,
      })
      notify('success', 'Collaborateur ajouté', `${member.fullName} (${member.roleLabel}) a accès à l’entreprise.`)
      onDone()
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="team-form">
      {formError && <p className="form-banner form-banner-error" role="alert">{formError}</p>}
      <div className="settings-fields">
        <Field label="Adresse e-mail" required error={errors.email}>{p => <TextInput {...p} type="email" value={values.email} onChange={e => set('email')(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Rôle">{p => (
          <Select {...p} value={values.role} onChange={e => set('role')(e.target.value)}>
            {assignableRoles.filter(r => canAssignAdmin || r.value !== 'admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        )}</Field>
        <Field label="Nom complet" hint="Obligatoire si la personne n’a pas encore de compte.">{p => <TextInput {...p} value={values.fullName} onChange={e => set('fullName')(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Mot de passe initial" hint="Obligatoire pour un nouveau compte ; à transmettre à la personne par un canal sûr.">
          {p => <TextInput {...p} type="password" value={values.password} onChange={e => set('password')(e.target.value)} autoComplete="new-password" />}
        </Field>
      </div>
      <div className="form-actions">
        <Button variant="secondary" onClick={onDone}>Annuler</Button>
        <Button type="submit" loading={saving}>Ajouter le collaborateur</Button>
      </div>
    </form>
  )
}

export function TeamPanel() {
  const notify = useToast()
  const { user, membership } = useSession()
  const canManage = membership?.role === 'owner' || membership?.role === 'admin'
  const members = useAsync(() => (canManage ? teamService.list() : Promise.resolve([] as TeamMember[])), [canManage])
  const [adding, setAdding] = useState(false)

  if (!canManage) {
    return (
      <Card className="settings-panel">
        <Heading level={2}>Équipe</Heading>
        <p>Seuls le propriétaire et les administrateurs de l’entreprise gèrent les collaborateurs et leurs rôles.</p>
      </Card>
    )
  }

  const editable = (m: TeamMember) => m.role !== 'owner' && m.email !== user?.email && (membership?.role === 'owner' || m.role !== 'admin')
  const update = async (m: TeamMember, patch: Parameters<typeof teamService.update>[1], message: string) => {
    try {
      await teamService.update(m.id, patch)
      notify('success', message, m.fullName)
    } catch (error) {
      notify('error', 'Modification impossible', errorMessage(error))
    }
  }

  return (
    <Card className="settings-panel">
      <div className="card-header">
        <div><Heading level={2}>Équipe</Heading><p>Collaborateurs de l’entreprise, rôles et accès.</p></div>
        {!adding && <Button onClick={() => setAdding(true)}>Ajouter un collaborateur</Button>}
      </div>
      {adding && <AddMemberForm canAssignAdmin={membership?.role === 'owner'} onDone={() => setAdding(false)} />}
      {members.status === 'error' && <ErrorState message={members.error} onRetry={members.reload} />}
      {!members.data && members.status === 'loading' && <LoadingState rows={3} />}
      <ul className="team-list">
        {(members.data ?? []).map(m => (
          <li key={m.id} className="team-row">
            <div className="team-identity"><strong>{m.fullName}</strong><span>{m.email} · depuis le {formatDate(m.joinedAt)}</span></div>
            <Badge tone={m.status === 'active' ? 'success' : 'danger'}>{m.status === 'active' ? 'Actif' : 'Suspendu'}</Badge>
            {editable(m) ? (
              <div className="team-actions">
                <Select aria-label={`Rôle de ${m.fullName}`} value={m.role} onChange={e => void update(m, { role: e.target.value as MemberRole }, 'Rôle modifié')}>
                  {assignableRoles.filter(r => membership?.role === 'owner' || r.value !== 'admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <Button variant="secondary" onClick={() => void update(m, { status: m.status === 'active' ? 'suspended' : 'active' }, m.status === 'active' ? 'Accès suspendu' : 'Accès rétabli')}>
                  {m.status === 'active' ? 'Suspendre' : 'Réactiver'}
                </Button>
              </div>
            ) : <span className="team-role">{m.roleLabel}</span>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

interface PasswordValues { current: string; next: string; confirm: string }

export function SecurityPanel() {
  const notify = useToast()
  const [values, setValues] = useState<PasswordValues>({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Errors<PasswordValues>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: keyof PasswordValues) => (value: string) => setValues(v => ({ ...v, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values, {
      current: [required()], next: [required(), minLength(10)],
      confirm: [(value, all) => (value !== all.next ? 'Les deux mots de passe ne correspondent pas.' : undefined)],
    })
    setErrors(found)
    if (hasErrors(found)) return
    setSaving(true)
    setFormError('')
    try {
      await session.changePassword(values.current, values.next)
      setValues({ current: '', next: '', confirm: '' })
      notify('success', 'Mot de passe modifié', 'Vos autres sessions ont été déconnectées.')
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="settings-panel">
      <form onSubmit={submit} noValidate>
        <div className="card-header">
          <div><Heading level={2}>Sécurité du compte</Heading><p>Changer de mot de passe déconnecte toutes vos autres sessions.</p></div>
          <Button type="submit" loading={saving}>Modifier le mot de passe</Button>
        </div>
        {formError && <p className="form-banner form-banner-error" role="alert">{formError}</p>}
        <div className="settings-fields">
          <Field label="Mot de passe actuel" required error={errors.current}>{p => <TextInput {...p} type="password" value={values.current} onChange={e => set('current')(e.target.value)} autoComplete="current-password" />}</Field>
          <Field label="Nouveau mot de passe" required error={errors.next} hint="10 caractères minimum.">{p => <TextInput {...p} type="password" value={values.next} onChange={e => set('next')(e.target.value)} autoComplete="new-password" />}</Field>
          <Field label="Confirmation" required error={errors.confirm}>{p => <TextInput {...p} type="password" value={values.confirm} onChange={e => set('confirm')(e.target.value)} autoComplete="new-password" />}</Field>
        </div>
      </form>
    </Card>
  )
}
