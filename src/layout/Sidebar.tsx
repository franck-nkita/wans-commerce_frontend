import { useEffect, useRef } from 'react'
import { businessNav, intelligenceNav, type NavEntry, type NavItem } from '@/app/navigation'
import { Button, Icon, Popover } from '@/components/ui'
import { openAnomaliesCount } from '@/services'
import { useDataVersion } from '@/hooks/useDataVersion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSession } from '@/hooks/useSession'
import { isDemo } from '@/services/config'

interface Props {
  active: NavItem
  onNav: (item: NavItem) => void
  mobileOpen: boolean
  onClose: () => void
  onHelp: () => void
}

function NavButton({ item, active, onNav, count }: { item: NavEntry; active: NavItem; onNav: (item: NavItem) => void; count?: number }) {
  const selected = active === item.label
  return (
    <Button variant="ghost" onClick={() => onNav(item.label)} className={`sidebar-link ${selected ? 'sidebar-link-active' : ''}`} aria-current={selected ? 'page' : undefined}>
      <Icon name={item.icon} className="h-[18px] w-[18px]" />
      <span>{item.title}</span>
      {count !== undefined && count > 0 && <span className="sidebar-count" aria-label={`${count} à examiner`}>{count}</span>}
    </Button>
  )
}

export default function Sidebar({ active, onNav, mobileOpen, onClose, onHelp }: Props) {
  useDataVersion()
  const anomalies = openAnomaliesCount()
  const { user, membership } = useSession()
  const profile = isDemo
    ? { initials: 'FM', name: 'Franck Mbuyi', role: 'Administrateur' }
    : { initials: user?.initials ?? '', name: user?.fullName ?? '', role: membership?.roleLabel ?? '' }
  const isDrawer = useMediaQuery('(max-width: 900px)')
  const asideRef = useRef<HTMLElement>(null)
  const navigate = (item: NavItem) => { onNav(item); onClose() }

  // Tiroir mobile : focus initial, fermeture par Échap et blocage du défilement de la page.
  useEffect(() => {
    if (!isDrawer || !mobileOpen) return
    asideRef.current?.querySelector<HTMLElement>('.sidebar-close')?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isDrawer, mobileOpen, onClose])

  const hidden = isDrawer && !mobileOpen

  return (
    <>
      {isDrawer && mobileOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside
        ref={asideRef}
        id="app-sidebar"
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        aria-label="Navigation principale"
        inert={hidden || undefined}
        {...(isDrawer && mobileOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">W</div>
          <div><div className="brand-name">WANS COMMERCE</div><div className="brand-byline">PAR WANS TECH</div></div>
          <Button variant="ghost" className="sidebar-close" onClick={onClose} aria-label="Fermer la navigation"><Icon name="close" /></Button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label" id="nav-gestion">GESTION</div>
          <div role="group" aria-labelledby="nav-gestion">
            {businessNav.map(item => <NavButton key={item.label} item={item} active={active} onNav={navigate} />)}
          </div>
          <div className="nav-label nav-label-spaced" id="nav-intelligence">INTELLIGENCE</div>
          <div role="group" aria-labelledby="nav-intelligence">
            {intelligenceNav.map(item => (
              <NavButton key={item.label} item={item} active={active} onNav={navigate} count={item.label === 'Anomalies' ? anomalies : undefined} />
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <Button variant="ghost" className={`sidebar-link ${active === 'Settings' ? 'sidebar-link-active' : ''}`} onClick={() => navigate('Settings')} aria-current={active === 'Settings' ? 'page' : undefined}>
            <Icon name="settings" className="h-[18px] w-[18px]" />Paramètres
          </Button>
          <Button variant="ghost" className="sidebar-link" onClick={() => { onClose(); onHelp() }}>
            <Icon name="help" className="h-[18px] w-[18px]" />Centre d’aide
          </Button>
          <div className="profile">
            <div className="avatar" aria-hidden="true">{profile.initials}</div>
            <div className="profile-copy"><strong>{profile.name}</strong><span>{profile.role}</span></div>
            <Popover align="left" className="profile-menu" trigger={props => (
              <Button variant="ghost" className="icon-button-plain" onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true" aria-label="Options du profil">
                <Icon name="more" className="h-5 w-5" />
              </Button>
            )}>
              {close => (
                <div className="menu" role="menu">
                  <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); navigate('Settings') }}><Icon name="user" className="h-4 w-4" />Profil de l’entreprise</button>
                  <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onClose(); onHelp() }}><Icon name="help" className="h-4 w-4" />Centre d’aide</button>
                </div>
              )}
            </Popover>
          </div>
        </div>
      </aside>
    </>
  )
}
