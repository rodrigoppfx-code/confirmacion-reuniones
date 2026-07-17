# Administración diaria

Todo lo operativo se controla desde el Google Sheet.

## Pestaña Config

### HeyGen

| Parámetro | Uso |
|---|---|
| `HEYGEN_API_KEY` | Llave privada de HeyGen |
| `AVATAR_ID` | Avatar del video |
| `VOICE_ID` | Voz del video |
| `GUION` | Texto hablado; admite `{nombre}`, `{apellido}`, `{fecha}`, `{hora}` |

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

Después de editar una celda no es necesario ejecutar `CONFIGURAR` nuevamente.

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

## Pausar o reactivar

Hay dos alternativas:

- Cambiar `AGENDA_ACTIVA` entre `SI` y `NO`.
- Ejecutar `PAUSAR_AGENDA` o `ACTIVAR_AGENDA` desde Apps Script.

## Recuperar errores

Las filas que agotan sus intentos quedan en estado `ERROR`. Corrige primero la
causa indicada en `Último error` y luego ejecuta `REINTENTAR_ERRORES`.

