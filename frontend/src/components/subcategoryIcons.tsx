import type { ReactNode } from "react";
import {
  Armchair,
  DoorOpen,
  Droplets,
  KeyRound,
  Laptop,
  Lightbulb,
  Printer,
  Shield,
  Snowflake,
  SprayCan,
  SquareTerminal,
  Wifi,
  Wrench,
} from "lucide-react";

/** Ícono de cada subcategoría (se usa en el formulario, el inicio y los tickets). */
export function subcategoryIcon(id: string | undefined, size = 18): ReactNode {
  switch (id) {
    case "red": return <Wifi size={size} />;
    case "computadora": return <Laptop size={size} />;
    case "software": return <SquareTerminal size={size} />;
    case "cuenta": return <KeyRound size={size} />;
    case "impresora": return <Printer size={size} />;
    case "vpn": return <Shield size={size} />;
    case "iluminacion": return <Lightbulb size={size} />;
    case "climatizacion": return <Snowflake size={size} />;
    case "plomeria": return <Droplets size={size} />;
    case "mobiliario": return <Armchair size={size} />;
    case "cerraduras": return <KeyRound size={size} />;
    case "salones": return <DoorOpen size={size} />;
    case "limpieza": return <SprayCan size={size} />;
    default: return <Wrench size={size} />;
  }
}
