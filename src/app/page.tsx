'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import * as XLSX from 'xlsx'

export default function Dashboard() {
  const [fletes, setFletes] = useState<any[]>([])
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc')
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
    ejecutarExportacion(fletesFiltrados, "Operaciones_En_Curso_Visibles")
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

  async function getFletes() {
    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .neq('estado', 'TERMINADO') 
      .order('fecha_hora', { ascending: orden === 'asc' })
      
    if (!error && data) {
      setFletes(data)
      localStorage.setItem('fletes_cache', JSON.stringify(data))
    }
  }

  useEffect(() => { getFletes() }, [orden])

  async function confirmarEliminarFlete() {
    if (opAEliminar) {
      await supabase.from('fletes_nacionales').delete().eq('numero_fn', opAEliminar)
      const nuevosFletes = fletes.filter((f: any) => f.numero_fn !== opAEliminar)
      setFletes(nuevosFletes)
      localStorage.setItem('fletes_cache', JSON.stringify(nuevosFletes))
      setOpAEliminar(null)
    }
  }

  const fletesFiltrados = fletes.filter((f) => 
    Object.values(f).some((valor) => 
      String(valor).toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Operaciones en Curso</h1>
          <p className="text-sm text-gray-500">Listado de fletes activos en preparación o tránsito.</p>
        </div>
        <div className="flex gap-4 items-center">
          <input type="text" placeholder="Buscar..." className="border p-2 rounded w-64 text-sm" onChange={(e) => setBusqueda(e.target.value)} />
          
          <button onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')} className="bg-sky-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-sky-700 transition">
            Ordenar: {orden === 'asc' ? 'Antiguos' : 'Recientes'}
          </button>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setMostrarMenuExportar(!mostrarMenuExportar)
                setModoExportar('ninguno')
              }} 
              className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-1"
            >
              📊 Exportar ▾
            </button>

            {mostrarMenuExportar && (
              <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-xl z-20 p-3 text-sm">
                <p className="font-bold text-gray-700 mb-2 border-b pb-1">Exportar a Excel</p>
                
                {modoExportar === 'ninguno' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={exportarVisibles}
                      className="text-left w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition"
                    >
                      📥 Exportar operaciones visibles ({fletesFiltrados.length})
                    </button>
                    <button 
                      onClick={() => setModoExportar('rango')}
                      className="text-left w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition"
                    >
                      📅 Exportar por rango de fechas
                    </button>
                  </div>
                )}

                {modoExportar === 'rango' && (
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="text-xs text-gray-500">Desde:</label>
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border p-1.5 rounded text-xs" />
                    
                    <label className="text-xs text-gray-500">Hasta:</label>
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border p-1.5 rounded text-xs" />
                    
                    <div className="flex gap-2 mt-2">
                      <button onClick={exportarPorRangoFechas} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 w-full">Descargar</button>
                      <button onClick={() => setModoExportar('ninguno')} className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-400">Volver</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <table className="w-full bg-white border rounded-lg shadow-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-sm text-gray-600">
            <th className="p-3">Op.</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Fecha y Hora</th>
            <th className="p-3">Chofer</th>
            <th className="p-3">Camión</th>
            <th className="p-3">Semi</th>
            <th className="p-3">Contenedor</th>
            <th className="p-3">Comentarios</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {fletesFiltrados.map((f: any) => {
            const fechaMostrar = f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga;
            const estadoActual = f.estado || 'EN PREPARACIÓN';
            
            const valorTram = String(f.tram || f.trm || '').trim().toUpperCase();
            const esTram = valorTram === 'SI';
            const tipoMostrar = esTram ? 'TRÁNSITO' : (f.tipo_operacion || '-');

            const devolucionVacia = !f.lugar_devolucion || f.lugar_devolucion.trim() === '';
            const libreHastaVacio = !f.libre_hasta || f.libre_hasta.trim() === '';
            const faltanCamposDevolucion = devolucionVacia || libreHastaVacio;

            return (
              <tr key={f.numero_fn} className="border-t hover:bg-gray-50 transition">
                <td className="p-3 font-medium text-gray-900">{f.numero_fn}</td>
                <td className="p-3 text-sm text-gray-700">{f.cliente || '-'}</td>
                <td className="p-3 text-xs font-bold uppercase text-gray-500">{tipoMostrar}</td>
                <td className="p-3 text-sm text-gray-700">{fechaMostrar ? new Date(fechaMostrar).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                <td className="p-3 text-sm text-gray-700">{f.chofer}</td>
                <td className="p-3 text-sm text-gray-700">{f.patente_camion}</td>
                <td className="p-3 text-sm text-gray-700">{f.patente_semi}</td>
                <td className="p-3 text-sm text-gray-700">
                  <div>{f.contenedor_num} {f.contenedor_tipo ? `(${f.contenedor_tipo})` : ''}</div>
                  {faltanCamposDevolucion ? (
                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-medium">
                      <span>⚠️ Falta devolución / Libre hasta</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11px] text-gray-500 leading-tight">
                      Devolución: {f.lugar_devolucion} | Libre: {formatearFechaCortas(f.libre_hasta)}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <details className="cursor-pointer group">
                    <summary className="list-none text-sm text-gray-600 hover:text-blue-600 hover:underline">{(f.notas_adicionales || f.notes_adicionales)?.length > 20 ? (f.notas_adicionales || f.notes_adicionales).substring(0, 20) + "..." : (f.notas_adicionales || f.notes_adicionales) || '-'}</summary>
                    <div className="absolute z-10 p-4 mt-2 bg-white border rounded shadow-xl w-64 text-sm text-gray-800">{f.notas_adicionales || f.notes_adicionales}</div>
                  </details>
                </td>
                <td className="p-3">
                  <select 
                    className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${getEstadoStyle(f.estado)}`} 
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
                <td className="p-3 flex gap-2">
                  <button onClick={() => window.location.href = `/fletes/${f.numero_fn}/editar`} className="text-blue-600 text-xs font-bold hover:underline">EDITAR</button>
                  <button onClick={() => generarPDF(f)} className="text-green-600 text-xs font-bold hover:underline">PDF</button>
                  <button onClick={() => setOpAEliminar(f.numero_fn)} className="text-red-500 text-xs font-bold hover:underline">ELIMINAR</button>
                </td>
              </tr>
            )
          })}
          {fletesFiltrados.length === 0 && (
            <tr>
              <td colSpan={11} className="p-8 text-center text-gray-400 text-sm">
                No hay operaciones activas en este momento.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {opAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100 text-center">
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
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminarFlete} 
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition text-sm font-semibold rounded-lg shadow-sm"
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