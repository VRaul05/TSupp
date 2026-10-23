import type { Ticket } from './tickets';

export type TicketAnswer = Ticket['answers'][number];
export interface TicketQuestion {
  id: string;
  key: string;
  question: string;
  required: boolean;
}

// Baseline UI prompts. A future configuration API can supply the subcategory
// templates managed by the supervisor (FR-55); these are never sample answers.
const commonQuestions: TicketQuestion[] = [
  { id: 'affected', key: 'ticketFormQuestionAffected', question: '¿A quién afecta?', required: true },
  { id: 'since', key: 'ticketFormQuestionSince', question: '¿Desde cuándo ocurre o se necesita el servicio?', required: true },
];
const subcategoryQuestions: Record<string, TicketQuestion> = {
  'Equipo audiovisual': { id: 'equipment', key: 'ticketFormQuestionEquipment', question: '¿Qué equipo audiovisual presenta el problema?', required: true },
  'Software y licencias': { id: 'application', key: 'ticketFormQuestionApplication', question: '¿Qué aplicación o licencia está involucrada?', required: true },
  'Seguridad y acceso': { id: 'access', key: 'ticketFormQuestionAccess', question: '¿A qué sistema o recurso necesitas acceder?', required: true },
  'Redes y conectividad': { id: 'network', key: 'ticketFormQuestionNetwork', question: '¿Qué red o conexión presenta el problema?', required: true },
  'Climatización (HVAC) / Termostatos': { id: 'climateZone', key: 'ticketFormQuestionClimateZone', question: '¿Qué zona o equipo de climatización requiere atención?', required: true },
  'Iluminación': { id: 'lightingZone', key: 'ticketFormQuestionLightingZone', question: '¿En qué zona se encuentra la iluminación afectada?', required: true },
  'Mobiliario': { id: 'furniture', key: 'ticketFormQuestionFurniture', question: '¿Qué mueble requiere atención y dónde se encuentra?', required: true },
  'Plomería': { id: 'plumbingZone', key: 'ticketFormQuestionPlumbingZone', question: '¿Qué instalación de plomería requiere atención y dónde se encuentra?', required: true },
};
const additionalQuestions: TicketQuestion[] = [
  { id: 'attempted', key: 'ticketFormQuestionAttempted', question: '¿Qué pruebas o acciones se han realizado?', required: false },
  { id: 'observations', key: 'ticketFormQuestionObservations', question: 'Observaciones adicionales', required: false },
];

export function getTicketQuestions(subcategory: string): TicketQuestion[] {
  const specific = subcategoryQuestions[subcategory] ?? {
    id: 'resource', key: 'ticketFormQuestionResource', question: '¿Qué equipo, recurso o zona requiere atención?', required: true,
  };
  return [...commonQuestions, specific, ...additionalQuestions];
}

export function validateTicketAnswers(subcategory: string, answers: TicketAnswer[]): boolean {
  return getTicketQuestions(subcategory).filter(question => question.required).every(question =>
    answers.some(answer => answer.question === question.question && Boolean(answer.answer.trim())),
  );
}

export function normalizeTicketAnswers(subcategory: string, answers: TicketAnswer[]): TicketAnswer[] {
  return getTicketQuestions(subcategory).flatMap(question => {
    const value = answers.find(answer => answer.question === question.question)?.answer.trim() ?? '';
    return value ? [{ question: question.question, answer: value }] : [];
  });
}
