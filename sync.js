const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configura las credenciales reales de tu Supabase (.env.local)
const supabase = createClient(
  'https://vzcwkrqymihixarxuiip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6Y3drcnF5bWloaXhhcnh1aWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTcwOTQsImV4cCI6MjA5Nzk3MzA5NH0.NaX_bcWuUHOWKK9opX46TB2PX8k-dc5uzdwKcvlkUM0'
);

const FILE_PATH = './planilla.xlsx'; 

// Función para normalizar texto (quita acentos, pasa a minúsculas y limpia espacios)
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .trim();
}

// Compara nombres de forma flexible (busca intersección de palabras clave)
function sonMismosNombres(nombreA, nombreB) {
  const palabrasA = normalizarTexto(nombreA).split(/\s+/).filter(p => p.length > 2); // Filtra conectores cortos
  const palabrasB = normalizarTexto(nombreB).split(/\s+/).filter(p => p.length > 2);

  if (palabrasA.length === 0 || palabrasB.length === 0) return false;

  // Busca si el nombre más corto es un subconjunto del más largo
  const [masCorto, masLargo] = palabrasA.length < palabrasB.length ? [palabrasA, palabrasB] : [palabrasB, palabrasA];
  
  // Si todas las palabras del nombre más corto están en el nombre largo, ¡es el mismo chofer!
  return masCorto.every(palabra => masLargo.includes(palabra));
}

function parseFechaExcel(valorFecha) {
  if (!valorFecha) return null;
  if (typeof valorFecha === 'number') {
    const fecha = new Date((valorFecha - 25569) * 86400 * 1000);
    return fecha.toISOString();
  }
  const parts = String(valorFecha).split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
  }
  return null;
}

function analizarReferencia(referencia) {
  if (!referencia) return { contenedor_num: null, contenedor_tipo: null, documento_aduanero: null };
  const contenedorRegex = /([A-Z]{4}\d{7})/i;
  const contenedorMatch = referencia.match(contenedorRegex);
  const contenedor_num = contenedorMatch ? contenedorMatch[1].toUpperCase() : null;

  const tipoRegex = /(\d+X\d+\s?[A-Z]*)/i;
  const tipoMatch = referencia.match(tipoRegex);
  const contenedor_tipo = tipoMatch ? tipoMatch[1].toUpperCase() : null;

  const blRegex = /(?:HBL|B\/L|BL):\s?([A-Z0-9]+)/i;
  const blMatch = referencia.match(blRegex);
  const documento_aduanero = blMatch ? blMatch[1] : null;

  return { contenedor_num, contenedor_tipo, documento_aduanero };
}

async function asegurarCliente(nombreCliente) {
  const { data: clienteExistente, error: errorBusqueda } = await supabase
    .from('clientes')
    .select('"Razon Social"')
    .eq('Razon Social', nombreCliente)
    .maybeSingle();

  if (errorBusqueda) {
    console.error(`Error buscando cliente "${nombreCliente}":`, errorBusqueda.message);
    return false;
  }

  if (clienteExistente) {
    return true;
  }

  console.log(`➕ Registrando nuevo cliente: "${nombreCliente}"`);
  const { error: errorInsercion } = await supabase
    .from('clientes')
    .insert([{ 'Razon Social': nombreCliente }]);

  if (errorInsercion) {
    console.error(`❌ Error al crear el cliente "${nombreCliente}":`, errorInsercion.message);
    return false;
  }

  return true;
}

let listaChoferesBD = [];

async function cargarChoferesDesdeBD() {
  const { data, error } = await supabase
    .from('choferes')
    .select('CHOFER');
  
  if (error) {
    console.error('Error cargando lista inicial de choferes:', error.message);
    return;
  }
  listaChoferesBD = data.map(c => c.CHOFER);
}

