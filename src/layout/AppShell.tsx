import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { activePage, pageMeta, pagePaths, type NavItem } from '@/app/navigation'
import { Button, Card, EmptyState, LoadingState } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import { session } from '@/services'
import { isDemo } from '@/services/config'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { HelpDialog } from './HelpDialog'

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const active = activePage(location.pathname)
  const mainRef = useRef<HTMLElement>(null)

  const goToPage = useCallback((page: NavItem) => navigate(pagePaths[page]), [navigate])
  const closeMenu = useCallback(() => setMobileOpen(false), [])

  // À chaque changement de page : retour en haut, titre du document et focus sur le contenu.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = `${pageMeta[active].title} · WANS COMMERCE`
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname, active])

  return (
    <div className="app-shell">
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <Sidebar active={active} onNav={goToPage} mobileOpen={mobileOpen} onClose={closeMenu} onHelp={() => setHelpOpen(true)} />
      <div className="app-main">
        <Topbar active={active} menuOpen={mobileOpen} onMenu={() => setMobileOpen(true)} />
        <main id="contenu" ref={mainRef} className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

/**
 * Mode API : l'application exige une session et une entreprise active. La session est reprise au chargement
 * grâce au cookie de rafraîchissement (voir src/services/session.ts).
 */
function RequireSession() {
  const { status, membership } = useSession()
  const location = useLocation()
  if (status === 'loading') return <main className="auth-page"><Card className="auth-card"><LoadingState label="Ouverture de votre session…" rows={3} /></Card></main>
  if (status === 'anonymous') {
    return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (!membership) {
    return (
      <main className="auth-page">
        <Card className="auth-card">
          <EmptyState icon="warehouse" title="Aucune entreprise accessible"
            message="Votre compte n’est rattaché à aucune entreprise active, ou votre accès a été suspendu. Contactez l’administrateur de votre entreprise."
            action={<Button variant="secondary" onClick={() => void session.logout()}>Se déconnecter</Button>} />
        </Card>
      </main>
    )
  }
  // La clé force le remontage complet lors d'un changement d'entreprise : aucune donnée de l'entreprise précédente ne subsiste à l'écran.
  return <Shell key={membership.company.id} />
}

export default function AppShell() {
  return isDemo ? <Shell /> : <RequireSession />
}
