---
id: KB-SIS-003
titulo: Mantenimiento correctivo interno – Flujo para Informática y Sistemas
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
etiquetas: [mantenimiento correctivo, interno, SIMACO, FOR SIS 03, FOR SIS 04, diagnóstico, cierre de orden]
---

# Mantenimiento correctivo interno

Este flujo aplica cuando, después del diagnóstico, Informática y Sistemas puede resolver la falla con su propio personal.

## Recepción y registro del reporte

1. Se recibe el reporte del usuario de forma verbal, ya sea personal o por vía telefónica.
2. Se captura el reporte en **SIMACO**, lo que genera la **Orden de Trabajo (FOR SIS 03)**.
3. SIMACO concentra automáticamente las FOR SIS 03 en el **Registro de Órdenes de Trabajo (FOR SIS 04)**, indicando que la orden se encuentra **abierta**.
4. Se imprime el reporte y el usuario lo firma como solicitante.

## Diagnóstico

5. Se revisa el equipo y las posibles causas del problema.
6. Se da un diagnóstico y se evalúa si el mantenimiento es **interno** o **externo**. El procedimiento no define criterios específicos para esta decisión; depende del diagnóstico de Informática y Sistemas.

## Atención interna

7. Informática y Sistemas realiza el mantenimiento.
8. El usuario firma de conformidad la Orden de Trabajo (FOR SIS 03).
9. Se captura el cierre en SIMACO (el FOR SIS 04 deja de mostrar la orden como abierta).
10. Se archiva la Orden de Trabajo (FOR SIS 03) para guardar evidencia.

## Si el mantenimiento es externo

- Con proveedor externo: ver **KB-SIS-004**.
- Con DMAyF (K1000 / 072): ver **KB-SIS-005**.
