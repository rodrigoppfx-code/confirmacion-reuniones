/**
 * AVOVITE — Confirmación de reuniones con video HeyGen
 *
 * Backend ligado al Google Sheet. Ejecuta CONFIGURAR() una sola vez y publica
 * el proyecto como aplicación web. Las credenciales y reglas se administran
 * desde las pestañas Config y Bloqueos; nunca deben guardarse en GitHub.
 */

const APP = Object.freeze({
  CONFIG_SHEET: 'Config',
  BLOCKS_SHEET: 'Bloqueos',
  SOURCE: 'avovite-agenda',
  DEFAULT_RESPONSE_SHEET: 'Respuestas de formulario 1',
  CONTROL_HEADERS: ['Video ID', 'Estado', 'Intentos', 'Último error'],
  STATUS: Object.freeze({
    GENERATING: 'GENERANDO',
    SENT: 'ENVIADO',
    RETRY: 'PENDIENTE_REINTENTO',
    ERROR: 'ERROR'
  })
});

const CONFIG_DEFAULTS = [
  ['HEYGEN_API_KEY', 'PEGA_AQUI_TU_API_KEY', 'Llave privada de HeyGen. Nunca la publiques en GitHub.', 'HEYGEN'],
  ['AVATAR_ID', 'Luca_public', 'Avatar usado para generar los videos.', 'HEYGEN'],
  ['VOICE_ID', '72cbcf091d9d48998ce10d7b5c2d569e', 'Voz usada para generar los videos.', 'HEYGEN'],
  ['GUION', 'Hola, {nombre}. Confirmamos tu reunión para el {fecha}, a las {hora}. Nosotros estamos listos. Esperamos contar con tu presencia. Nos vemos pronto.', 'Variables: {nombre}, {apellido}, {fecha}, {hora}.', 'HEYGEN'],
  ['ASUNTO', '✅ {nombre}, tu reunión está confirmada', 'Asunto del correo. Admite las mismas variables.', 'CORREO'],
  ['CUERPO', 'Hola {nombre}, tu reunión del {fecha} a las {hora} quedó confirmada. Preparamos este video especialmente para ti:', 'Texto que aparece antes del video.', 'CORREO'],
  ['REMITENTE', 'Rodrigo — Avovite', 'Nombre visible del remitente.', 'CORREO'],
  ['HOJA_RESPUESTAS', APP.DEFAULT_RESPONSE_SHEET, 'Pestaña donde se guardan las reuniones.', 'SISTEMA'],
  ['AGENDA_ACTIVA', 'SI', 'SI permite nuevas reservas; NO pausa completamente la agenda.', 'DISPONIBILIDAD'],
  ['HORARIOS_PERMITIDOS', '09:00,10:00,11:00,14:30,15:30,16:30', 'Horas separadas por coma, usando formato HH:mm.', 'DISPONIBILIDAD'],
  ['DIAS_HABILITADOS', '1,2,3,4,5', 'Días ISO: 1=lunes ... 7=domingo.', 'DISPONIBILIDAD'],
  ['ANTICIPACION_HORAS', '2', 'Horas mínimas entre el momento actual y la reunión.', 'DISPONIBILIDAD'],
  ['DIAS_MAXIMO_ADELANTO', '60', 'Máximo de días hacia el futuro que se pueden reservar.', 'DISPONIBILIDAD'],
  ['FECHAS_PERMITIDAS', '', 'Opcional. Lista YYYY-MM-DD; si tiene datos, solo se habilitan esas fechas.', 'DISPONIBILIDAD'],
  ['ZONA_HORARIA', 'America/Bogota', 'Zona horaria usada en fechas y horas.', 'SISTEMA'],
  ['ORIGEN_PUBLICO', 'https://rodrigoppfx-code.github.io', 'Origen autorizado para recibir la respuesta del formulario.', 'SISTEMA'],
  ['MAX_REINTENTOS', '3', 'Intentos máximos para generar o consultar un video.', 'SISTEMA'],
  ['MAX_REGISTROS_POR_EJECUCION', '10', 'Filas máximas procesadas por minuto.', 'SISTEMA']
];

