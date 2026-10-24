import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { subcategoryIcon } from "../../components/subcategoryIcons";
import type { Subcategory } from "../../services/ticketService";



interface Props {
  options: Subcategory[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

/**
 * Lista desplegable con íconos (como en el diseño).
 * Se maneja con teclado: flechas, Enter y Escape.
 */
export function SubcategorySelect({ options, value, onChange, error }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  // Cerrar al tocar fuera.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(option: Subcategory) {
    onChange(option.id);
    setOpen(false);
  }

  function handleKey(event: KeyboardEvent) {
    if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setActive(Math.max(0, options.findIndex((o) => o.id === value)));
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="request__field" ref={wrapperRef}>
      <span className="request__label" id={`${id}-label`}>
        Subcategoría <span className="request__req">*</span>
      </span>
      <div className="select">
        <button
          type="button"
          className={`select__trigger ${open ? "select__trigger--open" : ""} ${error ? "is-invalid" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          aria-controls={`${id}-list`}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKey}
        >
          {selected ? (
            <span className="select__value">
              <span className="select__icon">{subcategoryIcon(selected.id)}</span>
              {selected.label}
            </span>
          ) : (
            <span className="select__placeholder">Selecciona una opción</span>
          )}
          <ChevronDown size={18} className="select__chevron" />
        </button>

        {open && (
          <ul className="select__list" role="listbox" id={`${id}-list`} aria-labelledby={`${id}-label`}>
            {options.map((option, i) => (
              <li
                key={option.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={option.id === value}
                className={`select__option ${i === active ? "select__option--active" : ""} ${
                  option.id === value ? "select__option--selected" : ""
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="select__icon">{subcategoryIcon(option.id)}</span>
                <span>{option.label}</span>
                {option.id === value && <Check size={16} className="select__check" />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="request__error">{error}</p>}
    </div>
  );
}
