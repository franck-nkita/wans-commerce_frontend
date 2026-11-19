import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button, Card, Field, Heading, TextInput } from '@/components/ui'
import { errorMessage } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { email as emailRule, hasErrors, minLength, required, validate, type Errors } from '@/lib/validation'
import { session } from '@/services'
import { isDemo } from '@/services/config'

interface Values { email: string; password: string; fullName: string; companyName: string }

/** Connexion et création d'un espace entreprise (mode API). En démonstration, l'application est directement accessible. */
export default function LoginPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { status } = useSession()
  const registering = params.get('mode') === 'inscription'
  const [values, setValues] = useState<Values>({ email: '', password: '', fullName: '', companyName: '' })
  const [errors, setErrors] = useState<Errors<Values>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const next = params.get('suite') ?? '/'
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  useEffect(() => { document.title = `${registering ? 'Créer un compte' : 'Connexion'} · WANS COMMERCE` }, [registering])

  if (isDemo || status === 'authenticated') return <Navigate to={target} replace />

  const set = (key: keyof Values) => (value: string) => setValues(v => ({ ...v, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values, registering
      ? { email: [required(), emailRule()], password: [required(), minLength(10)], fullName: [required(), minLength(2)], companyName: [required(), minLength(2)] }
      : { email: [required(), emailRule()], password: [required()] })
    setErrors(found)
    if (hasErrors(found)) return
    setSubmitting(true)
    setFormError('')
    try {
      if (registering) await session.register(values)
      else await session.login(values.email, values.password)
      navigate(target, { replace: true })
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">W</div>
          <div><div className="brand-name">WANS COMMERCE</div><div className="brand-byline">PAR WANS TECH</div></div>
        </div>
        <Heading level={1}>{registering ? 'Créer votre espace' : 'Connexion'}</Heading>
        <p>{registering ? 'Créez votre compte et l’espace de travail de votre entreprise.' : 'Accédez à l’espace de travail de votre entreprise.'}</p>
        <form onSubmit={submit} noValidate>
          {formError && <p className="form-banner form-banner-error" role="alert">{formError}</p>}
          <div className="auth-fields">
            {registering && (
              <>
                <Field label="Nom complet" required error={errors.fullName}>{p => <TextInput {...p} value={values.fullName} onChange={e => set('fullName')(e.target.value)} autoComplete="name" />}</Field>
                <Field label="Nom de l’entreprise" required error={errors.companyName}>{p => <TextInput {...p} value={values.companyName} onChange={e => set('companyName')(e.target.value)} autoComplete="organization" />}</Field>
              </>
            )}
            <Field label="Adresse e-mail" required error={errors.email}>{p => <TextInput {...p} type="email" value={values.email} onChange={e => set('email')(e.target.value)} autoComplete="email" />}</Field>
            <Field label="Mot de passe" required error={errors.password} hint={registering ? '10 caractères minimum, ni trop courant ni uniquement numérique.' : undefined}>
              {p => <TextInput {...p} type="password" value={values.password} onChange={e => set('password')(e.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} />}
            </Field>
          </div>
          <div className="auth-actions">
            <Button type="submit" loading={submitting}>{registering ? 'Créer mon espace' : 'Se connecter'}</Button>
          </div>
        </form>
        <p className="auth-switch">
          {registering ? 'Déjà un compte ? ' : 'Nouvelle entreprise ? '}
          <button type="button" onClick={() => { setFormError(''); setErrors({}); setParams(registering ? {} : { mode: 'inscription' }) }}>
            {registering ? 'Se connecter' : 'Créer un espace'}
          </button>
        </p>
      </Card>
    </main>
  )
}