const HEADER_ALIASES = Object.freeze({
  timestamp: ['marca temporal', 'timestamp'],
  email: ['direccion de correo electronico', 'correo electronico', 'correo', 'email'],
  firstName: ['nombre'],
  phone: ['telefono', 'telefono whatsapp', 'whatsapp'],
  date: ['fecha reunion', 'fecha de la reunion', 'fecha'],
  time: ['hora reunion', 'hora de la reunion', 'hora'],
  lastName: ['apellido'],
  videoUrl: ['video url', 'url video'],
  sentAt: ['fecha envio', 'fecha de envio'],
  videoId: ['video id'],
  status: ['estado'],
  attempts: ['intentos'],
  lastError: ['ultimo error']
});

/** Crea/actualiza las pestañas administrativas y el trigger periódico. */
function CONFIGURAR() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  asegurarPestanaConfig_(ss);
  asegurarPestanaBloqueos_(ss);

  const cfg = leerConfig_();
  const hoja = obtenerHojaRespuestas_(ss, cfg);
  const estadoCreado = asegurarColumnasControl_(hoja);
  if (estadoCreado) marcarFilasExistentesComoHistoricas_(hoja);

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'procesarRegistros') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('procesarRegistros').timeBased().everyMinutes(1).create();

  SpreadsheetApp.getUi().alert(
    '✅ Configuración lista.\n\n' +
    '1. Revisa las pestañas Config y Bloqueos.\n' +
    '2. Pega tu API key en Config.\n' +
    '3. Publica el proyecto como Aplicación web.'
  );
}

/** Pausa las nuevas reservas sin afectar las ya registradas. */
function PAUSAR_AGENDA() {
  actualizarConfig_('AGENDA_ACTIVA', 'NO');
  SpreadsheetApp.getUi().alert('⏸️ La agenda quedó pausada.');
}

/** Reactiva las nuevas reservas. */
function ACTIVAR_AGENDA() {
  actualizarConfig_('AGENDA_ACTIVA', 'SI');
  SpreadsheetApp.getUi().alert('▶️ La agenda quedó activa.');
}

/** Devuelve a estado pendiente las filas con ERROR para intentar de nuevo. */
function REINTENTAR_ERRORES() {
  const cfg = leerConfig_();
  const hoja = obtenerHojaRespuestas_(SpreadsheetApp.getActiveSpreadsheet(), cfg);
  const mapa = obtenerMapaColumnas_(hoja);
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return;
  const estados = hoja.getRange(2, mapa.status, lastRow - 1, 1).getDisplayValues();
  estados.forEach(function(row, index) {
    if (String(row[0]).toUpperCase() === APP.STATUS.ERROR) {
      hoja.getRange(index + 2, mapa.status).setValue(APP.STATUS.RETRY);
      hoja.getRange(index + 2, mapa.attempts).setValue(0);
      hoja.getRange(index + 2, mapa.lastError).clearContent();
    }
  });
}

/** API pública de solo lectura para que el formulario consulte disponibilidad. */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const callback = validarCallback_(params.callback);
    const action = String(params.action || 'availability');
    if (action !== 'availability') throw new Error('Acción no disponible.');
    return responderJsonp_(callback, obtenerDisponibilidad_(params.fecha || ''));
  } catch (error) {
    const callback = validarCallback_((e && e.parameter && e.parameter.callback) || 'avoviteCallback');
    return responderJsonp_(callback, { ok: false, message: mensajeError_(error) });
  }
}

