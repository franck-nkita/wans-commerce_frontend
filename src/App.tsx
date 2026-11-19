import { RouterProvider, createBrowserRouter } from 'react-router'
import { routes } from '@/app/routes'
import { ToastProvider } from '@/components/ui'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { session } from '@/services'
import { isDemo } from '@/services/config'

const router = createBrowserRouter(routes)

// Mode API : reprise de la session (cookie HttpOnly de rafraîchissement) dès le chargement de l'application.
if (!isDemo) void session.restore()

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ThemeProvider>
  )
}
