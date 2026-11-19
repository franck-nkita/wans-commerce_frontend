import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Badge, Button, Card, Field, Heading, Select, TextInput, useToast } from '@/components/ui'
import { errorMessage } from '@/hooks/useAsync'
import { useForm } from '@/hooks/useForm'
import { todayISO } from '@/lib/format'
import { required, type Schema } from '@/lib/validation'
import { describePeriod, reportsService } from '@/services'
import { reportFormats, reportPeriods, reportTypes, type ReportFormat, type ReportPeriod, type ReportType } from '@/types/domain'
import { downloadReport } from '../Reports'
import { FormBanner, WorkflowShell } from './WorkflowShell'

interface Values { type: ReportType; period: ReportPeriod; format: ReportFormat; from: string; to: string }

const schema: Schema<Values> = {
  from: [(value, values) => values.period === 'Période personnalisée' && !value ? 'Indiquez la date de début.' : undefined],
  to: [
    (value, values) => values.period === 'Période personnalisée' && !value ? 'Indiquez la date de fin.' : undefined,
    (value, values) => values.period === 'Période personnalisée' && values.from && String(value) < values.from ? 'La date de fin doit suivre la date de début.' : undefined,
    (value, values) => values.period === 'Période personnalisée' && String(value) > todayISO() ? 'La date de fin ne peut pas être dans le futur.' : undefined,
  ],
  type: [required()],
}

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T => (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback

export default function ReportForm({ mode }: { mode: 'export' | 'generate' }) {
  const navigate = useNavigate()
  const notify = useToast()
  const [params] = useSearchParams()
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof reportsService.rows>> | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const isExport = mode === 'export'
  const back = isExport ? '/' : '/rapports'

  const form = useForm<Values>(() => ({
    type: pick(reportTypes, params.get('type'), 'Rapport des ventes'),
    period: pick(reportPeriods, params.get('periode'), 'Ce mois'),
    format: 'PDF', from: '', to: '',
  }), schema)
  const { values, set, errors } = form

  const showPreview = async () => {
    if (!form.check()) return
    setPreviewing(true)
    form.setFormError('')
    try {
      setPreview(await reportsService.rows({ type: values.type, period: values.period, from: values.from, to: values.to }))
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setPreviewing(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    form.setFormError('')
    if (!form.check()) return
    setSaving(true)
    try {
      const input = { type: values.type, period: values.period, format: values.format, from: values.from, to: values.to }
      if (isExport) {
        await downloadReport({ name: `${values.type} — ${describePeriod(input)}`, type: values.type, period: describePeriod(input), format: values.format }, input)
        notify('success', values.format === 'PDF' ? 'Impression ouverte' : 'Export lancé', values.format === 'PDF'
          ? 'Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.'
          : `Le fichier ${values.format} est en cours de téléchargement.`)
      } else {
        const report = await reportsService.create(input)
        await downloadReport(report)
        notify('success', 'Rapport généré', `« ${report.name} » a été ajouté à la liste des rapports.`)
        navigate('/rapports')
      }
    } catch (error) {
      form.setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkflowShell
      title={isExport ? 'Exporter le rapport' : 'Générer un rapport'}
      parent={isExport ? 'Dashboard' : 'Reports'}
      description={isExport ? 'Configurez et prévisualisez un rapport exécutif avant son export.' : 'Créez un rapport détaillé à partir des données consolidées de l’entreprise.'}>
      <Card className="form-card">
        <form onSubmit={submit} noValidate>
          <FormBanner message={form.formError} />
          <div className="form-grid">
            <Field label="Type de rapport" required error={errors.type}>{p => (
              <Select {...p} value={values.type} onChange={e => { set('type', e.target.value as ReportType); setPreview(null) }}>
                {reportTypes.map(t => <option key={t}>{t}</option>)}
              </Select>
            )}</Field>
            <Field label="Période">{p => (
              <Select {...p} value={values.period} onChange={e => { set('period', e.target.value as ReportPeriod); setPreview(null) }}>
                {reportPeriods.map(t => <option key={t}>{t}</option>)}
              </Select>
            )}</Field>
            {values.period === 'Période personnalisée' && (
              <>
                <Field label="Du" required error={errors.from}>{p => <TextInput {...p} type="date" max={todayISO()} value={values.from} onChange={e => set('from', e.target.value)} />}</Field>
                <Field label="Au" required error={errors.to}>{p => <TextInput {...p} type="date" max={todayISO()} min={values.from || undefined} value={values.to} onChange={e => set('to', e.target.value)} />}</Field>
              </>
            )}
            <fieldset className="form-field form-field-wide format-field">
              <legend className="form-label">Format</legend>
              <div className="segmented">
                {reportFormats.map(f => (
                  <label key={f} className={values.format === f ? 'segmented-active' : ''}>
                    <input type="radio" name="format" value={f} checked={values.format === f} onChange={() => set('format', f)} />{f}
                  </label>
                ))}
              </div>
              <p className="form-hint">{values.format === 'PDF' ? 'Le PDF est produit via la fenêtre d’impression du navigateur.' : values.format === 'Excel' ? 'Classeur .xls compatible Excel et LibreOffice.' : 'CSV séparé par des points-virgules, encodé en UTF-8.'}</p>
            </fieldset>
          </div>

          {preview && (
            <section className="report-preview" aria-label="Aperçu du rapport">
              <div className="report-preview-head">
                <div><Heading level={3}>Aperçu du rapport</Heading><p>{values.type} · {describePeriod(values)}</p></div>
                <Badge tone="info">{preview.rows.length} ligne{preview.rows.length > 1 ? 's' : ''}</Badge>
              </div>
              <div className="responsive-table">
                <table className="data-table">
                  <caption className="sr-only">Aperçu des {Math.min(preview.rows.length, 5)} premières lignes</caption>
                  <thead><tr>{preview.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} data-label={preview.columns[j]}>{typeof cell === 'number' ? cell.toLocaleString('fr-FR') : cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 5 && <p className="form-hint">… et {preview.rows.length - 5} autre(s) ligne(s) dans le fichier final.</p>}
            </section>
          )}

          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate(back)}>Annuler</Button>
            <Button variant="secondary" onClick={() => void showPreview()} loading={previewing}>Prévisualiser</Button>
            <Button type="submit" loading={saving}>{isExport ? 'Exporter le rapport' : 'Générer le rapport'}</Button>
          </div>
        </form>
      </Card>
    </WorkflowShell>
  )
}
