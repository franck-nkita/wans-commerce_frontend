import { useState } from 'react'
import { useNavigate } from 'react-router'
import { pageMeta, type NavItem } from '@/app/navigation'
import { Badge, Button, Icon, Modal, Popover } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { isDemo } from '@/services/config'
import { notifications, session } from '@/services'
import { useTheme } from '@/theme/ThemeProvider'
import { GlobalSearch } from './GlobalSearch'

export default function Topbar({ active, menuOpen, onMenu }: { active: NavItem; menuOpen: boolean; onMenu: () => void }) {
  const meta = pageMeta[active]
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const notificationList = useAsync(() => notifications())
  const items = notificationList.data ?? []
  const { user, membership } = useSession()
  const profile = isDemo
    ? { initials: 'FM', name: 'Franck Mbuyi', detail: 'Direction générale' }
    : { initials: user?.initials ?? '', name: user?.fullName ?? '', detail: membership ? `${membership.roleLabel} · ${membership.company.name}` : '' }
  const otherCompanies = isDemo ? [] : (user?.memberships ?? []).filter(m => m.company.id !== membership?.company.id)
  const logout = () => { void session.logout().finally(() => navigate('/connexion')) }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <Button variant="ghost" className="menu-button" onClick={onMenu} aria-label="Ouvrir la navigation" aria-expanded={menuOpen} aria-controls="app-sidebar">
          <Icon name="menu" />
        </Button>
        <div className="topbar-copy">
          <div className="topbar-heading">{meta.title}</div>
          <div className="topbar-subtitle">{meta.subtitle}</div>
        </div>
      </div>
      <div className="topbar-actions">
        {isDemo && (
          <span className="demo-pill" title="Les chiffres affichés sont des données de démonstration, non issues de votre base.">
            <span className="demo-dot" aria-hidden="true" />Données de démonstration
          </span>
        )}
        <GlobalSearch />
        <Button variant="ghost" className="icon-button search-trigger" onClick={() => setSearchOpen(true)} aria-label="Rechercher">
          <Icon name="search" className="h-5 w-5" />
        </Button>
        <Button variant="secondary" className="assistant-button" onClick={() => navigate('/assistant-ia')}>
          <Icon name="sparkles" className="h-4 w-4" />Assistant IA
        </Button>
        <Button variant="ghost" className="icon-button theme-toggle" onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'} title={theme === 'light' ? 'Thème sombre' : 'Thème clair'}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} className="h-5 w-5" />
        </Button>
        <Popover className="notifications" trigger={props => (
          <Button variant="ghost" className="icon-button notification-button" onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true"
            aria-label={items.length ? `Notifications : ${items.length} non lues` : 'Notifications'}>
            <Icon name="bell" className="h-5 w-5" />{items.length > 0 && <span aria-hidden="true" />}
          </Button>
        )}>
          {close => (
            <div className="notification-panel">
              <div className="notification-head"><strong>Notifications</strong><Badge tone={items.length ? 'danger' : 'neutral'}>{items.length}</Badge></div>
              {items.length === 0 && <p className="notification-empty">Aucune notification.</p>}
              <ul>
                {items.map(item => (
                  <li key={item.id}>
                    <button type="button" className="notification-item" onClick={() => { close(); navigate(item.to) }}>
                      <span className={`timeline-dot timeline-${item.tone === 'info' ? 'warning' : item.tone}`}><span /></span>
                      <span><strong>{item.title}</strong><small>{item.text}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Popover>
        <Popover className="topbar-profile-menu" trigger={props => (
          <button type="button" className="topbar-profile" onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true" aria-label="Menu du profil">
            <div className="avatar" aria-hidden="true">{profile.initials}</div>
            <div><strong>{profile.name}</strong><span>{profile.detail}</span></div>
            <Icon name="chevron" className="h-4 w-4 rotate-90 profile-chevron" />
          </button>
        )}>
          {close => (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); navigate('/parametres') }}><Icon name="settings" className="h-4 w-4" />Paramètres</button>
              <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); navigate('/parametres?section=Apparence') }}><Icon name={theme === 'light' ? 'moon' : 'sun'} className="h-4 w-4" />Apparence</button>
              {otherCompanies.map(m => (
                <button key={m.company.id} type="button" role="menuitem" className="menu-item" onClick={() => { close(); session.selectCompany(m.company.id); navigate('/') }}>
                  <Icon name="warehouse" className="h-4 w-4" />Passer à {m.company.name}
                </button>
              ))}
              {!isDemo && <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); logout() }}><Icon name="logout" className="h-4 w-4" />Se déconnecter</button>}
            </div>
          )}
        </Popover>
      </div>
      <Modal open={searchOpen} title="Rechercher" description="Produits, clients, commandes et paiements." onClose={() => setSearchOpen(false)}>
        <GlobalSearch variant="panel" autoFocus onDone={() => setSearchOpen(false)} />
      </Modal>
    </header>
  )
}
