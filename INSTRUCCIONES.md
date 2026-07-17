# Instalación — Avovite

La instalación tiene dos partes. Las credenciales privadas se guardan en el
Google Sheet, nunca en GitHub.

## Parte A — Backend en Apps Script

1. Abre el [Google Sheet](https://docs.google.com/spreadsheets/d/1RH0WjPK0fk7rz_0Bh9LVKhzaksx8g85pSt5moXHJBF0/edit).
2. Entra a **Extensiones → Apps Script**.
3. Reemplaza el contenido del editor con el archivo completo `Code.gs`.
4. Guarda el proyecto como `Avovite Video`.
5. Selecciona la función `CONFIGURAR` y presiona **Ejecutar**.
6. Autoriza los permisos solicitados por Google.
7. Confirma que aparezcan las pestañas `Config` y `Bloqueos`.
8. En `Config`, completa `HEYGEN_API_KEY`. No pongas esa llave en GitHub.

### Publicar la aplicación web

1. En Apps Script, abre **Implementar → Nueva implementación**.
2. Selecciona **Aplicación web**.
3. Usa estas opciones:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
4. Implementa y copia la URL terminada en `/exec`.

Cuando actualices `Code.gs`, crea una versión nueva de la implementación; la
URL `/exec` puede conservarse.

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

`https://script.google.com/macros/s/AKfycby4OayQ4UqxJv9Utt8pQXimYkqVjo3M8zgJgnnxJhgAo7LppumzAJM53xLv4eYOIgwe/exec`

## Comprobación final

1. Abre el formulario público en una ventana privada.
2. Elige una fecha y comprueba que solo muestre horas libres.
3. Haz una reserva de prueba.
4. Intenta reservar la misma fecha y hora: debe impedirlo.
5. Comprueba la fila nueva en `Respuestas de formulario 1`.
6. Revisa que cambie de vacío a `GENERANDO` y luego a `ENVIADO`.
7. Confirma la llegada del correo y el enlace del video.

Para cambios posteriores consulta [docs/ADMINISTRACION.md](docs/ADMINISTRACION.md).
