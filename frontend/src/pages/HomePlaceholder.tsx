import { useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { resetDemoState } from "../services/authService";

/** Pantalla temporal: aquí irá el inicio del empleado en la siguiente tarea. */
export function HomePlaceholder() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <AppHeader />
      <main className="screen__content" style={{ textAlign: "center" }}>
        <h2 style={{ color: "var(--color-neutral)" }}>¡Sesión iniciada!</h2>
        <p>Aquí irá la pantalla de inicio del empleado.</p>
        <Button
          variant="outlined"
          onClick={() => {
            resetDemoState();
            navigate("/login");
          }}
        >
          Reiniciar demo y volver al login
        </Button>
      </main>
    </div>
  );
}
