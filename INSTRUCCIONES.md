# Instalación — Avovite

La instalación tiene dos partes. Las credenciales privadas se guardan en el
Google Sheet, nunca en GitHub.

## Parte A — Backend en Apps Script

1. Abre el [Google Sheet](https://docs.google.com/spreadsheets/d/1RH0WjPK0fk7rz_0Bh9LVKhzaksx8g85pSt5moXHJBF0/edit).
2. Entra a **Extensiones → Apps Script**.
3. Reemplaza el contenido del editor con el archivo completo `Code.gs`.
4. Pulsa **+ → HTML**, llámalo `Admin` y pega el contenido de `Admin.html`.
5. Guarda el proyecto como `Avovite Video`.
6. Selecciona la función `CONFIGURAR` y presiona **Ejecutar**.
7. Autoriza los permisos solicitados por Google.
8. Confirma que aparezcan las pestañas `Config` y `Bloqueos`.
9. Recarga el Google Sheet y abre **Avovite → Abrir panel de administración**.
10. Completa la API key desde la pestaña **HeyGen** del panel. No pongas esa
    llave en GitHub.

### Publicar la aplicación web

1. En Apps Script, abre **Implementar → Nueva implementación**.
2. Selecciona **Aplicación web**.
3. Usa estas opciones:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
4. Implementa y copia la URL terminada en `/exec`.

Cuando actualices `Code.gs`, crea una versión nueva de la implementación; la
URL `/exec` puede conservarse.

Si también cambia `Admin.html`, reemplázalo en Apps Script antes de crear la
nueva versión. Ejecuta `CONFIGURAR` una vez cuando una actualización agregue
nuevos parámetros.

## Parte B — Formulario en GitHub Pages

1. Abre `index.html`.
2. En la zona de configuración, reemplaza:

   ```js
   SCRIPT_URL: "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT",
   ```

   por la URL `/exec` de la Parte A.
3. Publica `index.html` y `logo.png` en la rama `main`.
4. En GitHub abre **Settings → Pages**.
5. Selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)`.

URL pública esperada:

`https://rodrigoppfx-code.github.io/confirmacion-reuniones/`

URL actual del backend:

`https://script.google.com/macros/s/AKfycbzedp-82NmbrCDuqiXGN_fm9Va8HVYRPZPwr7QpiPk1lMKXighrm_UakulsrVwHzLWV/exec`

## Comprobación final

1. Abre el formulario público en una ventana privada.
2. Elige una fecha y comprueba que solo muestre horas libres.
3. Haz una reserva de prueba.
4. Intenta reservar la misma fecha y hora: debe impedirlo.
5. Comprueba la fila nueva en `Respuestas de formulario 1`.
6. Revisa que cambie de vacío a `GENERANDO` y luego a `ENVIADO`.
7. Confirma la llegada del correo y el enlace del video.

Para cambios posteriores consulta [docs/ADMINISTRACION.md](docs/ADMINISTRACION.md).
