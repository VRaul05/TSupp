import "./StepHeader.css";

interface StepHeaderProps {
  step: number;
  total: number;
  label: string;
}

/** Indicador "Paso X de Y" con barra de progreso. */
export function StepHeader({ step, total, label }: StepHeaderProps) {
  return (
    <div className="step-header">
      <div className="step-header__row">
        <strong>
          Paso {step} de {total}
        </strong>
        <span>{label}</span>
      </div>
      <div
        className="step-header__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label={`Paso ${step} de ${total}: ${label}`}
      >
        <span style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}
