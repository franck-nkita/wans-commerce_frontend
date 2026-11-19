import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { routes } from '@/app/routes'
import { ToastProvider } from '@/components/ui'
import { ThemeProvider } from '@/theme/ThemeProvider'

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(<ThemeProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></ThemeProvider>)
  return { router, user }
}

describe('navigation', () => {
  it('affiche la vue générale puis navigue via la sidebar', async () => {
    const { router, user } = renderApp()
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour, Franck' })).toBeInTheDocument()
    const nav = screen.getByRole('complementary', { name: 'Navigation principale' })
    await user.click(within(nav).getByRole('button', { name: /Produits/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Produits' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/produits')
    expect(within(nav).getByRole('button', { name: /Produits/ })).toHaveAttribute('aria-current', 'page')
  })

  it('ouvre chaque parcours depuis son bouton', async () => {
    const { router, user } = renderApp()
    await user.click(await screen.findByRole('button', { name: /Nouvelle transaction/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Nouvelle transaction' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/flux/new-transaction')
    await user.click(screen.getByRole('button', { name: /Retour au tableau de bord/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour, Franck' })).toBeInTheDocument()
  })

  it('redirige les parcours inconnus vers la vue générale', async () => {
    renderApp('/flux/inexistant')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour, Franck' })).toBeInTheDocument()
  })
})

describe('thème', () => {
  it('bascule et mémorise le thème', async () => {
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Activer le thème sombre' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('wans-theme-preference')).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Activer le thème clair' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})

describe('formulaires', () => {
  it('valide puis enregistre un client, qui apparaît dans la liste', async () => {
    const { router, user } = renderApp('/flux/add-customer')
    await user.click(await screen.findByRole('button', { name: 'Enregistrer le client' }))
    expect((await screen.findAllByText('Ce champ est obligatoire.')).length).toBeGreaterThan(0)
    expect(router.state.location.pathname).toBe('/flux/add-customer')

    await user.type(screen.getByLabelText(/Nom complet/), 'Boutique Lemba')
    await user.type(screen.getByLabelText(/Téléphone/), '+243 99 123 4567')
    await user.type(screen.getByLabelText(/Adresse e-mail/), 'mauvais')
    await user.type(screen.getByLabelText(/^Ville/), 'Kinshasa')
    await user.type(screen.getByLabelText(/^Entreprise/), 'Lemba SARL')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le client' }))
    expect(await screen.findByText('Adresse e-mail invalide.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/Adresse e-mail/))
    await user.type(screen.getByLabelText(/Adresse e-mail/), 'contact@lemba.cd')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le client' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/clients'))
    expect(await screen.findByText('Client enregistré')).toBeInTheDocument()
    expect((await screen.findAllByText('Boutique Lemba')).length).toBeGreaterThan(0)
  })

  it('calcule le total d’une transaction et la valide', async () => {
    const { router, user } = renderApp('/flux/new-transaction')
    await user.click(await screen.findByRole('button', { name: 'Valider la transaction' }))
    expect(await screen.findByText('Sélectionnez un client.')).toBeInTheDocument()
    expect(screen.getByText('Ajoutez au moins un produit.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^Client/), 'CLI-1003')
    await user.type(screen.getByLabelText(/^Produits/), 'onduleur')
    await user.click(await screen.findByRole('button', { name: /Onduleur solaire 5 KVA/ }))
    const quantity = screen.getByLabelText('Quantité')
    await user.clear(quantity)
    await user.type(quantity, '2')
    await user.clear(screen.getByLabelText(/Remise/))
    await user.type(screen.getByLabelText(/Remise/), '10')
    const total = screen.getByText('Total', { selector: 'dt' }).nextElementSibling
    expect(total).toHaveTextContent(/^FC\s15\s300$/)

    await user.click(screen.getByRole('button', { name: 'Valider la transaction' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ventes'))
    expect(await screen.findByText('Transaction validée')).toBeInTheDocument()
  })
})

describe('recherche et filtres', () => {
  it('filtre les produits par la recherche et propose un état vide', async () => {
    const { user } = renderApp('/produits')
    const search = await screen.findByRole('searchbox', { name: 'Rechercher un produit' })
    await user.type(search, 'ciment')
    expect(await screen.findByText('Sac de ciment Dangote 50 kg')).toBeInTheDocument()
    expect(screen.queryByText('Onduleur solaire 5 KVA')).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'zzz')
    expect(await screen.findByText('Aucun produit trouvé')).toBeInTheDocument()
  })
})