/** Recibe una reserva y responde al formulario mediante postMessage. */
function doPost(e) {
  const params = (e && e.parameter) || {};
  const nonce = validarNonce_(params.nonce);
  let cfg = {};
  let result;

  try {
    cfg = leerConfig_();
    if (String(params.empresa || '').trim()) throw new Error('Solicitud no válida.');

    const reserva = validarReserva_(params, cfg);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaRespuestas_(ss, cfg);
      asegurarColumnasControl_(hoja);
      const mapa = obtenerMapaColumnas_(hoja);

      validarEspacioDisponible_(reserva.fecha, reserva.hora, cfg, hoja, mapa);
      guardarReserva_(hoja, mapa, reserva, cfg);
    } finally {
      lock.releaseLock();
    }

    result = {
      source: APP.SOURCE,
      nonce: nonce,
      ok: true,
      message: 'Tu reunión quedó reservada correctamente.'
    };
  } catch (error) {
    result = {
      source: APP.SOURCE,
      nonce: nonce,
      ok: false,
      code: error && error.code ? error.code : 'REQUEST_ERROR',
      message: mensajeError_(error)
    };
  }

  return responderPostMessage_(result, cfg.ORIGEN_PUBLICO || '*');
}

/** Robot: solicita videos, consulta su estado y envía los correos. */
function procesarRegistros() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    const cfg = leerConfig_();
    if (!apiConfigurada_(cfg)) return;

    const hoja = obtenerHojaRespuestas_(SpreadsheetApp.getActiveSpreadsheet(), cfg);
    asegurarColumnasControl_(hoja);
    const mapa = obtenerMapaColumnas_(hoja);
    const lastRow = hoja.getLastRow();
    if (lastRow < 2) return;

    const values = hoja.getRange(2, 1, lastRow - 1, hoja.getLastColumn()).getValues();
    const maxRows = numeroConfig_(cfg.MAX_REGISTROS_POR_EJECUCION, 10, 1, 50);
    let processed = 0;

    for (let index = 0; index < values.length && processed < maxRows; index += 1) {
      const row = values[index];
      const email = valorFila_(row, mapa.email);
      const status = String(valorFila_(row, mapa.status) || '').trim().toUpperCase();
      if (!email || status === APP.STATUS.SENT || status === APP.STATUS.ERROR) continue;
      if (status && status !== APP.STATUS.GENERATING && status !== APP.STATUS.RETRY) continue;

      const rowNumber = index + 2;
      processed += 1;
      try {
        if (!status || status === APP.STATUS.RETRY) {
          const videoId = generarVideoHeyGen_(cfg, row, mapa);
          escribirControl_(hoja, rowNumber, mapa, {
            videoId: videoId,
            status: APP.STATUS.GENERATING,
            attempts: 0,
            lastError: ''
          });
          continue;
        }

        const videoId = String(valorFila_(row, mapa.videoId) || '').trim();
        if (!videoId) throw new Error('La fila está GENERANDO pero no tiene Video ID.');
        const video = consultarEstadoVideo_(cfg, videoId);

        if (video.status === 'completed') {
          if (MailApp.getRemainingDailyQuota() < 1) throw new Error('No queda cuota diaria de correo.');
          enviarCorreo_(cfg, row, mapa, video.video_url, video.thumbnail_url);
          hoja.getRange(rowNumber, mapa.videoUrl).setValue(video.video_url);
          hoja.getRange(rowNumber, mapa.sentAt).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
          escribirControl_(hoja, rowNumber, mapa, { status: APP.STATUS.SENT, lastError: '' });
        } else if (video.status === 'failed') {
          const failedError = new Error(video.error || 'HeyGen informó que la generación falló.');
          failedError.retryGeneration = true;
          hoja.getRange(rowNumber, mapa.videoId).clearContent();
          throw failedError;
        }
      } catch (error) {
        registrarErrorFila_(hoja, rowNumber, mapa, cfg, error, status);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function asegurarPestanaConfig_(ss) {
  let sheet = ss.getSheetByName(APP.CONFIG_SHEET);
  if (!sheet) sheet = ss.insertSheet(APP.CONFIG_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['PARÁMETRO', 'VALOR', 'DESCRIPCIÓN', 'SECCIÓN']]);
  }

  const existing = {};
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function(row) {
      if (row[0]) existing[String(row[0]).trim()] = true;
    });
  }

  const missing = CONFIG_DEFAULTS.filter(function(row) { return !existing[row[0]]; });
  if (missing.length) sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, 4).setValues(missing);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1C4423').setFontColor('#F3E5A5');
  sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 4).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 440);
  sheet.setColumnWidth(3, 520);
  sheet.setColumnWidth(4, 160);

  const yesNoValidation = SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build();
  const agendaCell = buscarCeldaConfig_(sheet, 'AGENDA_ACTIVA');
  if (agendaCell) agendaCell.offset(0, 1).setDataValidation(yesNoValidation);
}

