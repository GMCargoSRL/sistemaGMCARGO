'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import * as XLSX from 'xlsx'

export default function Terminados() {
  const [fletes, setFletes] = useState<any[]>([])
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc')
  const [busqueda, setBusqueda] = useState('')
  
  // Estados para el modal/menú de exportación
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false)
  const [modoExportar, setModoExportar] = useState<'ninguno' | 'rango'>('ninguno')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Estado para el modal de confirmación de eliminación
  const [opAEliminar, setOpAEliminar] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Cargar caché local al montar el componente (para funcionamiento offline)
  useEffect(() => {
    const cached = localStorage.getItem('fletes_terminados_cache')
    if (cached) {
      try { 
        const parsed = JSON.parse(cached)
        if (parsed.length > 0) setFletes(parsed)
      } catch (e) {}
    }
  }, [])

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMostrarMenuExportar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- LÓGICA EXPORTAR A EXCEL ---
  const ejecutarExportacion = (datosAExportar: any[], nombreArchivo: string) => {
    if (!datosAExportar || datosAExportar.length === 0) {
      alert("No hay datos para exportar con los criterios seleccionados.")
      return
    }

    const datosLimpios = datosAExportar.map(f => ({
      "Op.": f.numero_fn || '',
      "Cliente": f.cliente || '',
      "Tipo Operación": f.tipo_operacion || '',
      "Fecha y Hora": f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga ? new Date(f.fecha_hora || f.fecha_carga_vacio || f.fecha_hora_carga).toLocaleString('es-AR') : '',
      "Chofer": f.chofer || '',
      "Camión": f.patente_camion || '',
      "Semi": f.patente_semi || '',
      "Contenedor": f.contenedor_num ? `${f.contenedor_num} (${f.contenedor_tipo || ''})` : '',
      "Estado": f.estado || 'TERMINADO',
      "Comentarios": f.notas_adicionales || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(datosLimpios)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Terminados")
    XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`)
    setMostrarMenuExportar(false)
    setModoExportar('ninguno')
  }

  const exportarVisibles = () => {
    ejecutarExportacion(fletesFiltrados, "Historial_Terminados_Visibles")
  }

  const exportarPorRangoFechas = async () => {
    if (!fechaDesde || !fechaHasta) {
      alert("Por favor selecciona ambas fechas.")
      return
    }

    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .eq('estado', 'TERMINADO')
      .gte('fecha_hora', fechaDesde)
      .lte('fecha_hora', fechaHasta + 'T23:59:59')

    if (error) {
      alert("Error al obtener los datos para el rango.")
      return
    }

    ejecutarExportacion(data || [], `Historial_Terminados_${fechaDesde}_al_${fechaHasta}`)
  }

  // --- LÓGICA GENERAR PDF ---
  const generarPDF = (flete: any) => {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()

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

    const tipoOperacionTexto = flete.tipo_operacion === 'importacion'
      ? `IMPORTACION (TRAM: ${flete.tram?.toUpperCase() || 'NO'})`
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
        `Libre hasta: ${flete.libre_hasta ? new Date(flete.libre_hasta).toLocaleString('es-AR') : ' '}`
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
      `Teléfono: ${flete.telefono_chofer || 'No informado'}`, 
      `Patente Camión: ${flete.patente_camion || ' '}`,
      `Patente Semi: ${flete.patente_semi || ' '}`
    ], 115, startY, 80, 70)

    drawBox("INSTRUCCIONES Y NOTAS", [flete.notas_adicionales || 'Sin notas adicionales.'], 15, startY + Math.max(hGen, hEquipo) + 10, 180, 170)

    doc.save(`Orden Carga ${flete.numero_fn}.pdf`)
  }

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'EN PREPARACIÓN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EN CURSO': return 'bg-red-100 text-red-800 border-red-200';
      case 'TERMINADO': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
        return 'bg-gray-50/60 hover:bg-gray-100/80';
    }
  };

  async function getFletes() {
    const { data } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .eq('estado', 'TERMINADO') 
      .order('fecha_hora', { ascending: orden === 'asc' })
      
    if (data) {
      setFletes(data)
      localStorage.setItem('fletes_terminados_cache', JSON.stringify(data))
    }
  }

  useEffect(() => { getFletes() }, [orden])

  // Confirmar y eliminar definitivamente
  async function confirmarEliminarFlete() {
    if (opAEliminar) {
      await supabase.from('fletes_nacionales').delete().eq('numero_fn', opAEliminar)
      const nuevosFletes = fletes.filter((f: any) => f.numero_fn !== opAEliminar)
      setFletes(nuevosFletes)
      localStorage.setItem('fletes_terminados_cache', JSON.stringify(nuevosFletes))
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
          <h1 className="text-2xl font-bold text-gray-800">Historial de Operaciones (Terminados)</h1>
          <p className="text-sm text-gray-500">Listado histórico de todas las operaciones finalizadas.</p>
        </div>
        <div className="flex gap-4 items-center">
          <input type="text" placeholder="Buscar..." className="border p-2 rounded w-64 text-sm" onChange={(e) => setBusqueda(e.target.value)} />
          
          <button onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')} className="bg-sky-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-sky-700 transition">
            Ordenar: {orden === 'asc' ? 'Antiguos' : 'Recientes'}
          </button>

          {/* Botón y Menú Desplegable de Exportación */}
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
                      📥 Exportar registros visibles ({fletesFiltrados.length})
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
      
      <table className="w-full bg-white border rounded-lg shadow-sm overflow-hidden">
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
            const estadoActual = f.estado || 'TERMINADO';
            return (
              <tr key={f.numero_fn} className={`border-t transition ${getColorFondoRenglon(estadoActual)}`}>
                <td className="p-3 font-medium text-gray-900">{f.numero_fn}</td>
                <td className="p-3 text-sm text-gray-700">{f.cliente || '-'}</td>
                <td className="p-3 text-xs font-bold uppercase text-gray-500">{f.tipo_operacion || '-'}</td>
                <td className="p-3 text-sm text-gray-700">{fechaMostrar ? new Date(fechaMostrar).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                <td className="p-3 text-sm text-gray-700">{f.chofer}</td>
                <td className="p-3 text-sm text-gray-700">{f.patente_camion}</td>
                <td className="p-3 text-sm text-gray-700">{f.patente_semi}</td>
                <td className="p-3 text-sm text-gray-700">{f.contenedor_num} {f.contenedor_tipo ? `(${f.contenedor_tipo})` : ''}</td>
                <td className="p-3 relative">
                  <details className="cursor-pointer group">
                    <summary className="list-none text-sm text-gray-600 hover:text-blue-600 hover:underline">{(f.notas_adicionales || f.notes_adicionales)?.length > 20 ? (f.notas_adicionales || f.notes_adicionales).substring(0, 20) + "..." : (f.notas_adicionales || f.notes_adicionales) || '-'}</summary>
                    <div className="absolute z-10 p-4 mt-2 bg-white border rounded shadow-xl w-64 text-sm text-gray-800">{f.notas_adicionales || f.notes_adicionales}</div>
                  </details>
                </td>
                <td className="p-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${getEstadoStyle(f.estado)}`}>
                    {f.estado || 'TERMINADO'}
                  </span>
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
                No hay operaciones terminadas registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
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