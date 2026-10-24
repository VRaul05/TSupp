import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Building2,
  ChevronRight,
  CircleCheck,
  ListOrdered,
  Lock,
  MapPin,
  Mic,
  MonitorSmartphone,
  Plus,
  Search,
  MessageCircleQuestion,
} from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { getCurrentUser } from "../services/authService";
import { getMyTickets, timeAgo, TICKET_STATUS, type Ticket } from "../services/ticketService";
import { StatusBadge } from "../components/StatusBadge";
import { useUnreadCount } from "../components/useUnreadCount";
import { useIsDesktop } from "../components/useMediaQuery";
import { HomeWeb } from "./home-web/HomeWeb";
import "./HomePage.css";


// --- Dictado por voz (solo si el navegador lo soporta, ej. Chrome) ---
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
}

function createRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Primero lo que necesita acción del empleado, luego lo más reciente. */
const URGENT: Ticket["status"][] = ["esperando_respuesta", "resuelto"];
function byUrgency(a: Ticket, b: Ticket) {
  const ua = URGENT.includes(a.status) ? 0 : 1;
  const ub = URGENT.includes(b.status) ? 0 : 1;
  return ua - ub || b.updatedAt.localeCompare(a.updatedAt);
}

function HomeMobile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const unread = useUnreadCount();
  const firstName = user?.name.split(" ")[0] ?? "";

  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [speechSupported] = useState(() => createRecognition() !== null);

  useEffect(() => {
    getMyTickets().then(setTickets);
  }, []);

  const activeTickets = (tickets ?? []).filter((t) => TICKET_STATUS[t.status].open);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    // La descripción escrita aquí se lleva al formulario de nueva solicitud.
    navigate("/nueva-solicitud", { state: { description: query.trim() } });
  }

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = createRecognition();
    if (!recognition) return;
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setQuery((prev) => (prev ? `${prev} ${text}` : text));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <div className="screen">
      <AppHeader />

      <main className="screen__content home">
        {/* ---------- Saludo ---------- */}
        <section className="home__greeting">
          <div>
            <h2>Hola, {firstName}</h2>
            <p>
              <span className="home__dot" aria-hidden="true" />
              {user?.area}
              <span className="home__ai"> · IA local lista</span>
            </p>
          </div>
          <Link
            to="/notificaciones"
            className="home__bell"
            aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
          >
            <Bell size={20} />
            {unread > 0 && <span className="home__bell-badge" aria-hidden="true" />}
          </Link>
        </section>

        {/* ---------- Búsqueda ---------- */}
        <form className="home__search" onSubmit={handleSearch} role="search">
          <Search size={18} className="home__search-icon" />
          <label htmlFor="home-search" className="sr-only">
            Describe tu problema
          </label>
          <input
            id="home-search"
            type="search"
            placeholder="¿Qué problema tienes?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
          {speechSupported && (
            <button
              type="button"
              className={`home__mic ${listening ? "home__mic--on" : ""}`}
              onClick={toggleDictation}
              aria-label={listening ? "Detener dictado" : "Dictar por voz"}
              aria-pressed={listening}
            >
              <Mic size={16} />
            </button>
          )}
        </form>
        <p className="home__search-hint">
          <Lock size={12} /> Búsqueda inteligente con IA local (privada).
        </p>

        {/* ---------- Categorías ---------- */}
        <section className="home__section">
          <h3 className="home__section-title">Elige un tipo de problema</h3>
          <div className="home__categories">
            <Link to="/nueva-solicitud?categoria=ti" className="home__category">
              <span className="home__category-icon">
                <MonitorSmartphone size={22} />
              </span>
              <span className="home__category-text">
                <strong>Tecnología / TI</strong>
                <span>Computadoras, red, software, cuentas corporativas, impresoras.</span>
              </span>
              <ArrowRight size={18} className="home__category-arrow" />
            </Link>
            <Link to="/nueva-solicitud?categoria=edificio" className="home__category">
              <span className="home__category-icon">
                <Building2 size={22} />
              </span>
              <span className="home__category-text">
                <strong>Edificio / Instalaciones</strong>
                <span>Iluminación, salones, mobiliario, climatización, plomería, accesos.</span>
              </span>
              <ArrowRight size={18} className="home__category-arrow" />
            </Link>
          </div>
        </section>

        {/* ---------- Tickets activos ---------- */}
        <section className="home__section">
          <div className="home__section-head">
            <h3 className="home__section-title">Mis tickets activos</h3>
            <Link to="/mis-tickets" className="home__see-all">
              Ver todos ({activeTickets.length}) <ChevronRight size={14} />
            </Link>
          </div>

          {tickets === null && <div className="home__skeleton" aria-label="Cargando tickets" />}

          {tickets !== null && activeTickets.length === 0 && (
            <p className="home__empty">No tienes tickets activos. ¡Todo en orden!</p>
          )}

          <ul className="home__tickets">
            {[...activeTickets].sort(byUrgency).slice(0, 3).map((ticket) => (
              <li key={ticket.id} className="ticket-card">
                <div className="ticket-card__top">
                  <span className="ticket-card__id">#{ticket.id}</span>
                  <span className="ticket-card__time">{timeAgo(ticket.createdAt)}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="ticket-card__title">{ticket.title}</p>
                <div className="ticket-card__bottom">
                  {ticket.status === "en_cola" || ticket.status === "recibido" ? (
                    <span>
                      <ListOrdered size={14} /> Posición estimada: {ticket.queuePosition ?? "—"}
                    </span>
                  ) : ticket.status === "esperando_respuesta" ? (
                    <span className="ticket-card__action">
                      <MessageCircleQuestion size={14} /> El técnico necesita tu respuesta
                    </span>
                  ) : ticket.status === "resuelto" ? (
                    <span>
                      <CircleCheck size={14} /> Confirma si quedó resuelto
                    </span>
                  ) : (
                    <span>
                      <MapPin size={14} /> {ticket.statusNote ?? ticket.technician?.name ?? "En atención"}
                    </span>
                  )}
                  <Link to={`/tickets/${ticket.id}`}>Detalle</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* El botón flotante y la navegación van juntos para que el botón
          siempre quede justo arriba de la barra inferior. */}
      <div className="home__dock">
        <Link to="/nueva-solicitud" className="home__fab">
          <Plus size={20} /> Nueva solicitud
        </Link>
        <BottomNav />
      </div>
    </div>
  );
}

/** Inicio: versión web en computadora, versión móvil en celular. */
export function HomePage() {
  return useIsDesktop() ? <HomeWeb /> : <HomeMobile />;
}
