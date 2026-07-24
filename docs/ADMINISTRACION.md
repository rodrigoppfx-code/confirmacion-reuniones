# Administración diaria

Todo lo operativo se controla desde el Google Sheet. La forma recomendada es
recargar la hoja y abrir **Avovite → Abrir panel de administración**.

## Panel visual

El panel guarda los cambios directamente en la pestaña privada `Config` y los
aplica al formulario y al proceso automático.

### Resumen

- Pausa o activa nuevas reservas.
- Pausa o activa por separado la generación de videos y los correos.
- Escoge entre procesamiento inmediato completo o procesamiento periódico.
- Define cada cuánto trabaja el modo periódico: 1, 5, 10, 15 o 30 minutos.
- Define la primera fila pendiente del modo periódico.
- Ejecuta el proceso inmediatamente desde esa fila.
- Consulta cuántas filas están pendientes, generando, enviadas o con error.

La fila inicial no borra ni modifica las filas anteriores; solo indica desde
dónde debe buscar el modo periódico o una ejecución manual. El cursor avanza
automáticamente hasta la primera fila que todavía necesita trabajo. Si guardas
`13`, ninguna fila entre la 2 y la 12 será enviada a HeyGen por el modo periódico.
El modo inmediato procesa directamente la fila nueva y no usa ese cursor.

Cuando **Generar videos** está desactivado, el trigger puede seguir apareciendo
como activo, pero termina sin llamar a HeyGen ni enviar correos. Las reservas
nuevas quedan pendientes hasta que vuelvas a activarlo.

El interruptor **Iniciar inmediatamente** permite escoger el modo:

- Activado: la reserva solicita el video al entrar y un seguimiento temporal
  interno continúa hasta enviar el correo. No existe trigger periódico.
- Desactivado: la fila espera al trigger periódico, que inicia el video, consulta
  su estado y envía el correo según el intervalo elegido.

Una ejecución manual desde el panel sí puede iniciar filas pendientes desde la
fila indicada, independientemente del modo elegido.

Antes de solicitar HeyGen, todos los caminos verifican la fila. Si ya contiene
`Video URL` o `Video ID`, no crean otro video. Esta protección también aplica
si la fila inicial se cambia accidentalmente hacia una fila ya procesada.

### HeyGen, agenda y mensajes

Las pestañas del panel permiten cambiar la API key, avatar, voz, guion,
disponibilidad y correo. Si dejas vacía la API key al guardar, se conserva la
actual. El panel solo muestra una versión enmascarada de la llave guardada.

### Bloqueos

Desde el panel puedes bloquear una fecha completa o una hora concreta, y
activar o desactivar cada bloqueo sin eliminarlo.

La pestaña `Config` sigue disponible como alternativa avanzada.

## Pestaña Config

### HeyGen

| Parámetro | Uso |
|---|---|
| `HEYGEN_API_KEY` | Llave privada de HeyGen |
| `AVATAR_ID` | Avatar del video |
| `VOICE_ID` | Voz del video |
| `GUION` | Texto hablado; admite `{nombre}`, `{apellido}`, `{fecha}`, `{hora}` |

El backend usa HeyGen API V3:

- `POST /v3/videos` para crear el video.
- `GET /v3/videos/{video_id}` para consultar si terminó o falló.

### Correo

| Parámetro | Uso |
|---|---|
| `ASUNTO` | Asunto del mensaje |
| `CUERPO` | Texto anterior al botón del video |
| `REMITENTE` | Nombre que ve la persona |

### Disponibilidad

| Parámetro | Ejemplo | Uso |
|---|---|---|
| `AGENDA_ACTIVA` | `SI` | `NO` bloquea todas las reservas nuevas |
| `HORARIOS_PERMITIDOS` | `09:00,10:00,14:30` | Horas que ofrece el formulario |
| `DIAS_HABILITADOS` | `1,2,3,4,5` | 1=lunes y 7=domingo |
| `ANTICIPACION_HORAS` | `2` | Tiempo mínimo antes de la reunión |
| `DIAS_MAXIMO_ADELANTO` | `60` | Ventana máxima de reservas |
| `FECHAS_PERMITIDAS` | `2026-08-03,2026-08-05` | Si tiene contenido, solo permite esas fechas |
| `INTERVALO_TRIGGER_MINUTOS` | `5` | Frecuencia del proceso automático |
| `FILA_INICIO_PROCESAMIENTO` | `2` | Cursor del modo periódico; avanza automáticamente |
| `PROCESAMIENTO_ACTIVO` | `NO` | Pausa o activa HeyGen y los correos |
| `INICIO_INMEDIATO` | `SI` | `SI` procesa cada nueva fila; `NO` usa el trigger periódico |

Después de editar una celda no es necesario ejecutar `CONFIGURAR` nuevamente,
excepto si cambias manualmente `INTERVALO_TRIGGER_MINUTOS` o `INICIO_INMEDIATO`:
en esos casos ejecuta `CONFIGURAR` para recrear o retirar el trigger. Si haces el
cambio desde el panel, el ajuste del trigger es automático.

## Pestaña Bloqueos

Cada fila representa una excepción.

### Bloquear una fecha completa

| TIPO | FECHA | HORA | MOTIVO | ACTIVO |
|---|---|---|---|---|
| `FECHA` | `2026-08-07` | vacío | Evento interno | `SI` |

### Bloquear una hora específica

| TIPO | FECHA | HORA | MOTIVO | ACTIVO |
|---|---|---|---|---|
| `HORARIO` | `2026-08-10` | `14:30` | Reunión interna | `SI` |

Para conservar una fila sin aplicarla, cambia `ACTIVO` a `NO`.

## Reuniones repetidas

El mismo correo puede aparecer en diferentes fechas u horas. Lo único que se
bloquea globalmente es un espacio ya ocupado: misma fecha y misma hora.

## Orden de los registros

Las filas se ordenan por `Marca temporal` ascendente. El sistema aplica el
mismo orden a reservas del formulario público y respuestas de Google Forms; la
fecha programada de la reunión no cambia la posición del registro.

## Pausar o reactivar

Hay dos alternativas:

- Cambiar `AGENDA_ACTIVA` entre `SI` y `NO`.
- Ejecutar `PAUSAR_AGENDA` o `ACTIVAR_AGENDA` desde Apps Script.

## Recuperar errores

Las filas que agotan sus intentos quedan en estado `ERROR`. Corrige primero la
causa indicada en `Último error` y luego ejecuta `REINTENTAR_ERRORES`.
