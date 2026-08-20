'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import * as XLSX from 'xlsx'

// Funciones auxiliares para búsqueda aproximada y resaltado
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= bn; i++) matrix[i][0] = i;
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

function obtenerPuntajeSimilitud(valor: any, query: string): number {
  if (!valor) return 0;
  const strVal = String(valor).toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  if (strVal === q) return 1000;

  let baseScore = 0;
  if (strVal.startsWith(q)) baseScore = 500;
  else if (strVal.includes(q)) baseScore = 200;

  const palabrasQuery = q.split(/\s+/);
  const tokensVal = strVal.split(/[\s-_]+/);

  let tokenScoreTotal = 0;
  let coincidenciaLaxa = false;

  palabrasQuery.forEach(pq => {
    if (pq.length === 0) return;
    let bestTokenScore = 0;
    
    tokensVal.forEach(token => {
      if (token === pq) {
        bestTokenScore = Math.max(bestTokenScore, 100);
      } else if (token.startsWith(pq)) {
        bestTokenScore = Math.max(bestTokenScore, 80);
      } else if (token.includes(pq) || pq.includes(token)) {
        bestTokenScore = Math.max(bestTokenScore, 50);
      } else {
        const maxDist = pq.length <= 4 ? 1 : 2;
        if (Math.abs(token.length - pq.length) <= maxDist) {
          const dist = levenshtein(token, pq);
          if (dist <= maxDist) {
            bestTokenScore = Math.max(bestTokenScore, 30 - (dist * 10));
          }
        }
      }
    });
    
    if (bestTokenScore > 0) {
      coincidenciaLaxa = true;
      tokenScoreTotal += bestTokenScore;
    }
  });

  if (coincidenciaLaxa || baseScore > 0) {
    return Math.max(baseScore, tokenScoreTotal);
  }
  
  return 0;
}

function highlightMatch(text: any, query: string): React.ReactNode {
  if (!text) return '-';
  const strText = String(text);
  const q = query.trim().toLowerCase();
  if (!q) return strText;

  const lowerText = strText.toLowerCase();
  let index = lowerText.indexOf(q);
  if (index !== -1) {
    const before = strText.substring(0, index);
    const match = strText.substring(index, index + q.length);
    const after = strText.substring(index + q.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-amber-500/40 text-gray-900 dark:text-amber-200 rounded px-0.5">{match}</mark>
        {highlightMatch(after, q)}
      </>
    );
  }

  const palabrasQuery = q.split(/\s+/).filter(p => p.length > 0);
  if (palabrasQuery.length === 0) return strText;

  const parts = strText.split(/([\s-_]+)/);
  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    const isMatched = palabrasQuery.some(pq => {
      if (lowerPart.includes(pq) || pq.includes(lowerPart)) return true;
      if (lowerPart.length >= 2 && pq.length >= 2) {
        const maxDist = pq.length <= 4 ? 1 : 2;
        return Math.abs(lowerPart.length - pq.length) <= maxDist && levenshtein(lowerPart, pq) <= maxDist;
      }
      return false;
    });

    if (isMatched && part.trim().length > 0) {
      return <mark key={i} className="bg-yellow-200 dark:bg-amber-500/40 text-gray-900 dark:text-amber-200 rounded px-0.5">{part}</mark>;
    }
    return part;
  });
}

