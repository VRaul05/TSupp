import { CircleCheck, Clock, Headset, Building2, ShieldCheck, Sparkles, Zap } from "lucide-react";

/**
 * Panel izquierdo del login en computadora.
 * La ilustración está hecha con HTML (una tarjeta de ticket y una
 * sugerencia de la IA) en lugar de una imagen.
 */
export function LoginHero() {
  return (
    <aside className="login-hero">
      <div className="login-hero__brand">
        <span className="login-hero__logo">
          <Headset size={20} />
        </span>
        <span>
          <strong>Mesa de Ayuda</strong>
          <small>TI & Mantenimiento</small>
        </span>
        <span className="login-hero__badge">
          <ShieldCheck size={12} /> Soporte institucional
        </span>
      </div>

      {/* Ilustración */}
      <div className="login-art" aria-hidden="true">
        <div className="login-art__card">
          <div className="login-art__row">
            <span className="login-art__id">#TK-1083</span>
            <span className="login-art__status">
              <Clock size={11} /> En cola
            </span>
          </div>
          <p className="login-art__title">No puedo conectar mi laptop a la red</p>
          <div className="login-art__bar">
            <span />
          </div>
        </div>
        <div className="login-art__bubble">
          <span className="login-art__ai">
            <Sparkles size={14} />
          </span>
          <div>
            <strong>Sugerencia de la IA</strong>
            <p>Reinicia el adaptador y renueva la IP.</p>
            <span className="login-art__confidence">
              <CircleCheck size={11} /> Confianza alta
            </span>
          </div>
        </div>
        <span className="login-art__chip">
          <Zap size={12} /> Sugerencias al instante
        </span>
      </div>

      <div className="login-hero__text">
        <h1>Resuelve tus problemas de TI e instalaciones, más rápido</h1>
        <p>
          Atención técnica especializada, autoservicio inteligente y seguimiento en tiempo real
          para todos los colaboradores.
        </p>
      </div>

      <ul className="login-hero__features">
        <li>
          <ShieldCheck size={14} /> Asistente local seguro
        </li>
        <li>
          <Zap size={14} /> Resolución ágil
        </li>
        <li>
          <Building2 size={14} /> TI e instalaciones
        </li>
      </ul>
    </aside>
  );
}