function asegurarPestanaBloqueos_(ss) {
  let sheet = ss.getSheetByName(APP.BLOCKS_SHEET);
  if (!sheet) sheet = ss.insertSheet(APP.BLOCKS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['TIPO', 'FECHA', 'HORA', 'MOTIVO', 'ACTIVO']]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#B05B2C').setFontColor('#FFFFFF');
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 360);
  sheet.setColumnWidth(5, 100);
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['FECHA', 'HORARIO'], true).build()
  );
  sheet.getRange(2, 5, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build()
  );
  sheet.getRange(2, 2, rows, 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(2, 3, rows, 1).setNumberFormat('HH:mm');
}

function asegurarColumnasControl_(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  const normalized = headers.map(normalizar_);
  let nextColumn = headers.length + 1;
  let statusCreated = false;
  APP.CONTROL_HEADERS.forEach(function(header) {
    if (normalized.indexOf(normalizar_(header)) === -1) {
      sheet.getRange(1, nextColumn).setValue(header);
      if (header === 'Estado') statusCreated = true;
      nextColumn += 1;
    }
  });
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  return statusCreated;
}

function marcarFilasExistentesComoHistoricas_(sheet) {
  if (sheet.getLastRow() < 2) return;
  const map = obtenerMapaColumnas_(sheet);
  const range = sheet.getRange(2, map.status, sheet.getLastRow() - 1, 1);
  const values = range.getValues().map(function(row) {
    return [row[0] || 'HISTORICO'];
  });
  range.setValues(values);
}

function leerConfig_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP.CONFIG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Ejecuta CONFIGURAR() antes de usar el sistema.');
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  const cfg = {};
  rows.forEach(function(row) {
    if (row[0]) cfg[String(row[0]).trim()] = String(row[1]).trim();
  });
  return cfg;
}

function actualizarConfig_(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP.CONFIG_SHEET);
  if (!sheet) throw new Error('Ejecuta CONFIGURAR() primero.');
  const cell = buscarCeldaConfig_(sheet, key);
  if (!cell) throw new Error('No existe el parámetro ' + key + '.');
  cell.offset(0, 1).setValue(value);
}

function buscarCeldaConfig_(sheet, key) {
  if (sheet.getLastRow() < 2) return null;
  const finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(key).matchEntireCell(true).findNext();
  return finder || null;
}

function obtenerHojaRespuestas_(ss, cfg) {
  const name = cfg.HOJA_RESPUESTAS || APP.DEFAULT_RESPONSE_SHEET;
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('No existe la pestaña de respuestas: ' + name);
  return sheet;
}

function obtenerMapaColumnas_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  Object.keys(HEADER_ALIASES).forEach(function(key) {
    const aliases = HEADER_ALIASES[key];
    const index = headers.findIndex(function(header) { return aliases.indexOf(normalizar_(header)) !== -1; });
    if (index >= 0) map[key] = index + 1;
  });

  ['timestamp', 'email', 'firstName', 'phone', 'date', 'time', 'lastName', 'videoUrl', 'sentAt', 'videoId', 'status', 'attempts', 'lastError']
    .forEach(function(key) {
      if (!map[key]) throw new Error('Falta una columna requerida en la hoja: ' + key);
    });
  return map;
}

