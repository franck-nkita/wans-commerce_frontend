import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, ErrorState, Field, Heading, Icon, LoadingState, PageIntro, TextInput, useToast, type IconName } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { hasErrors, minLength, required, validate, type Errors } from '@/lib/validation'
import { settingsService } from '@/services'
import { isDemo } from '@/services/config'
import { SecurityPanel, TeamPanel } from './settings/TeamPanels'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'
import type { CompanyProfile } from '@/types/domain'

const sections = ['Entreprise', 'Apparence', 'Équipe', 'Sécurité', 'Facturation'] as const
type Section = (typeof sections)[number]

const companyFields: { key: keyof CompanyProfile; label: string }[] = [
  { key: 'companyName', label: 'Nom de l’entreprise' },
  { key: 'product', label: 'Produit' },
  { key: 'market', label: 'Marché principal' },
  { key: 'activity', label: 'Type d’activité' },
  { key: 'taxId', label: 'Identifiant fiscal' },
  { key: 'timezone', label: 'Fuseau horaire' },
]

const themes: { value: ThemePreference; label: string; description: string; icon: IconName }[] = [
  { value: 'light', label: 'Thème clair', description: 'Surfaces lumineuses et contraste net pour le travail en journée.', icon: 'sun' },
  { value: 'dark', label: 'Thème sombre', description: 'Surfaces bleu nuit confortables dans les environnements peu éclairés.', icon: 'moon' },
  { value: 'system', label: 'Automatique', description: 'Suit le réglage clair ou sombre de votre appareil.', icon: 'monitor' },
]

function CompanyPanel() {
  const notify = useToast()
  const company = useAsync(() => settingsService.getCompany())
  const [values, setValues] = useState<CompanyProfile | null>(null)
  const [errors, setErrors] = useState<Errors<CompanyProfile>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (company.data && !values) setValues(company.data) }, [company.data, values])

  if (company.status === 'error') return <Card className="settings-panel"><ErrorState message={company.error} onRetry={company.reload} /></Card>
  if (!values) return <Card className="settings-panel"><LoadingState /></Card>

  const dirty = JSON.stringify(values) !== JSON.stringify(company.data)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values, { companyName: [required(), minLength(2)], product: [required()], market: [required()], activity: [required()], taxId: [required()], timezone: [required()] })
    setErrors(found)
    if (hasErrors(found)) return
    setSaving(true)
    try {
      await settingsService.saveCompany(values)
      company.reload()
      notify('success', 'Profil enregistré', isDemo ? 'Les informations de l’entreprise ont été mises à jour sur cet appareil.' : 'Les informations de l’entreprise ont été mises à jour.')
    } catch (error) {
      notify('error', 'Enregistrement impossible', errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="settings-panel">
      <form onSubmit={submit} noValidate>
        <div className="card-header">
          <div><Heading level={2}>Profil de l’entreprise</Heading><p>Informations visibles sur vos documents et rapports.</p></div>
          <Button type="submit" loading={saving} disabled={!dirty}>Enregistrer les modifications</Button>
        </div>
        <div className="settings-fields">
          {companyFields.map(field => (
            <Field key={field.key} label={field.label} required error={errors[field.key]}>
              {p => <TextInput {...p} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}
            </Field>
          ))}
        </div>
      </form>
    </Card>
  )
}

function AppearancePanel() {
  const { preference, setPreference, theme } = useTheme()
  return (
    <Card className="settings-panel">
      <div className="card-header">
        <div><Heading level={2}>Apparence de l’interface</Heading><p>Le thème choisi est appliqué immédiatement et mémorisé sur cet appareil.</p></div>
      </div>
      <div className="theme-options" role="radiogroup" aria-label="Choisir le thème de l’interface">
        {themes.map(option => (
          <Button key={option.value} variant="ghost" className={`theme-option ${preference === option.value ? 'theme-option-active' : ''}`}
            onClick={() => setPreference(option.value)} role="radio" aria-checked={preference === option.value}>
            <span className="theme-preview"><Icon name={option.icon} /></span>
            <span className="theme-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
            <span className="theme-check">{preference === option.value && <Icon name="check" className="h-4 w-4" />}</span>
          </Button>
        ))}
      </div>
      <div className="theme-note"><Icon name="check" className="h-4 w-4" /><span>Thème actif : {theme === 'dark' ? 'sombre' : 'clair'}. Les graphiques, tableaux, formulaires et surfaces IA s’adaptent automatiquement.</span></div>
    </Card>
  )
}

export default function Settings() {
  const [param, setParam] = useQueryParam('section', 'Entreprise')
  const active: Section = (sections as readonly string[]).includes(param) ? (param as Section) : 'Entreprise'

  return (
    <div className="page settings-page">
      <PageIntro title="Paramètres" description="Configuration de votre entreprise et préférences personnelles." />
      <div className="settings-layout">
        <Card className="settings-nav">
          <div className="settings-nav-label" id="settings-nav-label">ESPACE DE TRAVAIL</div>
          <div role="tablist" aria-labelledby="settings-nav-label" className="settings-tabs">
            {sections.map(section => (
              <Button key={section} variant="ghost" role="tab" aria-selected={active === section} className={active === section ? 'settings-nav-active' : ''} onClick={() => setParam(section)}>
                {section}
              </Button>
            ))}
          </div>
        </Card>

        <div role="tabpanel" aria-label={active}>
          {active === 'Entreprise' && <CompanyPanel />}
          {active === 'Apparence' && <AppearancePanel />}
          {!isDemo && active === 'Équipe' && <TeamPanel />}
          {!isDemo && active === 'Sécurité' && <SecurityPanel />}
          {(isDemo ? !['Entreprise', 'Apparence'].includes(active) : active === 'Facturation') && (
            <Card className="settings-panel settings-empty">
              <span className="settings-empty-icon"><Icon name="settings" /></span>
              <Heading level={2}>Paramètres de {active.toLowerCase()}</Heading>
              <p>{isDemo
                ? 'Cette section nécessite la connexion à l’API (gestion des comptes et des accès). Elle n’est pas disponible en mode démonstration.'
                : 'La facturation de l’abonnement n’est pas encore disponible.'}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