export default function Page() {
  const [fletes, setFletes] = useState<any[]>([])
  const [criterioOrden, setCriterioOrden] = useState<'fecha_asc' | 'fecha_desc' | 'operacion_asc' | 'operacion_desc'>('fecha_asc')
  const [busqueda, setBusqueda] = useState('')
  
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false)
  const [modoExportar, setModoExportar] = useState<'ninguno' | 'rango'>('ninguno')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const [opAEliminar, setOpAEliminar] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const cached = localStorage.getItem('fletes_cache')
    if (cached) {
      try { 
        const parsed = JSON.parse(cached)
        if (parsed.length > 0) setFletes(parsed)
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMostrarMenuExportar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatearFechaCortas = (fechaStr: string) => {
    if (!fechaStr) return '';
    const soloFecha = fechaStr.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}`;
    }
    return fechaStr;
  }

  const ejecutarExportacion = (datosAExportar: any[], nombreArchivo: string) => {
    if (!datosAExportar || datosAExportar.length === 0) {
      alert("No hay datos para exportar con los criterios seleccionados.")
      return
    }

    const datosLimpios = datosAExportar.map(f => {
      const valorTram = String(f.tram || f.trm || '').trim().toUpperCase();
      const esTram = valorTram === 'SI';
      const fechaHoraVal = f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga;
      return {
        "Operación": f.numero_fn || '',
        "Cliente": f.cliente || '',
        "Tipo Operación": esTram ? 'TRÁNSITO' : (f.tipo_operacion || ''),
        "Fecha y Hora": fechaHoraVal ? new Date(fechaHoraVal).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        "Chofer": f.chofer || '',
        "Camión": f.patente_camion || '',
        "Semi": f.patente_semi || '',
        "Bulto": f.tipo_operacion === 'carga_suelta' 
          ? `${f.cantidad_bultos || ''} ${f.peso_bruto ? `(${f.peso_bruto})` : ''}`.trim() 
          : (f.contenedor_num ? `${f.contenedor_num} (${f.contenedor_tipo || ''})` : ''),
        "Estado": f.estado || 'EN PREPARACIÓN',
        "Comentarios": f.notas_adicionales || f.notes_adicionales || ''
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(datosLimpios)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operaciones")
    XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`)
    setMostrarMenuExportar(false)
    setModoExportar('ninguno')
  }

  const exportarVisibles = () => {
    ejecutarExportacion(fletesOrdenadosFinal, "Operaciones_En_Curso_Visibles")
  }

  const exportarPorRangoFechas = async () => {
    if (!fechaDesde || !fechaHasta) {
      alert("Por favor selecciona ambas fechas.")
      return
    }

    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .neq('estado', 'TERMINADO')
      .gte('fecha_hora', fechaDesde)
      .lte('fecha_hora', fechaHasta + 'T23:59:59')

    if (error) {
      alert("Error al obtener los datos para el rango.")
      return
    }

    ejecutarExportacion(data || [], `Operaciones_En_Curso_${fechaDesde}_al_${fechaHasta}`)
  }

  const generarPDF = async (flete: any) => {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()

    let dniChofer = 'No informado'

    if (flete.dni_chofer) {
      dniChofer = flete.dni_chofer
    } else if (flete.chofer) {
      const { data: choferData } = await supabase
        .from('choferes')
        .select('"DOC. ID."')
        .eq('CHOFER', flete.chofer)
        .maybeSingle()
      
      if (choferData && choferData['DOC. ID.']) {
        dniChofer = choferData['DOC. ID.']
      }
    }

    doc.addImage("/membrete GM CARGO.jpg", "JPG", -10, 0, 230, 297)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.text("ORDEN DE CARGA", 20, 40)
    doc.setFontSize(12)
    doc.text(`${flete.numero_fn || ''}`, 160, 40)
    doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 160, 45)

    const drawBox = (title: string, data: string[], x: number, y: number, w: number, maxWidth: number) => {
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(250, 250, 250)
      let allLines: string[] = []
      data.forEach(line => { allLines = allLines.concat(doc.splitTextToSize(line, maxWidth)) })
      const h = (allLines.length * 8) + 18
      doc.rect(x, y, w, h, 'FD')
      doc.setTextColor(26, 68, 143)
      doc.setFont("helvetica", "bold")
      doc.text(title, x + 5, y + 7)
      doc.line(x, y + 10, x + w, y + 10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      allLines.forEach((line, i) => { doc.text(line, x + 5, y + 18 + (i * 8)) })
      return h 
    }

    const startY = 60
    const valorTramPDF = String(flete.tram || flete.trm || 'NO').trim().toUpperCase();

    const tipoOperacionTexto = flete.tipo_operacion === 'importacion'
      ? `IMPORTACION (TRAM: ${valorTramPDF})`
      : (flete.tipo_operacion?.toUpperCase() || ' ');

    const datosGenerales = [
      `Cliente: ${flete.cliente || ' '}`,
      `Tipo Operación: ${tipoOperacionTexto}`,
      `Documento Aduanero: ${flete.documento_aduanero || ' '}`
    ]

    let datosEspecificos: string[] = []
    if (flete.tipo_operacion === 'importacion') {
      datosEspecificos = [
        `Contenedor: ${flete.contenedor_num || ' '} (${flete.contenedor_tipo || ' '})`,
        `Origen: ${flete.origen || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Paradas: ${flete.paradas || 'Ninguna'}`,
        `Destino: ${flete.destino || ' '}`,
        `Devolución: ${flete.lugar_devolucion || ' '}`,
        `Libre hasta: ${flete.libre_hasta || ' '}`
      ]
    } else if (flete.tipo_operacion === 'exportacion') {
      datosEspecificos = [
        `Lugar Carga Vacío: ${flete.lugar_carga_vacio || ' '}`,
        `Fecha y Hora: ${flete.fecha_carga_vacio ? new Date(flete.fecha_carga_vacio).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Lugar Carga Mercadería: ${flete.lugar_carga_mercaderia || ' '}`,
        `Lugar Entrega Lleno: ${flete.lugar_entrega_lleno || ' '}`
      ]
    } else if (flete.tipo_operacion === 'carga_suelta') {
      datosEspecificos = [
        `Lugar Carga: ${flete.lugar_carga || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora_carga ? new Date(flete.fecha_hora_carga).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Lugar Entrega: ${flete.lugar_entrega || ' '}`,
        `Cantidad Bultos: ${flete.cantidad_bultos || ' '}`,
        `Peso Bruto: ${flete.peso_bruto || ' '}`
      ]
    }

    const hGen = drawBox("DETALLES DE LA OPERACION", [...datosGenerales, ...datosEspecificos], 15, startY, 85, 75)
    
    const hEquipo = drawBox("DATOS DEL EQUIPO", [
      `Chofer: ${flete.chofer || ' '}`,
      `DNI: ${dniChofer}`, 
      `Teléfono: ${flete.telefono_chofer || 'No informado'}`, 
      `Patente Camión: ${flete.patente_camion || ' '}`,
      `Patente Semi: ${flete.patente_semi || ' '}`
    ], 115, startY, 80, 70)

    drawBox("INSTRUCCIONES Y NOTAS", [flete.notas_adicionales || flete.notes_adicionales || 'Sin notas adicionales.'], 15, startY + Math.max(hGen, hEquipo) + 10, 180, 170)

    doc.save(`Orden Carga ${flete.numero_fn}.pdf`)
  }

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'EN PREPARACIÓN': 
      case null: 
      case undefined: 
      case '': 
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50';
      case 'EN CURSO': 
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50';
      case 'TERMINADO': 
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/50';
      default: 
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50';
    }
  };

  const getColorFondoRenglon = (estado: string) => {
    switch (estado) {
      case 'EN PREPARACIÓN': 
      case null: 
      case undefined: 
      case '': 
        return 'bg-blue-50/60 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-900/30';
      case 'EN CURSO': 
        return 'bg-red-50/60 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-900/30';
      case 'TERMINADO': 
        return 'bg-green-50/60 hover:bg-green-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30';
      default: 
        return 'bg-blue-50/60 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-900/30';
    }
  };

  async function getFletes() {
    const sortBy = criterioOrden.startsWith('fecha') ? 'fecha_hora' : 'numero_fn';
    const sortAsc = criterioOrden === 'fecha_asc' || criterioOrden === 'operacion_asc';

    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .neq('estado', 'TERMINADO') 
      .order(sortBy, { ascending: sortAsc })
      
    if (!error && data) {
      setFletes(data)
      localStorage.setItem('fletes_cache', JSON.stringify(data))
    }
  }

  useEffect(() => { getFletes() }, [criterioOrden])

  async function confirmarEliminarFlete() {
    if (opAEliminar) {
      await supabase.from('fletes_nacionales').delete().eq('numero_fn', opAEliminar)
      const nuevosFletes = fletes.filter((f: any) => f.numero_fn !== opAEliminar)
      setFletes(nuevosFletes)
      localStorage.setItem('fletes_cache', JSON.stringify(nuevosFletes))
      setOpAEliminar(null)
    }
  }

  const queryBusqueda = busqueda.trim().toLowerCase();
  
  const fletesConPuntaje = fletes.map(f => {
    if (!queryBusqueda) return { ...f, _searchScore: 1 };
    
    let maxScore = 0;
    Object.values(f).forEach(valor => {
      const score = obtenerPuntajeSimilitud(valor, queryBusqueda);
      if (score > maxScore) maxScore = score;
    });
    
    return { ...f, _searchScore: maxScore };
  });

  const fletesFiltrados = queryBusqueda 
    ? fletesConPuntaje.filter(f => f._searchScore > 0)
    : fletesConPuntaje;

  const getEstadoPeso = (estado: string) => {
    const est = (estado || 'EN PREPARACIÓN').toUpperCase();
    return est === 'EN CURSO' ? 0 : 1;
  };

  const getFechaTimestamp = (f: any) => {
    const fechaStr = f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga;
    if (!fechaStr) return 0;
    const time = new Date(fechaStr).getTime();
    return isNaN(time) ? 0 : time;
  };

  const fletesOrdenadosFinal = [...fletesFiltrados].sort((a, b) => {
    if (queryBusqueda) {
      if (a._searchScore !== b._searchScore) {
        return b._searchScore - a._searchScore;
      }
    }

    if (criterioOrden === 'operacion_asc' || criterioOrden === 'operacion_desc') {
      const opA = String(a.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const opB = String(b.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const comparacion = opA.localeCompare(opB, undefined, { numeric: true, sensitivity: 'base' });
      return criterioOrden === 'operacion_asc' ? comparacion : -comparacion;
    }

    const pesoA = getEstadoPeso(a.estado);
    const pesoB = getEstadoPeso(b.estado);
    if (pesoA !== pesoB) {
      return pesoA - pesoB;
    }

    const fechaA = getFechaTimestamp(a);
    const fechaB = getFechaTimestamp(b);

    if (criterioOrden === 'fecha_asc') {
      return fechaA - fechaB;
    } else {
      return fechaB - fechaA;
    }
  });

  return (
    <div className="p-4 md:p-8 min-w-full w-fit min-h-screen bg-gray-50/50 dark:bg-[#0b1329] transition-colors duration-200">
      {/* Header y Filtros */}
      <div className="bg-white dark:bg-[#111c38] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky left-0 max-w-[100vw] transition-colors duration-200">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Operaciones en Curso</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-0.5">Listado de fletes activos en preparación o tránsito.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Campo Búsqueda */}
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-slate-500 text-sm">
              🔍
            </span>
            <input 
              type="text" 
              placeholder="Buscar operación, chofer, cliente..." 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500" 
              onChange={(e) => setBusqueda(e.target.value)} 
            />
          </div>
          
          {/* Selector de Orden */}
          <select 
            value={criterioOrden} 
            onChange={(e) => setCriterioOrden(e.target.value as any)}
            className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700/80 text-gray-700 dark:text-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 dark:hover:border-slate-600 transition shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-auto shrink-0"
          >
            <option value="fecha_asc" className="dark:bg-[#111c38]">📅 Más Próximos</option>
            <option value="fecha_desc" className="dark:bg-[#111c38]">📅 Más Lejanos</option>
            <option value="operacion_asc" className="dark:bg-[#111c38]">🔤 Operación: A - Z</option>
            <option value="operacion_desc" className="dark:bg-[#111c38]">🔤 Operación: Z - A</option>
          </select>

          {/* Menú Exportar */}
          <div className="relative w-full sm:w-auto" ref={menuRef}>
            <button 
              onClick={() => {
                setMostrarMenuExportar(!mostrarMenuExportar)
                setModoExportar('ninguno')
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shrink-0"
            >
              <span>📊</span> Exportar <span className="text-xs opacity-80">▾</span>
            </button>

            {mostrarMenuExportar && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#111c38] border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-20 p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="font-bold text-gray-800 dark:text-slate-100 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <span>📥</span> Opciones de Exportación
                </p>
                
                {modoExportar === 'ninguno' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={exportarVisibles}
                      className="text-left w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-gray-700 dark:text-slate-200 font-medium transition flex items-center justify-between"
                    >
                      <span>Exportar visibles</span>
                      <span className="text-xs bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{fletesOrdenadosFinal.length}</span>
                    </button>
                    <button 
                      onClick={() => setModoExportar('rango')}
                      className="text-left w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-gray-700 dark:text-slate-200 font-medium transition flex items-center gap-2"
                    >
                      <span>📅 Por rango de fechas</span>
                    </button>
                  </div>
                )}

                {modoExportar === 'rango' && (
                  <div className="flex flex-col gap-2.5 mt-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Desde:</label>
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border border-gray-200 dark:border-slate-700 p-2 rounded-xl text-xs bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Hasta:</label>
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border border-gray-200 dark:border-slate-700 p-2 rounded-xl text-xs bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    
                    <div className="flex gap-2 mt-2">
                      <button onClick={exportarPorRangoFechas} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition w-full shadow-sm">Descargar</button>
                      <button onClick={() => setModoExportar('ninguno')} className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition">Volver</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabla de Operaciones */}
      <div className="min-w-full w-fit bg-white dark:bg-[#111c38] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
        <table className="w-full text-left border-collapse table-auto min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0b1329]/60 text-xs md:text-sm text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
              <th className="p-3 md:p-4 font-bold align-middle">Op.</th>
              <th className="p-3 md:p-4 font-bold align-middle">Cliente</th>
              <th className="p-3 md:p-4 font-bold align-middle">Tipo</th>
              <th className="p-3 md:p-4 font-bold align-middle min-w-[100px]">Fecha y Hora</th>
              <th className="p-3 md:p-4 font-bold align-middle">Chofer / Equipo</th>
              <th className="p-3 md:p-4 font-bold align-middle min-w-[120px]">Bulto</th>
              <th className="p-3 md:p-4 font-bold align-middle min-w-[120px]">Comentarios</th>
              <th className="p-3 md:p-4 font-bold align-middle">Estado</th>
              <th className="p-3 md:p-4 font-bold align-middle">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {fletesOrdenadosFinal.map((f: any) => {
              const fechaMostrar = f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga;
              const estadoActual = f.estado || 'EN PREPARACIÓN';
              
              const valorTram = String(f.tram || f.trm || '').trim().toUpperCase();
              const esTram = valorTram === 'SI';
              const tipoMostrar = esTram ? 'TRÁNSITO' : (f.tipo_operacion || '-');

              const tipoOpLower = String(f.tipo_operacion || '').trim().toLowerCase();
              const llevaInfoDevolucion = !esTram && (tipoOpLower === 'exportacion' || tipoOpLower === 'carga_suelta');

              const devolucionVacia = !f.lugar_devolucion || f.lugar_devolucion.trim() === '';
              const libreHastaVacio = !f.libre_hasta || f.libre_hasta.trim() === '';
              const faltanCamposDevolucion = devolucionVacia || libreHastaVacio;

              const renglonColor = getColorFondoRenglon(estadoActual);
              
              const textoComentarioCompleto = f.notas_adicionales || f.notes_adicionales || '';
              const textoComentarioCorto = textoComentarioCompleto.length > 25 
                ? textoComentarioCompleto.substring(0, 25) + '...' 
                : (textoComentarioCompleto || '-');

              return (
                <tr key={f.numero_fn} className={`border-t border-gray-100 dark:border-slate-800/60 transition text-xs md:text-sm ${renglonColor}`}>
                  <td className="p-3 md:p-4 font-semibold text-gray-900 dark:text-slate-100 break-words whitespace-normal align-middle">{highlightMatch(f.numero_fn, busqueda)}</td>
                  <td className="p-3 md:p-4 text-gray-700 dark:text-slate-300 break-words whitespace-normal align-middle">{highlightMatch(f.cliente || '-', busqueda)}</td>
                  <td className="p-3 md:p-4 font-bold uppercase text-gray-500 dark:text-slate-400 text-[10px] md:text-xs break-words whitespace-normal align-middle">{highlightMatch(tipoMostrar, busqueda)}</td>
                  <td className="p-3 md:p-4 text-gray-700 dark:text-slate-300 break-words whitespace-normal align-middle">{fechaMostrar ? new Date(fechaMostrar).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                  <td className="p-3 md:p-4 text-gray-700 dark:text-slate-300 break-words whitespace-normal align-middle">
                    <div className="font-medium text-gray-900 dark:text-slate-200">{highlightMatch(f.chofer || '-', busqueda)}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-400 font-normal leading-tight mt-1">
                      {highlightMatch(
                        f.patente_semi && f.patente_semi !== '-'
                          ? `Camión: ${f.patente_camion || '-'} Semi: ${f.patente_semi}`
                          : `Camión: ${f.patente_camion || '-'}`,
                        busqueda
                      )}
                    </div>
                  </td>
                  <td className="p-3 md:p-4 text-gray-700 dark:text-slate-300 break-words whitespace-normal align-middle">
                    {f.tipo_operacion === 'carga_suelta' ? (
                      <div>{highlightMatch(`${f.cantidad_bultos || ''} ${f.peso_bruto ? `(${f.peso_bruto})` : ''}`.trim(), busqueda)}</div>
                    ) : (
                      <>
                        <div>{highlightMatch(`${f.contenedor_num || ''} ${f.contenedor_tipo ? `(${f.contenedor_tipo})` : ''}`.trim(), busqueda)}</div>
                        {!llevaInfoDevolucion && (
                          <>
                            {faltanCamposDevolucion ? (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 text-[9px] font-medium leading-tight">
                                <span>⚠️ Falta dev. / libre</span>
                              </div>
                            ) : (
                              <div className="mt-0.5 text-[10px] text-gray-500 dark:text-slate-400 leading-tight break-words whitespace-normal">
                                {highlightMatch(`Dev: ${f.lugar_devolucion} | Libre: ${formatearFechaCortas(f.libre_hasta)}`, busqueda)}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </td>
                  <td className="p-3 md:p-4 relative break-words whitespace-normal align-middle">
                    {textoComentarioCompleto ? (
                      <details className="cursor-pointer group">
                        <summary className="list-none text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium block select-none break-words">
                          {highlightMatch(textoComentarioCorto, busqueda)}
                        </summary>
                        <div className="absolute right-0 md:left-0 z-20 p-4 mt-2 bg-white dark:bg-[#111c38] border dark:border-slate-700 rounded-lg shadow-xl w-64 text-sm text-gray-800 dark:text-slate-200 break-words whitespace-pre-wrap">
                          {highlightMatch(textoComentarioCompleto, busqueda)}
                        </div>
                      </details>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-600">-</span>
                    )}
                  </td>
                  <td className="p-3 md:p-4 align-middle">
                    <select 
                      className={`px-2.5 py-1.5 rounded-full text-[10px] md:text-xs font-bold border cursor-pointer w-full shadow-sm transition ${getEstadoStyle(f.estado)}`} 
                      value={estadoActual} 
                      onChange={async (e) => { 
                        const nuevoEstado = e.target.value; 
                        
                        const datosActualizacion: any = { estado: nuevoEstado };
                        if (nuevoEstado === 'TERMINADO') {
                          datosActualizacion.fecha_terminado = new Date().toISOString();
                        }

                        await supabase.from('fletes_nacionales').update(datosActualizacion).eq('numero_fn', f.numero_fn);
                        
                        if (nuevoEstado === 'TERMINADO') {
                          const facturarStr = String(f.facturar || '').trim().toUpperCase();
                          if (facturarStr === 'SI' || f.facturar === true) {
                            await supabase.from('facturacion').insert({
                              numero_fn: f.numero_fn,
                              cliente: f.cliente,
                              estado_facturacion: 'PENDIENTE',
                              fecha_completado: new Date().toISOString()
                            });
                          }
                        }

                        let nuevosFletes;
                        if (nuevoEstado === 'TERMINADO') {
                          nuevosFletes = fletes.filter((item: any) => item.numero_fn !== f.numero_fn);
                        } else {
                          nuevosFletes = fletes.map((item: any) => item.numero_fn === f.numero_fn ? { ...item, estado: nuevoEstado } : item); 
                        }
                        setFletes(nuevosFletes);
                        localStorage.setItem('fletes_cache', JSON.stringify(nuevosFletes));
                      }}
                    >
                      <option value="EN PREPARACIÓN" className="dark:bg-[#111c38]">EN PREPARACIÓN</option>
                      <option value="EN CURSO" className="dark:bg-[#111c38]">EN CURSO</option>
                      <option value="TERMINADO" className="dark:bg-[#111c38]">TERMINADO</option>
                    </select>
                  </td>
                  <td className="p-3 md:p-4 text-left align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <button onClick={() => window.location.href = `/fletes/${f.numero_fn}/editar`} className="text-blue-600 dark:text-sky-400 text-[11px] font-bold hover:underline">EDITAR</button>
                      <button onClick={() => generarPDF(f)} className="text-green-600 dark:text-emerald-400 text-[11px] font-bold hover:underline">PDF</button>
                      <button onClick={() => setOpAEliminar(f.numero_fn)} className="text-red-500 dark:text-red-400 text-[11px] font-bold hover:underline">ELIMINAR</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {fletesOrdenadosFinal.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No hay operaciones activas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {opAEliminar && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white dark:bg-[#111c38] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-2xl font-bold">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">¿Confirmar eliminación?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              ¿Estás seguro de eliminar la operación <span className="font-bold text-gray-800 dark:text-slate-200">{opAEliminar}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setOpAEliminar(null)} 
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition text-sm font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminarFlete} 
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800 transition text-sm font-semibold rounded-xl shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}