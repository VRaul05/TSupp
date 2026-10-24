import { useEffect, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { STATUS_META, type AnyStatus } from "../../components/StatusBadge";
import {
  EMPTY_FILTERS,
  REQUEST_FILTER_OPTIONS,
  TICKET_FILTER_OPTIONS,
  type DateRange,
  type Filters,
} from "./listItems";

interface Props {
  open: boolean;
  initial: Filters;
  onClose: () => void;
  onApply: (filters: Filters) => void;
}

const DATE_OPTIONS: { id: DateRange; label: string }[] = [
  { id: "7dias", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "personalizado", label: "Personalizado" },
];

/** Panel "Filtrar solicitudes". Los cambios se aplican al presionar "Aplicar filtros". */
export function FilterSheet({ open, initial, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<Filters>(initial);

  // Cada vez que se abre, parte de los filtros actuales.
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  function toggleStatus(status: AnyStatus) {
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(status)
        ? d.statuses.filter((s) => s !== status)
        : [...d.statuses, status],
    }));
  }

  function chooseDate(range: DateRange) {
    // Tocar la opción ya elegida la quita.
    setDraft((d) => ({ ...d, date: d.date === range ? "todo" : range }));
  }

  const statusChip = (status: AnyStatus) => {
    const on = draft.statuses.includes(status);
    return (
      <button
        key={status}
        type="button"
        aria-pressed={on}
        className={`sheet-chip sheet-chip--${status} ${on ? "sheet-chip--on" : ""}`}
        onClick={() => toggleStatus(status)}
      >
        {on && <Check size={12} strokeWidth={3} />}
        {STATUS_META[status].label}
      </button>
    );
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filtrar solicitudes"
      icon={<SlidersHorizontal size={20} />}
      footer={
        <>
          <Button variant="outlined" onClick={() => setDraft(EMPTY_FILTERS)}>
            Limpiar filtros
          </Button>
          <Button onClick={() => onApply(draft)}>Aplicar filtros</Button>
        </>
      }
    >
      <section className="sheet-section">
        <div className="sheet-section__head">
          <h3>Por estado</h3>
          <span>Selección múltiple</span>
        </div>
        <p className="sheet-section__group">Tickets de servicio</p>
        <div className="sheet-chips">{TICKET_FILTER_OPTIONS.map(statusChip)}</div>
        <p className="sheet-section__group">Autoservicio</p>
        <div className="sheet-chips">{REQUEST_FILTER_OPTIONS.map(statusChip)}</div>
      </section>

      <section className="sheet-section">
        <div className="sheet-section__head">
          <h3>Por fecha</h3>
        </div>
        <div className="sheet-dates">
          {DATE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={draft.date === option.id}
              className={`sheet-chip sheet-chip--date ${draft.date === option.id ? "sheet-chip--on" : ""}`}
              onClick={() => chooseDate(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {draft.date === "personalizado" && (
          <div className="sheet-range">
            <label>
              Desde
              <input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              />
            </label>
          </div>
        )}
      </section>
    </BottomSheet>
  );
}
