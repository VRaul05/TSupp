import { useNavigate } from "react-router-dom";
import { Construction, LogOut, RotateCcw } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/Button";
import { logout, resetDemoState } from "../services/authService";

interface Props {
  title: string;
  showSessionActions?: boolean; // en Perfil: cerrar sesión y reiniciar demo
}

/** Pantalla temporal para las secciones que todavía no se diseñan. */
export function ComingSoonPage({ title, showSessionActions = false }: Props) {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <AppHeader title={title} onBack={() => navigate("/inicio")} />
      <main
        className="screen__content"
        style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}
      >
        <Construction size={40} style={{ margin: "24px auto 0", color: "var(--color-primary)" }} />
        <h2 style={{ margin: 0, color: "var(--color-neutral)" }}>{title}</h2>
        <p style={{ margin: 0 }}>Esta sección se construirá en una siguiente tarea.</p>

        {showSessionActions && (
          <>
            <Button
              variant="outlined"
              leadingIcon={<LogOut size={18} />}
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Cerrar sesión
            </Button>
            <Button
              variant="ghost"
              leadingIcon={<RotateCcw size={18} />}
              onClick={() => {
                resetDemoState();
                navigate("/login", { replace: true });
              }}
            >
              Reiniciar demo (borra datos de prueba)
            </Button>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
