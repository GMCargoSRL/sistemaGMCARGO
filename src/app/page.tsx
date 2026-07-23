'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import * as XLSX from 'xlsx'

export default function Dashboard() {
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
      return {
        "Operación": f.numero_fn || '',
        "Cliente": f.cliente || '',
        "Tipo Operación": esTram ? 'TRÁNSITO' : (f.tipo_operacion || ''),
        "Fecha y Hora": f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga ? new Date(f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga).toLocaleString('es-AR') : '',
        "Chofer": f.chofer || '',
        "Camión": f.patente_camion || '',
        "Semi": f.patente_semi || '',
        "Contenedor": f.contenedor_num ? `${f.contenedor_num} (${f.contenedor_tipo || ''})` : '',
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
        `Fecha y Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR') : ' '}`,
        `Paradas: ${flete.paradas || 'Ninguna'}`,
        `Destino: ${flete.destino || ' '}`,
        `Devolución: ${flete.lugar_devolucion || ' '}`,
        `Libre hasta: ${flete.libre_hasta || ' '}`
      ]
    } else if (flete.tipo_operacion === 'exportacion') {
      datosEspecificos = [
        `Lugar Carga Vacío: ${flete.lugar_carga_vacio || ' '}`,
        `Fecha y Hora: ${flete.fecha_carga_vacio ? new Date(flete.fecha_carga_vacio).toLocaleString('es-AR') : ' '}`,
        `Lugar Carga Mercadería: ${flete.lugar_carga_mercaderia || ' '}`,
        `Lugar Entrega Lleno: ${flete.lugar_entrega_lleno || ' '}`
      ]
    } else if (flete.tipo_operacion === 'carga_suelta') {
      datosEspecificos = [
        `Lugar Carga: ${flete.lugar_carga || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora_carga ? new Date(flete.fecha_hora_carga).toLocaleString('es-AR') : ' '}`,
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EN CURSO': return 'bg-red-100 text-red-800 border-red-200';
      case 'TERMINADO': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getColorFondoRenglon = (estado: string) => {
    switch (estado) {
      case 'EN PREPARACIÓN': 
      case null: 
      case undefined: 
      case '': 
        return 'bg-blue-50/60 hover:bg-blue-100/80';
      case 'EN CURSO': 
        return 'bg-red-50/60 hover:bg-red-100/80';
      case 'TERMINADO': 
        return 'bg-green-50/60 hover:bg-green-100/80';
      default: 
        return 'bg-blue-50/60 hover:bg-blue-100/80';
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
  
  let fletesFiltrados = fletes.filter((f) => 
    Object.values(f).some((valor) => 
      String(valor).toLowerCase().includes(queryBusqueda)
    )
  );

  if (fletesFiltrados.length === 0 && queryBusqueda.length > 1) {
    const palabrasBusqueda = queryBusqueda.split(/\s+/);
    fletesFiltrados = fletes.filter((f) => {
      const textoCompletoFlete = Object.values(f).join(' ').toLowerCase();
      return palabrasBusqueda.some(palabra => {
        if (palabra.length < 3) return textoCompletoFlete.includes(palabra);
        return textoCompletoFlete.split(/[\s-_]+/).some(token => 
          token.includes(palabra) || palabra.includes(token) || (token.length > 3 && palabra.length > 3 && token.substring(0, 3) === palabra.substring(0, 3))
        );
      });
    });
  }

  const fletesOrdenadosFinal = [...fletesFiltrados].sort((a, b) => {
    if (criterioOrden === 'operacion_asc' || criterioOrden === 'operacion_desc') {
      const opA = String(a.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const opB = String(b.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const comparacion = opA.localeCompare(opB, undefined, { numeric: true, sensitivity: 'base' });
      return criterioOrden === 'operacion_asc' ? comparacion : -comparacion;
    }
    return 0; 
  });

  return (
    <div className="p-4 md:p-8 min-w-full w-fit min-h-screen bg-gray-50/50">
      {/* Cabecera y controles */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky left-0 max-w-[100vw]">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">Operaciones en Curso</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Listado de fletes activos en preparación o tránsito.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Buscador con icono */}
          <div className="relative flex-1 md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 text-sm">
              🔍
            </span>
            <input 
              type="text" 
              placeholder="Buscar operación, chofer, cliente..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-gray-800 placeholder-gray-400" 
              onChange={(e) => setBusqueda(e.target.value)} 
            />
          </div>
          
          {/* Selector de ordenamiento */}
          <select 
            value={criterioOrden} 
            onChange={(e) => setCriterioOrden(e.target.value as any)}
            className="bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-semibold hover:border-gray-300 transition shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-auto shrink-0"
          >
            <option value="fecha_asc">📅 Más Próximos</option>
            <option value="fecha_desc">📅 Más Lejanos</option>
            <option value="operacion_asc">🔤 Operación: A - Z</option>
            <option value="operacion_desc">🔤 Operación: Z - A</option>
          </select>

          {/* Menú de exportación */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setMostrarMenuExportar(!mostrarMenuExportar)
                setModoExportar('ninguno')
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>📊</span> Exportar <span className="text-xs opacity-80">▾</span>
            </button>

            {mostrarMenuExportar && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <span>📥</span> Opciones de Exportación
                </p>
                
                {modoExportar === 'ninguno' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={exportarVisibles}
                      className="text-left w-full px-3.5 py-2.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-gray-700 font-medium transition flex items-center justify-between"
                    >
                      <span>Exportar visibles</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{fletesOrdenadosFinal.length}</span>
                    </button>
                    <button 
                      onClick={() => setModoExportar('rango')}
                      className="text-left w-full px-3.5 py-2.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-gray-700 font-medium transition flex items-center gap-2"
                    >
                      <span>📅 Por rango de fechas</span>
                    </button>
                  </div>
                )}

                {modoExportar === 'rango' && (
                  <div className="flex flex-col gap-2.5 mt-1">
                    <label className="text-xs font-semibold text-gray-600">Desde:</label>
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border border-gray-200 p-2 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    
                    <label className="text-xs font-semibold text-gray-600">Hasta:</label>
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border border-gray-200 p-2 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    
                    <div className="flex gap-2 mt-2">
                      <button onClick={exportarPorRangoFechas} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition w-full shadow-sm">Descargar</button>
                      <button onClick={() => setModoExportar('ninguno')} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Volver</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabla con celdas centradas verticalmente (align-middle) */}
      <div className="min-w-full w-fit bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse table-auto min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 text-xs md:text-sm text-gray-600 border-b border-gray-200">
              <th className="p-3 md:p-4 font-bold align-middle">Op.</th>
              <th className="p-3 md:p-4 font-bold align-middle">Cliente</th>
              <th className="p-3 md:p-4 font-bold align-middle">Tipo</th>
              <th className="p-3 md:p-4 font-bold align-middle min-w-[100px]">Fecha y Hora</th>
              <th className="p-3 md:p-4 font-bold align-middle">Chofer</th>
              <th className="p-3 md:p-4 font-bold align-middle">Camión</th>
              <th className="p-3 md:p-4 font-bold align-middle">Semi</th>
              <th className="p-3 md:p-4 font-bold align-middle min-w-[120px]">Contenedor</th>
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
                <tr key={f.numero_fn} className={`border-t border-gray-100 transition text-xs md:text-sm ${renglonColor}`}>
                  <td className="p-3 md:p-4 font-semibold text-gray-900 break-words whitespace-normal align-middle">{f.numero_fn}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">{f.cliente || '-'}</td>
                  <td className="p-3 md:p-4 font-bold uppercase text-gray-500 text-[10px] md:text-xs break-words whitespace-normal align-middle">{tipoMostrar}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">{fechaMostrar ? new Date(fechaMostrar).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">{f.chofer}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">{f.patente_camion}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">{f.patente_semi}</td>
                  <td className="p-3 md:p-4 text-gray-700 break-words whitespace-normal align-middle">
                    <div>{f.contenedor_num} {f.contenedor_tipo ? `(${f.contenedor_tipo})` : ''}</div>
                    {!llevaInfoDevolucion && (
                      <>
                        {faltanCamposDevolucion ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 text-[9px] font-medium leading-tight">
                            <span>⚠️ Falta dev. / libre</span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[10px] text-gray-500 leading-tight break-words whitespace-normal">
                            Dev: {f.lugar_devolucion} | Libre: {formatearFechaCortas(f.libre_hasta)}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="p-3 md:p-4 relative break-words whitespace-normal align-middle">
                    {textoComentarioCompleto ? (
                      <details className="cursor-pointer group">
                        <summary className="list-none text-gray-700 hover:text-blue-600 font-medium block select-none break-words">
                          {textoComentarioCorto}
                        </summary>
                        <div className="absolute right-0 md:left-0 z-20 p-4 mt-2 bg-white border rounded-lg shadow-xl w-64 text-sm text-gray-800 break-words whitespace-pre-wrap">
                          {textoComentarioCompleto}
                        </div>
                      </details>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3 md:p-4 align-middle">
                    <select 
                      className={`px-2.5 py-1.5 rounded-full text-[10px] md:text-xs font-bold border cursor-pointer w-full shadow-sm transition ${getEstadoStyle(f.estado)}`} 
                      value={estadoActual} 
                      onChange={async (e) => { 
                        const nuevoEstado = e.target.value; 
                        await supabase.from('fletes_nacionales').update({ estado: nuevoEstado }).eq('numero_fn', f.numero_fn);
                        
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
                      <option value="EN PREPARACIÓN">EN PREPARACIÓN</option>
                      <option value="EN CURSO">EN CURSO</option>
                      <option value="TERMINADO">TERMINADO</option>
                    </select>
                  </td>
                  <td className="p-3 md:p-4 text-left align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <button onClick={() => window.location.href = `/fletes/${f.numero_fn}/editar`} className="text-blue-600 text-[11px] font-bold hover:underline">EDITAR</button>
                      <button onClick={() => generarPDF(f)} className="text-green-600 text-[11px] font-bold hover:underline">PDF</button>
                      <button onClick={() => setOpAEliminar(f.numero_fn)} className="text-red-500 text-[11px] font-bold hover:underline">ELIMINAR</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {fletesOrdenadosFinal.length === 0 && (
              <tr>
                <td colSpan={11} className="p-12 text-center text-gray-400 text-sm">
                  No hay operaciones activas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {opAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl font-bold">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Confirmar eliminación?</h3>
            <p className="text-sm text-gray-500 mb-6">
              ¿Estás seguro de eliminar la operación <span className="font-bold text-gray-800">{opAEliminar}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setOpAEliminar(null)} 
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminarFlete} 
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition text-sm font-semibold rounded-xl shadow-sm"
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