export type Errors<T> = Partial<Record<keyof T, string>>

type Rule<T> = (value: T[keyof T], values: T) => string | undefined
export type Schema<T> = Partial<Record<keyof T, Rule<T>[]>>

export function validate<T extends object>(values: T, schema: Schema<T>): Errors<T> {
  const errors: Errors<T> = {}
  for (const key of Object.keys(schema) as (keyof T)[]) {
    for (const rule of schema[key] ?? []) {
      const message = rule(values[key], values)
      if (message) {
        errors[key] = message
        break
      }
    }
  }
  return errors
}

export const hasErrors = <T,>(errors: Errors<T>) => Object.values(errors).some(Boolean)

export const required = <T,>(message = 'Ce champ est obligatoire.'): Rule<T> =>
  value => (value === undefined || value === null || String(value).trim() === '' ? message : undefined)

export const minLength = <T,>(length: number): Rule<T> =>
  value => (String(value ?? '').trim().length < length ? `Saisissez au moins ${length} caractères.` : undefined)

export const positiveNumber = <T,>(message = 'Saisissez un nombre supérieur à 0.'): Rule<T> =>
  value => {
    const n = Number(value)
    return String(value ?? '').trim() === '' || !Number.isFinite(n) || n <= 0 ? message : undefined
  }

export const nonNegativeNumber = <T,>(message = 'Saisissez un nombre positif ou nul.'): Rule<T> =>
  value => {
    const n = Number(value)
    return String(value ?? '').trim() === '' || !Number.isFinite(n) || n < 0 ? message : undefined
  }

export const integer = <T,>(message = 'Saisissez un nombre entier.'): Rule<T> =>
  value => (String(value ?? '').trim() !== '' && !Number.isInteger(Number(value)) ? message : undefined)

export const percent = <T,>(): Rule<T> =>
  value => {
    const n = Number(value)
    return !Number.isFinite(n) || n < 0 || n > 100 ? 'La remise doit être comprise entre 0 et 100 %.' : undefined
  }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const email = <T,>(): Rule<T> =>
  value => (String(value ?? '').trim() && !EMAIL.test(String(value).trim()) ? 'Adresse e-mail invalide.' : undefined)

const PHONE = /^\+?[0-9\s().-]{8,20}$/
export const phone = <T,>(): Rule<T> =>
  value => (String(value ?? '').trim() && !PHONE.test(String(value).trim()) ? 'Numéro de téléphone invalide.' : undefined)

export const pattern = <T,>(regex: RegExp, message: string): Rule<T> =>
  value => (String(value ?? '').trim() && !regex.test(String(value).trim()) ? message : undefined)
