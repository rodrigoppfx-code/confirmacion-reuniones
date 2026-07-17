# Solución de problemas

## El formulario dice que sigue en configuración

La `SCRIPT_URL` de `index.html` todavía es un marcador o no termina en `/exec`.
Actualízala y vuelve a publicar GitHub Pages.

## No aparecen horarios

Revisa en `Config`:

- `AGENDA_ACTIVA` debe ser `SI`.
- La fecha debe pertenecer a `DIAS_HABILITADOS`.
- Debe estar dentro de `DIAS_MAXIMO_ADELANTO`.
- Debe respetar `ANTICIPACION_HORAS`.
- Si `FECHAS_PERMITIDAS` tiene contenido, la fecha debe estar en esa lista.

También revisa `Bloqueos` y las reservas existentes.

## La reserva entra, pero no genera video

1. Confirma que `HEYGEN_API_KEY`, `AVATAR_ID` y `VOICE_ID` tengan valores válidos.
2. Revisa las columnas `Estado`, `Intentos` y `Último error`.
3. Abre **Apps Script → Ejecuciones** para consultar el error completo.
4. Corrige el problema y ejecuta `REINTENTAR_ERRORES`.

## La fila se queda en GENERANDO

HeyGen todavía puede estar procesando. Si se prolonga demasiado, revisa el
`Video ID` en HeyGen y las ejecuciones de Apps Script.

## No llega el correo

- Revisa spam y promociones.
- Confirma que el correo de la fila sea correcto.
- Comprueba la cuota diaria de Gmail.
- Revisa `Último error` y las ejecuciones del script.

## Cambié Code.gs y no se refleja

Guarda el proyecto y actualiza la implementación de la aplicación web a una
versión nueva. No uses la URL de prueba terminada en `/dev`.

## El horario se ocupó mientras se enviaba

Es el comportamiento correcto. El servidor vuelve a comprobar el espacio al
confirmar y pide elegir otra hora si alguien lo tomó unos segundos antes.
