import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CircleCheck,
  Eye,
  ListFilter,
  Megaphone,
  MessageSquareReply,
  RefreshCw,
} from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { BottomNav } from "../../components/BottomNav";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import {
  TYPE_LABEL,
  getNotifications,
  markAllRead,
  markRead,
  type AppNotification,
  type NotificationType,
} from "../../services/notificationService";
import { timeAgo } from "../../services/ticketService";
import { useIsDesktop } from "../../components/useMediaQuery";
import { NotificationsWeb } from "./NotificationsWeb";
import "./NotificationsPage.css";

const ICONS: Record<NotificationType, React.ReactNode> = {
  estado: <RefreshCw size={18} />,
  respuesta: <MessageSquareReply size={18} />,
  resuelto: <CircleCheck size={18} />,
  aviso_global: <Megaphone size={18} />,
};

const DAY = 24 * 60 * 60_000;

/** Resalta "#TK-1234" dentro del título. */
function TitleWithTicket({ title, ticketId }: { title: string; ticketId?: string }) {
  if (!ticketId || !title.includes(`#${ticketId}`)) return <>{title}</>;
  const [before, after] = title.split(`#${ticketId}`);
  return (
    <>
      {before}
      <span className="notif__ticket">#{ticketId}</span>
      {after}
    </>
  );
}

/** FR-14: notificaciones de cambios de estado y respuestas. */
function NotificationsMobile() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [draftTypes, setDraftTypes] = useState<NotificationType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const reload = () => getNotifications().then(setItems);
  useEffect(() => {
    reload();
  }, []);

  const unread = (items ?? []).filter((n) => !n.read).length;
  const visible = useMemo(
    () =>
      (items ?? []).filter(
        (n) => (!onlyUnread || !n.read) && (types.length === 0 || types.includes(n.type)),
      ),
    [items, onlyUnread, types],
  );
  const recent = visible.filter((n) => Date.now() - new Date(n.at).getTime() < DAY);
  const older = visible.filter((n) => Date.now() - new Date(n.at).getTime() >= DAY);

  function open(notification: AppNotification) {
    markRead(notification.id);
    if (notification.ticketId) {
      navigate(`/tickets/${notification.ticketId}`);
    } else {
      reload();
    }
  }

  function handleMarkAll() {
    markAllRead();
    reload();
  }

  function renderItem(n: AppNotification) {
    return (
      <li key={n.id}>
        <article className={`notif ${n.read ? "" : "notif--unread"}`}>
          <button type="button" className="notif__main" onClick={() => open(n)}>
            <span className={`notif__icon notif__icon--${n.type}`}>{ICONS[n.type]}</span>
            <span className="notif__content">
              <span className="notif__meta">
                <span className={`notif__tag notif__tag--${n.type}`}>{n.tag}</span>
                <span>{timeAgo(n.at)}</span>
              </span>
              <strong className="notif__title">
                <TitleWithTicket title={n.title} ticketId={n.ticketId} />
              </strong>
              <span className="notif__body">{n.body}</span>
              {n.quote && <q className="notif__quote">{n.quote}</q>}
            </span>
            {!n.read && <span className="notif__dot" aria-label="Sin leer" />}
          </button>
          {n.type === "respuesta" && n.ticketId && (
            <Button
              fullWidth
              leadingIcon={<Eye size={16} />}
              onClick={() => open(n)}
              className="notif__cta"
            >
              Ver respuesta
            </Button>
          )}
        </article>
      </li>
    );
  }

  return (
    <div className="screen">
      <AppHeader
        title="Notificaciones"
        onBack={() => navigate("/inicio")}
        action={
          <button
            type="button"
            className="app-header__icon notif-mark-all"
            onClick={handleMarkAll}
            disabled={unread === 0}
            aria-label="Marcar todas como leídas"
            title="Marcar todas como leídas"
          >
            <CheckCheck size={20} />
          </button>
        }
      />

      <main className="screen__content notifs">
        <div className="notifs__toolbar">
          <div className="notifs__tabs" role="tablist" aria-label="Mostrar">
            <button
              type="button"
              role="tab"
              aria-selected={!onlyUnread}
              className={!onlyUnread ? "is-on" : ""}
              onClick={() => setOnlyUnread(false)}
            >
              Todas <span className="notifs__count">{items?.length ?? 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onlyUnread}
              className={onlyUnread ? "is-on" : ""}
              onClick={() => setOnlyUnread(true)}
            >
              No leídas <span className="notifs__count notifs__count--pink">{unread}</span>
            </button>
          </div>
          <button
            type="button"
            className={`notifs__filter ${types.length ? "is-on" : ""}`}
            onClick={() => {
              setDraftTypes(types);
              setSheetOpen(true);
            }}
            aria-label="Filtrar por tipo"
          >
            <ListFilter size={18} />
            {types.length > 0 && <span className="notifs__filter-dot" />}
          </button>
        </div>

        {items === null && <div className="home__skeleton" aria-label="Cargando" />}

        {items !== null && visible.length === 0 && (
          <div className="requests__empty">
            <Bell size={32} />
            <p>{onlyUnread ? "¡Estás al día! No tienes notificaciones sin leer." : "No hay notificaciones."}</p>
          </div>
        )}

        {recent.length > 0 && (
          <section>
            <div className="notifs__section-head">
              <h2>Recientes</h2>
              {unread > 0 && <span className="notifs__unread">● {unread} sin leer</span>}
            </div>
            <ul className="notifs__list">{recent.map(renderItem)}</ul>
          </section>
        )}

        {older.length > 0 && (
          <section>
            <div className="notifs__section-head">
              <h2>Anteriores</h2>
            </div>
            <ul className="notifs__list">{older.map(renderItem)}</ul>
          </section>
        )}

        <aside className="notifs__info">
          <Bell size={16} />
          <p>
            <strong>¿Cuándo te avisamos?</strong> Cada vez que uno de tus tickets cambia de estado
            o un técnico te responde.
          </p>
        </aside>
      </main>

      <BottomNav />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtrar notificaciones"
        icon={<ListFilter size={20} />}
        footer={
          <>
            <Button variant="outlined" onClick={() => setDraftTypes([])}>
              Limpiar
            </Button>
            <Button
              onClick={() => {
                setTypes(draftTypes);
                setSheetOpen(false);
              }}
            >
              Aplicar
            </Button>
          </>
        }
      >
        <p className="sheet-section__group">Tipo de notificación</p>
        <div className="sheet-chips">
          {(Object.keys(TYPE_LABEL) as NotificationType[]).map((type) => {
            const on = draftTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={on}
                className={`sheet-chip ${on ? "sheet-chip--on" : ""}`}
                onClick={() =>
                  setDraftTypes((prev) => (on ? prev.filter((t) => t !== type) : [...prev, type]))
                }
              >
                {TYPE_LABEL[type]}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

export function NotificationsPage() {
  return useIsDesktop() ? <NotificationsWeb /> : <NotificationsMobile />;
}