function validarReserva_(params, cfg) {
  if (!esSi_(cfg.AGENDA_ACTIVA)) throw errorCodigo_('AGENDA_PAUSADA', 'La agenda está temporalmente cerrada.');

  const reserva = {
    nombre: limpiarTexto_(params.nombre, 80, 'nombre'),
    apellido: limpiarTexto_(params.apellido, 80, 'apellido'),
    correo: String(params.correo || '').trim().toLowerCase(),
    telefono: limpiarTexto_(params.telefono, 30, 'teléfono'),
    fecha: String(params.fecha || '').trim(),
    hora: normalizarHora_(params.hora)
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reserva.correo)) throw new Error('Escribe un correo electrónico válido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha)) throw new Error('Selecciona una fecha válida.');
  validarEspacioPorReglas_(reserva.fecha, reserva.hora, cfg);
  return reserva;
}

function validarEspacioDisponible_(date, time, cfg, sheet, map) {
  validarEspacioPorReglas_(date, time, cfg);
  const block = obtenerBloqueo_(date, time, cfg.ZONA_HORARIA);
  if (block) throw errorCodigo_('ESPACIO_NO_DISPONIBLE', block);
  if (espacioReservado_(sheet, map, date, time, cfg.ZONA_HORARIA)) {
    throw errorCodigo_('ESPACIO_OCUPADO', 'Ese horario acaba de ser reservado. Elige otro espacio.');
  }
}

function validarEspacioPorReglas_(date, time, cfg) {
  if (!esSi_(cfg.AGENDA_ACTIVA)) throw errorCodigo_('AGENDA_PAUSADA', 'La agenda está temporalmente cerrada.');
  const allowedTimes = lista_(cfg.HORARIOS_PERMITIDOS).map(normalizarHora_);
  if (allowedTimes.indexOf(time) === -1) throw errorCodigo_('HORA_NO_PERMITIDA', 'Ese horario no está habilitado.');

  const parsed = parseDateTime_(date, time);
  const now = new Date();
  const leadHours = numeroConfig_(cfg.ANTICIPACION_HORAS, 2, 0, 720);
  if (parsed.getTime() < now.getTime() + leadHours * 3600000) {
    throw errorCodigo_('FECHA_PASADA', 'Selecciona un horario con mayor anticipación.');
  }

  const maxDays = numeroConfig_(cfg.DIAS_MAXIMO_ADELANTO, 60, 1, 730);
  if (parsed.getTime() > now.getTime() + maxDays * 86400000) {
    throw errorCodigo_('FECHA_FUERA_DE_RANGO', 'La fecha supera el máximo de días permitido.');
  }

  const onlyDates = lista_(cfg.FECHAS_PERMITIDAS);
  if (onlyDates.length && onlyDates.indexOf(date) === -1) {
    throw errorCodigo_('FECHA_NO_PERMITIDA', 'Esa fecha no está habilitada.');
  }

  const isoDay = parsed.getDay() === 0 ? 7 : parsed.getDay();
  const allowedDays = lista_(cfg.DIAS_HABILITADOS).map(Number);
  if (allowedDays.indexOf(isoDay) === -1) throw errorCodigo_('DIA_NO_PERMITIDO', 'Ese día de la semana no está habilitado.');
}

function obtenerDisponibilidad_(date) {
  const cfg = leerConfig_();
  const response = {
    ok: true,
    agendaActiva: esSi_(cfg.AGENDA_ACTIVA),
    horariosPermitidos: lista_(cfg.HORARIOS_PERMITIDOS).map(normalizarHora_),
    diasHabilitados: lista_(cfg.DIAS_HABILITADOS).map(Number),
    fechasPermitidas: lista_(cfg.FECHAS_PERMITIDAS),
    anticipacionHoras: numeroConfig_(cfg.ANTICIPACION_HORAS, 2, 0, 720),
    diasMaximoAdelanto: numeroConfig_(cfg.DIAS_MAXIMO_ADELANTO, 60, 1, 730),
    fecha: date || '',
    horariosDisponibles: []
  };
  if (!date || !response.agendaActiva) return response;

  const sheet = obtenerHojaRespuestas_(SpreadsheetApp.getActiveSpreadsheet(), cfg);
  asegurarColumnasControl_(sheet);
  const map = obtenerMapaColumnas_(sheet);
  response.horariosDisponibles = response.horariosPermitidos.filter(function(time) {
    try {
      validarEspacioDisponible_(date, time, cfg, sheet, map);
      return true;
    } catch (error) {
      return false;
    }
  });
  return response;
}

