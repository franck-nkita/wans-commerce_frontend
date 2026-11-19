import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ variant = 'primary', className = '', type = 'button', loading = false, disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; children?: ReactNode }) {
  return (
    <button type={type} className={`ui-button ui-button-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Card({ className = '', children, ...props }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return <section className={`ui-card ${className}`} {...props}>{children}</section>
}

export function Heading({ level = 2, className = '', id, children }: { level?: 1 | 2 | 3; className?: string; id?: string; children: ReactNode }) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  return <Tag id={id} className={`heading heading-${level} ${className}`}>{children}</Tag>
}

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`ui-badge ui-badge-${tone} ${className}`}>{children}</span>
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />
}

/* ------------------------------ Champs de formulaire ------------------------------ */

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  wide?: boolean
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }) => ReactNode
}

export function Field({ label, error, hint, required, wide, children }: FieldProps) {
  const id = useId()
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={`form-field ${wide ? 'form-field-wide' : ''} ${error ? 'form-field-invalid' : ''}`}>
      <label htmlFor={id} className="form-label">
        {label}{required && <span className="form-required" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, required })}
      {hint && !error && <p id={`${id}-hint`} className="form-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
    </div>
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-input ui-select ${className}`} {...props}>{children}</select>
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`} rows={3} {...props} />
}

export function ReadOnlyValue({ id, children }: { id: string; children: ReactNode }) {
  return <output id={id} className="ui-input ui-readonly">{children}</output>
}

/** Champ texte avec suggestions (catégories, fournisseurs) : permet de saisir une valeur absente de la liste. */
export function SuggestInput({ options, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { options: string[]; id: string }) {
  return (
    <>
      <TextInput id={id} list={`${id}-options`} autoComplete="off" {...props} />
      <datalist id={`${id}-options`}>{options.map(option => <option key={option} value={option} />)}</datalist>
    </>
  )
}
