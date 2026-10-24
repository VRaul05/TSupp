/**
 * Comprobante imprimible: abre una ventana con el resumen y el cuadro de
 * impresión del navegador, donde se puede elegir "Guardar como PDF".
 */
export function printReceipt(folio: string, rows: [string, string][], description: string) {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const generated = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Comprobante ${esc(folio)}</title>
<style>
  body { font-family: system-ui, "Segoe UI", sans-serif; color: #3b1200; margin: 40px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #f48f35; padding-bottom: 12px; }
  h1 { margin: 0; font-size: 22px; } small { color: #8a7268; }
  .folio { font-size: 18px; font-weight: 800; color: #8f4e00; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
  th { text-align: left; width: 32%; color: #5c4033; font-weight: 600; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #f2ece9; vertical-align: top; }
  h2 { font-size: 15px; margin: 0 0 6px; }
  .desc { padding: 12px 14px; background: #fff8f5; border: 1px solid #ffdcc2; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
  footer { margin-top: 32px; font-size: 12px; color: #8a7268; }
  @media print { body { margin: 16mm; } }
</style></head>
<body>
  <header>
    <div><h1>Mesa de Ayuda</h1><small>Comprobante de solicitud de soporte</small></div>
    <div class="folio">#${esc(folio)}</div>
  </header>
  <table>${rows.filter(([, v]) => v).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
  <h2>Descripción del problema</h2>
  <div class="desc">${esc(description)}</div>
  <footer>Generado el ${esc(generated)}. Documento informativo emitido por el portal de Mesa de Ayuda.</footer>
  <script>window.onload = () => window.print();</script>
</body></html>`;

  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return false; // el navegador bloqueó la ventana
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