function obtenerBloqueo_(date, time, timeZone) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP.BLOCKS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return '';
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  for (let i = 0; i < rows.length; i += 1) {
    const type = String(rows[i][0] || '').trim().toUpperCase();
    const active = String(rows[i][4] || 'SI').trim().toUpperCase();
    if (active === 'NO' || !rows[i][1]) continue;
    const blockDate = normalizarFechaValor_(rows[i][1], timeZone);
    const blockTime = rows[i][2] ? normalizarHoraValor_(rows[i][2], timeZone) : '';
    if (blockDate !== date) continue;
    if (type === 'FECHA') return 'La fecha completa está bloqueada.';
    if (type === 'HORARIO' && blockTime === time) return 'Ese horario está bloqueado.';
  }
  return '';
}

function espacioReservado_(sheet, map, date, time, timeZone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const width = Math.max(map.date, map.time);
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return rows.some(function(row) {
    return normalizarFechaValor_(valorFila_(row, map.date), timeZone) === date &&
      normalizarHoraValor_(valorFila_(row, map.time), timeZone) === time;
  });
}

function guardarReserva_(sheet, map, booking, cfg) {
  const rowNumber = sheet.getLastRow() + 1;
  const row = new Array(sheet.getLastColumn()).fill('');
  row[map.timestamp - 1] = new Date();
  row[map.email - 1] = textoSeguroSheet_(booking.correo);
  row[map.firstName - 1] = textoSeguroSheet_(booking.nombre);
  row[map.phone - 1] = textoSeguroSheet_(booking.telefono);
  row[map.date - 1] = parseDateOnly_(booking.fecha);
  row[map.time - 1] = parseTimeOnly_(booking.hora);
  row[map.lastName - 1] = textoSeguroSheet_(booking.apellido);
  row[map.attempts - 1] = 0;
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  sheet.getRange(rowNumber, map.timestamp).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.getRange(rowNumber, map.date).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(rowNumber, map.time).setNumberFormat('HH:mm:ss');
  sheet.getRange(rowNumber, map.phone).setNumberFormat('@');
}

function generarVideoHeyGen_(cfg, row, map) {
  const body = {
    video_inputs: [{
      character: { type: 'avatar', avatar_id: cfg.AVATAR_ID, avatar_style: 'normal' },
      voice: { type: 'text', input_text: conVariables_(cfg.GUION, row, map, cfg), voice_id: cfg.VOICE_ID }
    }],
    dimension: { width: 1280, height: 720 },
    title: 'Confirmación - ' + valorFila_(row, map.firstName) + ' ' + valorFila_(row, map.lastName)
  };
  const json = heygenFetch_('https://api.heygen.com/v2/video/generate', cfg, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body)
  });
  if (!json.data || !json.data.video_id) throw new Error(extraerErrorHeyGen_(json));
  return json.data.video_id;
}

function consultarEstadoVideo_(cfg, videoId) {
  const json = heygenFetch_(
    'https://api.heygen.com/v1/video_status.get?video_id=' + encodeURIComponent(videoId), cfg, {}
  );
  if (!json.data) throw new Error(extraerErrorHeyGen_(json));
  return json.data;
}

function heygenFetch_(url, cfg, options) {
  const request = Object.assign({}, options, {
    headers: Object.assign({}, options.headers || {}, { 'X-Api-Key': cfg.HEYGEN_API_KEY }),
    muteHttpExceptions: true
  });
  const response = UrlFetchApp.fetch(url, request);
  const status = response.getResponseCode();
  const text = response.getContentText();
  let json;
  try { json = JSON.parse(text); } catch (error) { throw new Error('HeyGen devolvió una respuesta no válida (HTTP ' + status + ').'); }
  if (status < 200 || status >= 300) throw new Error('HeyGen HTTP ' + status + ': ' + extraerErrorHeyGen_(json));
  return json;
}

