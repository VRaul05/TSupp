---
id: KB-SIS-004
titulo: Mantenimiento correctivo externo con proveedor (requisición y orden de compra)
tipo: procedimiento
categoria: TI
subcategoria: Mantenimiento correctivo
procedimiento_origen: MAP SIS 01
revision_origen: "05"
fecha_revision_origen: 2017-01-30
archivo_fuente: Procedimiento_de_Mantenimiento_Preventivo_y_Correctivo_de_Hardware_y_Software_2019-12-06_06_45_51_5.pdf
roles_permitidos: [agente, supervisor]
sensibilidad: interna
estado: publicado
idioma: es-MX
etiquetas: [mantenimiento externo, proveedor, refacción, requisición, FOR ADQ 01, orden de compra, FOR ADQ 02, Adquisiciones]
---

# Mantenimiento correctivo externo con proveedor

Este flujo aplica cuando el diagnóstico indica que el mantenimiento o la refacción deben obtenerse con un **proveedor externo**. Los pasos de recepción, registro en SIMACO y diagnóstico son los mismos que en KB-SIS-003.

## Pasos

1. **Informática y Sistemas** elabora la **Requisición (FOR ADQ 01)** y archiva una copia.
2. **Adquisiciones** elabora la **Orden de Compra (FOR ADQ 02)**.
3. El **proveedor externo** recibe la Orden de Compra y realiza el mantenimiento necesario o entrega la refacción, según lo solicitado en ella.
4. **Informática y Sistemas** verifica el servicio realizado por el proveedor y firma la Orden de Compra de aceptación.
5. Informática y Sistemas entrega el equipo o producto al usuario.
6. El **usuario** firma de conformidad la Orden de Trabajo (FOR SIS 03).
7. Se cierra la orden de trabajo en SIMACO (FOR SIS 04) y se archiva la FOR SIS 03 como evidencia.

## Controles

Los controles del servicio externo se rigen por los acuerdos y necesidades definidos en la Requisición (FOR ADQ 01). Los proveedores se evalúan al menos una vez al año (ver KB-SIS-009).

> El procedimiento no establece un plazo específico para que el proveedor entregue el servicio o la refacción.
