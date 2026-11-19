import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog, Modal, useToast } from '@/components/ui'
import { resetDemoData } from '@/services'
import { isDemo } from '@/services/config'

const guides = [
  { title: 'Enregistrer une vente', text: 'Vue générale → « Nouvelle transaction », ou Ventes → « Nouvelle commande ».', to: '/flux/new-transaction' },
  { title: 'Ajouter un produit', text: 'Produits → « Ajouter un produit ». Le stock initial est affecté à l’entrepôt choisi.', to: '/flux/add-product' },
  { title: 'Traiter une alerte de stock', text: 'Stocks → « alertes critiques », puis « Réapprovisionner ».', to: '/flux/alerts' },
  { title: 'Exporter un rapport', text: 'Rapports → « Générer un rapport » : PDF (impression), Excel ou CSV.', to: '/flux/generate-report' },
]

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const notify = useToast()
  return (
    <>
    <Modal open={open} title="Centre d’aide" description="Les principales opérations de WANS COMMERCE." onClose={onClose}>
      <ul className="help-list">
        {guides.map(guide => (
          <li key={guide.title}>
            <Link to={guide.to} onClick={onClose}><strong>{guide.title}</strong></Link>
            <p>{guide.text}</p>
          </li>
        ))}
      </ul>
      <div className="help-shortcuts">
        <strong>Raccourcis clavier</strong>
        <p><kbd>Tab</kbd> parcourt les éléments, <kbd>Échap</kbd> ferme les fenêtres et menus, <kbd>↑</kbd> <kbd>↓</kbd> naviguent dans les résultats de recherche.</p>
      </div>
      {isDemo && (
        <div className="help-note">
          <p>Mode démonstration : les données sont fictives, conservées uniquement dans cet onglet et jamais envoyées à un serveur.</p>
          <button type="button" className="ui-button ui-button-secondary" onClick={() => { onClose(); setConfirmReset(true) }}>Réinitialiser les données de démonstration</button>
        </div>
      )}
    </Modal>
    {/* Hors de la modale d'aide : une seule fenêtre est ouverte à la fois, et Échap ne ferme que la confirmation. */}
    <ConfirmDialog open={confirmReset} title="Réinitialiser la démonstration ?" confirmLabel="Réinitialiser" tone="danger"
      message="Les produits, clients, commandes et paiements saisis dans cet onglet seront supprimés et les données d’origine restaurées."
      onCancel={() => setConfirmReset(false)}
      onConfirm={() => { resetDemoData(); setConfirmReset(false); notify('success', 'Démonstration réinitialisée', 'Les données d’origine ont été restaurées.') }} />
    </>
  )
}