function enviarCorreo_(cfg, row, map, videoUrl, thumbnailUrl) {
  const subject = conVariables_(cfg.ASUNTO, row, map, cfg);
  const body = conVariables_(cfg.CUERPO, row, map, cfg);
  const safeVideoUrl = escapeHtml_(videoUrl);
  const preview = thumbnailUrl
    ? '<a href="' + safeVideoUrl + '" style="display:block;text-decoration:none">' +
      '<img src="' + escapeHtml_(thumbnailUrl) + '" width="520" style="display:block;width:100%;max-width:520px;border-radius:14px" alt="Tu video de confirmación"></a>'
    : '';
  const html = '<div style="margin:0;padding:0;background:#F1F3EC;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F3EC;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td style="background:#1C4423;padding:26px 32px;color:#F3E5A5;font-size:20px;font-weight:bold">Avovite</td></tr>' +
    '<tr><td style="padding:32px"><p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#22301F">' + escapeHtml_(body) + '</p>' + preview +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0"><tr><td style="background:#1C4423;border-radius:10px">' +
    '<a href="' + safeVideoUrl + '" style="display:inline-block;padding:14px 34px;color:#F3E5A5;font-size:15px;font-weight:bold;text-decoration:none">▶ &nbsp;Ver mi video</a>' +
    '</td></tr></table><p style="margin:26px 0 0;font-size:12px;color:#8A9484;text-align:center">El enlace del video estará disponible por 7 días.</p></td></tr>' +
    '<tr><td style="background:#F7F5EC;padding:18px 32px;text-align:center;font-size:12px;color:#5C6B57">' + escapeHtml_(cfg.REMITENTE) + '</td></tr>' +
    '</table></td></tr></table></div>';

  GmailApp.sendEmail(String(valorFila_(row, map.email)), subject, body + '\n\nVideo: ' + videoUrl, {
    htmlBody: html,
    name: cfg.REMITENTE
  });
}

function conVariables_(text, row, map, cfg) {
  return String(text || '')
    .replaceAll('{nombre}', String(valorFila_(row, map.firstName) || ''))
    .replaceAll('{apellido}', String(valorFila_(row, map.lastName) || ''))
    .replaceAll('{fecha}', formatearFechaHumana_(valorFila_(row, map.date), cfg.ZONA_HORARIA))
    .replaceAll('{hora}', formatearHoraHumana_(valorFila_(row, map.time), cfg.ZONA_HORARIA));
}

function registrarErrorFila_(sheet, rowNumber, map, cfg, error, previousStatus) {
  const attemptsCell = sheet.getRange(rowNumber, map.attempts);
  const attempts = Number(attemptsCell.getValue() || 0) + 1;
  const maxAttempts = numeroConfig_(cfg.MAX_REINTENTOS, 3, 1, 10);
  attemptsCell.setValue(attempts);
  sheet.getRange(rowNumber, map.lastError).setValue(mensajeError_(error).slice(0, 500));
  let nextStatus = APP.STATUS.RETRY;
  if (previousStatus === APP.STATUS.GENERATING && !error.retryGeneration) nextStatus = APP.STATUS.GENERATING;
  if (attempts >= maxAttempts) nextStatus = APP.STATUS.ERROR;
  sheet.getRange(rowNumber, map.status).setValue(nextStatus);
}

function escribirControl_(sheet, rowNumber, map, values) {
  Object.keys(values).forEach(function(key) {
    if (map[key]) sheet.getRange(rowNumber, map[key]).setValue(values[key]);
  });
}