// Asegura el chofer buscando coincidencias parciales inteligentes
async function asegurarChoferYObtenerNombreReal(nombreChoferExcel) {
  const choferNormalizadoExcel = normalizarTexto(nombreChoferExcel);
  if (!choferNormalizadoExcel || choferNormalizadoExcel === '') {
    nombreChoferExcel = "CHOFER CONTRATADO";
  }

  // 1. Buscar coincidencia flexible por palabras clave (ej: "NANTES IGNACIO CUELLO" <-> "CUELLO NANTES IGNACIO ATAHUALPA")
  const choferEncontrado = listaChoferesBD.find(choferBD => sonMismosNombres(choferBD, nombreChoferExcel));

  if (choferEncontrado) {
    return choferEncontrado; 
  }

  // 2. Si es chofer nuevo real y no se encuentra en la base de datos, lo registramos
  let docIdFicticio = nombreChoferExcel === "CHOFER CONTRATADO" 
    ? "99999999" 
    : String(Math.floor(10000000 + Math.random() * 90000000));

  console.log(`➕ Registrando nuevo chofer: "${nombreChoferExcel}" (Doc ID: ${docIdFicticio})`);
  
  const { error: errorInsercion } = await supabase
    .from('choferes')
    .insert([{ 
      'CHOFER': nombreChoferExcel,
      'DOC. ID.': docIdFicticio
    }]);

  if (errorInsercion) {
    console.error(`❌ Error al crear el chofer "${nombreChoferExcel}":`, errorInsercion.message);
    return null;
  }

  listaChoferesBD.push(nombreChoferExcel);
  return nombreChoferExcel;
}

async function sincronizar() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      console.error(`Error: No se encontró el archivo Excel en "${FILE_PATH}".`);
      return;
    }

    console.log('Cargando choferes existentes desde Supabase...');
    await cargarChoferesDesdeBD();

    console.log('Leyendo archivo Excel...');
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const datos = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 2 });
    
    if (datos.length === 0) {
      console.log('El archivo está vacío.');
      return;
    }

    const filas = datos.slice(1);
    console.log(`Sincronizando ${filas.length} operaciones encontradas...`);

    for (const fila of filas) {
      const numero_fn = fila[0] ? String(fila[0]).trim() : null; 
      
      if (!numero_fn || !numero_fn.includes('-FN-')) {
        continue; 
      }

      let cliente = fila[2] ? String(fila[2]).trim() : "A"; 
      let choferExcel = fila[4] ? String(fila[4]).trim() : "";

      const referencia = fila[3] ? String(fila[3]).trim() : ''; 
      const fecha = parseFechaExcel(fila[5]); 
      const origen = fila[6] ? String(fila[6]).trim() : null; 
      const destino = fila[9] ? String(fila[9]).trim() : null; 
      const unidad = fila[10] ? String(fila[10]).trim() : null; 

      const { contenedor_num, contenedor_tipo, documento_aduanero } = analizarReferencia(referencia);

      let tipo_operacion = 'importacion'; 
      if (referencia.toLowerCase().includes('exportacion') || referencia.toLowerCase().includes('rt bue')) {
        tipo_operacion = 'exportacion';
      } else if (referencia.toLowerCase().includes('carga suelta') || referencia.toLowerCase().includes('bulto')) {
        tipo_operacion = 'carga_suelta';
      }

      const clienteAsegurado = await asegurarCliente(cliente);
      if (!clienteAsegurado) {
        console.error(`⏭️ Saltando flete ${numero_fn} por error de cliente.`);
        continue;
      }

      const choferReal = await asegurarChoferYObtenerNombreReal(choferExcel);
      if (!choferReal) {
        console.error(`⏭️ Saltando flete ${numero_fn} por error de chofer.`);
        continue;
      }

      const datosFlete = {
        numero_fn,
        cliente, 
        chofer: choferReal, 
        fecha_hora: fecha,
        origen,
        destino,
        contenedor_num,
        contenedor_tipo,
        documento_aduanero,
        tipo_operacion,
        patente_camion: unidad,
        notas_adicionales: referencia 
      };

      const { error } = await supabase
        .from('fletes_nacionales')
        .upsert(datosFlete, { onConflict: 'numero_fn' });

      if (error) {
        console.error(`❌ Error en ${numero_fn}:`, error.message);
      } else {
        console.log(`✅ Sincronizado: ${numero_fn} (${datosFlete.chofer})`);
      }
    }

    console.log('🎉 Sincronización finalizada con éxito.');

  } catch (err) {
    console.error('Error general en la sincronización:', err);
  }
}

sincronizar();