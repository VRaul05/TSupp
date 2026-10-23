import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { KnowledgeProvider } from './context/KnowledgeContext'
import type { Role } from './data/tickets'
import LayoutWrapper from './routes'
import Access from './pages/Access'
import Tickets from './pages/Tickets'
import TicketCreate from './pages/TicketCreate'
import TicketDetail from './pages/TicketDetail'
import Knowledge from './pages/Knowledge'
import KnowledgeArticle from './pages/KnowledgeArticle'
import Placeholder from './pages/Placeholder'

function Protected({ children, roles }: { children: ReactNode; roles: Role[] }) {
  const { session } = useApp()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/acceso" state={{ from: location.pathname }} replace />
  }
  if (!roles.includes(session.role)) {
    return (
      <div className="denied">
        <h2>Acceso restringido</h2>
        <p>Tu rol no tiene permiso para esta pantalla.</p>
        <a href="/tickets">Volver a Mis tickets</a>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <KnowledgeProvider>
          <Routes>
            <Route path="/acceso" element={<Access />} />
            <Route element={
              <Protected roles={['empleado', 'agente', 'supervisor']}>
                <LayoutWrapper />
              </Protected>
            }>
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/tickets/:id" element={
                <Protected roles={['agente', 'supervisor']}>
                  <TicketDetail />
                </Protected>
              } />
              <Route path="/registro" element={<TicketCreate />} />
              <Route path="/conocimiento" element={<Knowledge />} />
              <Route path="/conocimiento/:id" element={<KnowledgeArticle />} />
              <Route path="/alertas" element={<Placeholder title="Alertas" />} />
              <Route path="/perfil" element={<Placeholder title="Perfil" />} />
            </Route>
            <Route path="*" element={<Navigate to="/tickets" replace />} />
          </Routes>
        </KnowledgeProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