function responderJsonp_(callback, payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return ContentService.createTextOutput(callback + '(' + json + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function responderPostMessage_(payload, targetOrigin) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const origin = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(String(targetOrigin || '')) ? targetOrigin : '*';
  const html = '<!doctype html><meta charset="utf-8"><script>' +
    'window.top.postMessage(' + json + ',' + JSON.stringify(origin) + ');' +
    '</script><p>Procesando respuesta…</p>';
  return HtmlService.createHtmlOutput(html);
}

function validarCallback_(callback) {
  const value = String(callback || 'avoviteCallback');
  return /^[A-Za-z_$][0-9A-Za-z_$]{0,60}$/.test(value) ? value : 'avoviteCallback';
}

function validarNonce_(nonce) {
  const value = String(nonce || '');
  return /^[0-9A-Za-z_-]{8,100}$/.test(value) ? value : Utilities.getUuid();
}

function apiConfigurada_(cfg) {
  return Boolean(cfg.HEYGEN_API_KEY && cfg.AVATAR_ID && cfg.VOICE_ID && cfg.HEYGEN_API_KEY.indexOf('PEGA_AQUI') !== 0);
}

function lista_(value) {
  return String(value || '').split(/[\n,;]+/).map(function(item) { return item.trim(); }).filter(Boolean);
}

function esSi_(value) { return ['SI', 'SÍ', 'TRUE', '1'].indexOf(String(value || '').trim().toUpperCase()) !== -1; }

function numeroConfig_(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function limpiarTexto_(value, maxLength, label) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) throw new Error('Completa el campo ' + label + '.');
  if (text.length > maxLength) throw new Error('El campo ' + label + ' es demasiado largo.');
  return text;
}

function textoSeguroSheet_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function normalizar_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function normalizarHora_(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error('Selecciona una hora válida.');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error('Selecciona una hora válida.');
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function parseDateTime_(date, time) {
  const parts = date.split('-').map(Number);
  const clock = time.split(':').map(Number);
  const value = new Date(parts[0], parts[1] - 1, parts[2], clock[0], clock[1], 0, 0);
  if (isNaN(value.getTime()) || value.getFullYear() !== parts[0] || value.getMonth() !== parts[1] - 1 || value.getDate() !== parts[2]) {
    throw new Error('Selecciona una fecha válida.');
  }
  return value;
}

function parseDateOnly_(date) {
  const parts = date.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

function parseTimeOnly_(time) {
  const parts = time.split(':').map(Number);
  return new Date(1899, 11, 30, parts[0], parts[1], 0, 0);
}

function normalizarFechaValor_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, timeZone || 'America/Bogota', 'yyyy-MM-dd');
  const text = String(value || '').trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? text : '';
}

function normalizarHoraValor_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, timeZone || 'America/Bogota', 'HH:mm');
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? String(Number(match[1])).padStart(2, '0') + ':' + match[2] : '';
}

function formatearFechaHumana_(value, timeZone) {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  let date = value;
  if (!(date instanceof Date)) {
    const normalized = normalizarFechaValor_(value, timeZone);
    if (!normalized) return String(value || '');
    date = parseDateOnly_(normalized);
  }
  return date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
}

function formatearHoraHumana_(value, timeZone) {
  const normalized = normalizarHoraValor_(value, timeZone);
  if (!normalized) return String(value || '');
  const parts = normalized.split(':').map(Number);
  const suffix = parts[0] < 12 ? 'de la mañana' : (parts[0] < 18 ? 'de la tarde' : 'de la noche');
  const hour12 = parts[0] % 12 || 12;
  return hour12 + ':' + String(parts[1]).padStart(2, '0') + ' ' + suffix;
}

function valorFila_(row, oneBasedColumn) { return row[oneBasedColumn - 1]; }

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function extraerErrorHeyGen_(json) {
  if (!json) return 'Respuesta vacía.';
  if (json.error && json.error.message) return json.error.message;
  if (json.message) return json.message;
  return JSON.stringify(json).slice(0, 300);
}

function errorCodigo_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mensajeError_(error) {
  return String(error && error.message ? error.message : error || 'Ocurrió un error inesperado.').replace(/^Error:\s*/, '');
}
