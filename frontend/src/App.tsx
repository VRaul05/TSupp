import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { ScrollToTop } from "./components/ScrollToTop";
import { LoginPage } from "./pages/LoginPage";
import { PrivacyNoticePage } from "./pages/PrivacyNoticePage";
import { HomePage } from "./pages/HomePage";
import { NewRequestPage } from "./pages/new-request/NewRequestPage";
import { SuggestionsPage } from "./pages/suggestions/SuggestionsPage";
import { ResolvedPage } from "./pages/ResolvedPage";
import { TicketCreatedPage } from "./pages/TicketCreatedPage";
import { MyRequestsPage } from "./pages/my-requests/MyRequestsPage";
import { TicketDetailPage } from "./pages/ticket-detail/TicketDetailPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { ProfilePage } from "./pages/profile/ProfilePage";

const privateRoute = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/aviso-privacidad" element={<PrivacyNoticePage />} />

        {/* Portal del empleado (requieren sesión) */}
        <Route path="/inicio" element={privateRoute(<HomePage />)} />
        <Route path="/nueva-solicitud" element={privateRoute(<NewRequestPage />)} />
        <Route path="/solicitud/:id/sugerencias" element={privateRoute(<SuggestionsPage />)} />
        <Route path="/solicitud/:id/resuelta" element={privateRoute(<ResolvedPage />)} />
        <Route path="/tickets/:id/creado" element={privateRoute(<TicketCreatedPage />)} />
        <Route path="/mis-tickets" element={privateRoute(<MyRequestsPage />)} />
        <Route path="/tickets/:id" element={privateRoute(<TicketDetailPage />)} />
        <Route path="/notificaciones" element={privateRoute(<NotificationsPage />)} />
        <Route path="/avisos" element={<Navigate to="/notificaciones" replace />} />
        <Route path="/perfil" element={privateRoute(<ProfilePage />)} />

        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
