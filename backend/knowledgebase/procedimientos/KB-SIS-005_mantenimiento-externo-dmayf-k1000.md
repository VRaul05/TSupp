---
id: KB-SIS-005
titulo: Mantenimiento externo vía DMAyF (aplicación K1000 y número 072)
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
etiquetas: [DMAyF, K1000, "072", Subdirección de Sistemas, finanzas, mantenimiento externo]
---

# Mantenimiento externo vía DMAyF (K1000 / 072)

Este flujo aplica cuando el servicio debe realizarlo **DMAyF**, a través de su **Subdirección de Sistemas** (Subdirección de Sistemas de finanzas). En este caso no se elabora requisición ni orden de compra; la solicitud y el control se hacen con la aplicación K1000.

## Pasos

1. Informática y Sistemas realiza el reporte del servicio en la aplicación **K1000**.
2. Se hace también el reporte por vía telefónica al **072**, como lo solicita K1000.
3. La **Subdirección de Sistemas de DMAyF** realiza el trabajo según el reporte 072 (K1000).
4. **Informática y Sistemas** verifica el servicio.
5. **DMAyF** cierra el reporte en K1000 mediante la llamada al 072.
6. El **usuario** firma de conformidad la Orden de Trabajo (FOR SIS 03).
7. Se cierra la orden de trabajo en SIMACO (FOR SIS 04) y se archiva la FOR SIS 03.

## Controles

Para DMAyF, los controles del servicio se rigen por lo definido en el reporte K1000.

## Glosario

- **K1000:** aplicación con la que se reporta el servicio a DMAyF.
- **072:** número telefónico usado para levantar y cerrar el reporte con DMAyF.
- **DMAyF:** dependencia cuya Subdirección de Sistemas (de finanzas) realiza el servicio. El documento fuente no desarrolla el significado completo de la sigla.
