/**
 * Texto del aviso. Está separado del componente para que sea fácil
 * actualizarlo.  ⚠️ Es un BORRADOR: el área jurídica del DIF debe validarlo.
 */
export const NOTICE_VERSION = "Rev. 2026-Q4";
export const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Identidad y responsable del tratamiento",
    body:
      "La Dirección de Tecnología e Infraestructura y el Departamento de Mantenimiento " +
      "Institucional (“Mesa de Ayuda”) son responsables del tratamiento legítimo, controlado " +
      "e informado de sus datos personales, credenciales y registros operativos dentro de esta aplicación.",
  },
  {
    title: "Asistente técnico con IA local",
    body:
      "La plataforma integra un modelo de lenguaje que se ejecuta en servidores internos de la " +
      "institución. Las conversaciones, diagnósticos y descripciones de incidencias no se envían " +
      "ni se procesan en servidores externos de terceros. El asistente solo sugiere pasos; nunca " +
      "ejecuta acciones por su cuenta y la decisión final siempre es de una persona.",
  },
  {
    title: "Datos que recabamos",
    body:
      "Nombre, correo institucional, área de adscripción, descripción de los problemas reportados, " +
      "evidencias que usted adjunte (fotografías, capturas, archivos) y el historial de sus solicitudes.",
  },
  {
    title: "Finalidades",
    body:
      "Atender y dar seguimiento a sus solicitudes de soporte de TI e instalaciones, mostrarle el " +
      "estado y tiempo estimado de atención, generar métricas internas del servicio y mejorar la base " +
      "de conocimiento con soluciones validadas por el personal técnico.",
  },
  {
    title: "Resguardo y seguridad",
    body:
      "La información se cifra en tránsito y en reposo, y solo el personal autorizado según su rol " +
      "puede consultarla. Evite incluir contraseñas u otros datos sensibles en sus reportes o evidencias.",
  },
  {
    title: "Sus derechos",
    body:
      "Puede solicitar el acceso, rectificación, cancelación u oposición al tratamiento de sus datos " +
      "personales (derechos ARCO) ante la Unidad de Transparencia de la institución, conforme a la " +
      "legislación aplicable en materia de protección de datos personales.",
  },
  {
    title: "Cambios al aviso",
    body:
      "Cualquier modificación a este aviso se le notificará dentro de la aplicación y se le pedirá " +
      "aceptarlo nuevamente antes de continuar.",
  },
];
