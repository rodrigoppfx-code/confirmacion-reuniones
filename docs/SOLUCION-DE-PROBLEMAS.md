# Solución de problemas

## La URL del backend muestra texto o JSON

La URL `/exec` es un servicio técnico para el formulario, no el panel de
administración. En la versión actual, abrirla sin parámetros muestra una página
informativa. Para administrar el sistema abre el Google Sheet y usa
**Avovite → Abrir panel de administración**.

## No aparece el menú Avovite

Recarga el Google Sheet después de instalar el código. Si todavía no aparece,
ejecuta `CONFIGURAR` desde Apps Script, vuelve a la hoja y recárgala.

## El panel no abre o aparece vacío

Comprueba que el proyecto de Apps Script contenga un archivo HTML llamado
exactamente `Admin` con el contenido de `Admin.html`.

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

1. Confirma en el panel que **Generar videos** esté activado.
2. Confirma que `HEYGEN_API_KEY`, `AVATAR_ID` y `VOICE_ID` tengan valores válidos.
3. Revisa las columnas `Estado`, `Intentos` y `Último error`.
4. Abre **Apps Script → Ejecuciones** para consultar el error completo.
5. Corrige el problema y ejecuta `REINTENTAR_ERRORES`.

## El formulario dijo que no recibió confirmación, pero la fila existe

La reserva sí llegó y la respuesta visual se perdió o tardó más de lo esperado.
La versión actual consulta el estado de esa misma solicitud antes de mostrar un
error, por lo que no debería pedir un segundo envío cuando el registro ya existe.

## Dice que no puede configurar el formato de una columna de texto

La pestaña de respuestas está convertida en una tabla tipada de Google Sheets.
El sistema no aplica formatos numéricos por fila: deja que la tabla controle la
presentación de marca temporal, fecha, hora y teléfono. Así la reserva puede
continuar inmediatamente hacia HeyGen después de guardarse.

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
