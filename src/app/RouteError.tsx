import { isRouteErrorResponse, useRouteError } from 'react-router'

/** Écran de secours en cas d'erreur de rendu ou d'échec de chargement d'une page. */
export function RouteError() {
  const error = useRouteError()
  const chunkFailure = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message)
  const message = isRouteErrorResponse(error)
    ? `La page demandée est indisponible (code ${error.status}).`
    : chunkFailure
      ? 'Une nouvelle version de l’application est peut-être disponible, ou la connexion a été interrompue.'
      : 'Une erreur inattendue a interrompu l’affichage de cette page.'

  if (import.meta.env.DEV) console.error(error)

  return (
    <div className="fatal-error" role="alert">
      <div className="brand-mark" aria-hidden="true">W</div>
      <h1 className="heading heading-2">Impossible d’afficher la page</h1>
      <p>{message}</p>
      <div className="fatal-actions">
        <button type="button" className="ui-button ui-button-primary" onClick={() => window.location.reload()}>Recharger</button>
        <a className="ui-button ui-button-secondary" href="/">Revenir à la vue générale</a>
      </div>
    </div>
  )
}
