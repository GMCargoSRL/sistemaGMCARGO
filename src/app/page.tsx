'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Dashboard() {
  const [fletes, setFletes] = useState<any[]>([])
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc')
  const [busqueda, setBusqueda] = useState('')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
    const datosGenerales = [
      `Cliente: ${flete.cliente || ' '}`,
      `Tipo Operación: ${flete.tipo_operacion?.toUpperCase() || ' '}`,
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
        `Fecha y Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR') : ' '}`,
        `Lugar Carga Mercadería: ${flete.lugar_carga_mercaderia || ' '}`,
        `Lugar Entrega Lleno: ${flete.lugar_entrega_lleno || ' '}`
      ]
    } else if (flete.tipo_operacion === 'carga_suelta') {
      datosEspecificos = [
        `Lugar Carga: ${flete.lugar_carga || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR') : ' '}`,
        `Lugar Entrega: ${flete.lugar_entrega || ' '}`,
        `Cantidad Bultos: ${flete.cantidad_bultos || ' '}`,
        `Peso Bruto: ${flete.peso_bruto || ' '}`
      ]
    }

    const hGen = drawBox("DETALLES DE LA OPERACION", [...datosGenerales, ...datosEspecificos], 15, startY, 85, 75)
    const hEquipo = drawBox("DATOS DEL EQUIPO", [
      `Chofer: ${flete.chofer || ' '}`,
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

  async function getFletes() {
    const { data } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .order('fecha_hora', { ascending: orden === 'asc' })
    if (data) setFletes(data)
  }

  useEffect(() => { getFletes() }, [orden])

  async function eliminarFlete(numero_fn: string) {
    if (confirm(`¿Estás seguro de eliminar la operación ${numero_fn}?`)) {
      await supabase.from('fletes_nacionales').delete().eq('numero_fn', numero_fn)
      setFletes(fletes.filter((f: any) => f.numero_fn !== numero_fn))
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
        <h1 className="text-2xl font-bold">Operaciones en Curso</h1>
        <input type="text" placeholder="Buscar..." className="border p-2 rounded w-64" onChange={(e) => setBusqueda(e.target.value)} />
        <button onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')} className="bg-sky-600 text-white px-4 py-2 rounded font-bold hover:bg-sky-700">
          Ordenar: {orden === 'asc' ? 'Antiguos' : 'Recientes'}
        </button>
      </div>
      
      <table className="w-full bg-white border rounded-lg shadow-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">FN</th>
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
          {fletesFiltrados.map((f: any) => (
            <tr key={f.numero_fn} className="border-t">
              <td className="p-3 font-medium">{f.numero_fn}</td>
              <td className="p-3 text-sm text-gray-700">{f.cliente || '-'}</td>
              <td className="p-3 text-xs font-bold uppercase text-gray-500">{f.tipo_operacion || '-'}</td>
              <td className="p-3">{f.fecha_hora ? new Date(f.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
              <td className="p-3">{f.chofer}</td>
              <td className="p-3">{f.patente_camion}</td>
              <td className="p-3">{f.patente_semi}</td>
              <td className="p-3">{f.contenedor_num} {f.contenedor_tipo ? `(${f.contenedor_tipo})` : ''}</td>
              <td className="p-3">
                <details className="cursor-pointer group">
                  <summary className="list-none text-sm text-gray-600 hover:text-blue-600 hover:underline">{f.notas_adicionales?.length > 20 ? f.notas_adicionales.substring(0, 20) + "..." : f.notas_adicionales || '-'}</summary>
                  <div className="absolute z-10 p-4 mt-2 bg-white border rounded shadow-xl w-64 text-sm text-gray-800">{f.notas_adicionales}</div>
                </details>
              </td>
              <td className="p-3">
                <select className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${getEstadoStyle(f.estado)}`} value={f.estado || 'EN PREPARACIÓN'} onChange={async (e) => { const nuevoEstado = e.target.value; await supabase.from('fletes_nacionales').update({ estado: nuevoEstado }).eq('numero_fn', f.numero_fn); setFletes(fletes.map((item: any) => item.numero_fn === f.numero_fn ? { ...item, estado: nuevoEstado } : item)); }}>
                  <option value="EN PREPARACIÓN">EN PREPARACIÓN</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="TERMINADO">TERMINADO</option>
                </select>
              </td>
              <td className="p-3 flex gap-2">
                <button onClick={() => window.location.href = `/fletes/${f.numero_fn}/editar`} className="text-blue-600 text-xs font-bold">EDITAR</button>
                <button onClick={() => generarPDF(f)} className="text-green-600 text-xs font-bold">ORDEN DE FLETE</button>
                <button onClick={() => eliminarFlete(f.numero_fn)} className="text-red-500 text-xs font-bold">ELIMINAR</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}