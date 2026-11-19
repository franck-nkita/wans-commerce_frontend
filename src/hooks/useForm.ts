import { useCallback, useState } from 'react'
import { hasErrors, validate, type Errors, type Schema } from '@/lib/validation'

/** État de formulaire typé : valeurs, erreurs par champ (affichées après la première soumission) et erreur globale. */
export function useForm<T extends object>(initial: T | (() => T), schema: Schema<T>) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => {
      const next = { ...prev, [key]: value }
      if (submitted) setErrors(validate(next, schema))
      return next
    })
  }, [schema, submitted])

  const check = useCallback(() => {
    setSubmitted(true)
    const found = validate(values, schema)
    setErrors(found)
    return !hasErrors(found)
  }, [schema, values])

  return { values, setValues, set, errors, setErrors, check, formError, setFormError }
}
