'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const formatDateTimeLocal = (dateString: string) => dateString ? dateString.substring(0, 16) : '';

export default function EditarFletePage() {
  const params = useParams()
  const router = useRouter()
  const numero_fn = decodeURIComponent(params.numero_fn as string)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientes, setClientes] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  
  // Estados para control de cambios y navegación
  const [modificacionExitosa, setModificacionExitosa] = useState(false)
  const [modificado, setModificado] = useState(false)
  const [mostrarAvisoSalida, setMostrarAvisoSalida] = useState(false)
  const [rutaPendiente, setRutaPendiente] = useState<string | null>(null)

  const updateForm = (fields: any) => {
    setForm((prev: any) => ({ ...prev, ...fields }))
    setModificado(true)
  }

  useEffect(() => {
    async function fetchData() {
      const { data: c } = await supabase.from('choferes').select('*')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      const { data: flete } = await supabase.from('fletes_nacionales').select('*').eq('numero_fn', numero_fn).single()

      if (c) setChoferes(c)
      if (cl) setClientes(cl)
      if (flete) {
        setForm({
          ...flete,
          tram: flete.tram || 'NO',
          tipo_operacion: flete.tipo_operacion || 'importacion'
        })
        setModificado(false)
      }
    }
    fetchData()
  }, [numero_fn])

  // 1. Interceptar clics en cualquier enlace interno de la página (menús, operaciones, terminados, etc.)
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (target && modificado && !modificacionExitosa) {
        const href = target.getAttribute('href')
        // Si es un enlace interno que empieza con barra o ruta
        if (href && (href.startsWith('/') || href.startsWith('.'))) {
          e.preventDefault()
          setRutaPendiente(href)
          setMostrarAvisoSalida(true)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => document.removeEventListener('click', handleAnchorClick, true)
  }, [modificado, modificacionExitosa])

  // 2. Advertencia nativa de seguridad si intentan cerrar la pestaña por completo
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (modificado && !modificacionExitosa) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [modificado, modificacionExitosa])

  const handleCancelar = () => {
    if (modificado && !modificacionExitosa) {
      setRutaPendiente('/')
      setMostrarAvisoSalida(true)
    } else {
      router.push('/')
    }
  }

  const confirmarSalidaSinGuardar = () => {
    setMostrarAvisoSalida(false)
    router.push(rutaPendiente || '/')
  }

  const handleChoferChange = (nombre: string) => {
    const seleccionado = choferes.find(c => c.CHOFER === nombre)
    updateForm({ 
      chofer: nombre,
      dni_chofer: seleccionado ? (seleccionado["DOC. ID."] || '') : '',
      telefono_chofer: seleccionado ? (seleccionado.TEL || '') : '',
      patente_camion: seleccionado ? (seleccionado.patente_camion || '') : '',
      patente_semi: seleccionado ? (seleccionado.patente_semi || '') : ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.cliente && !clientes.find(c => c["Razon Social"] === form.cliente)) {
      await supabase.from('clientes').insert([{ "Razon Social": form.cliente }])
    }
    if (form.chofer && !choferes.find(c => c.CHOFER === form.chofer)) {
      await supabase.from('choferes').insert([{ 
        "CHOFER": form.chofer, 
        "DOC. ID.": form.dni_chofer, 
        "TEL": form.telefono_chofer,
        "patente_camion": form.patente_camion,
        "patente_semi": form.patente_semi
      }])
    }

    const dataToSend = { ...form }
    const dateFields = ['fecha_hora', 'fecha_carga_vacio', 'fecha_hora_carga', 'libre_hasta']
    dateFields.forEach(field => {
      if (dataToSend[field as keyof typeof dataToSend] === '') (dataToSend as any)[field] = null
    })

    const { error } = await supabase.from('fletes_nacionales').update(dataToSend).eq('numero_fn', numero_fn)
    
    if (error) {
      alert("Error: " + error.message)
    } else { 
      setModificacionExitosa(true)
      setModificado(false)
    }
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
      `DNI: ${dniChofer}`, 
      `Teléfono: ${flete.telefono_chofer || 'No informado'}`, 
      `Patente Camión: ${flete.patente_camion || ' '}`,
      `Patente Semi: ${flete.patente_semi || ' '}`
    ], 115, startY, 80, 70)

    drawBox("INSTRUCCIONES Y NOTAS", [flete.notas_adicionales || flete.notes_adicionales || 'Sin notas adicionales.'], 15, startY + Math.max(hGen, hEquipo) + 10, 180, 170)

    doc.save(`Orden Carga ${flete.numero_fn}.pdf`)
  }

  if (!form) return <div className="p-8">Cargando datos...</div>

  return (
    <>
      <form 
        onSubmit={handleSubmit} 
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} 
        className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen"
      >
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Editar Operación: {numero_fn}</h2>

        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select className="border p-2 rounded" value={form.tipo_operacion || 'importacion'} onChange={e => updateForm({ tipo_operacion: e.target.value })}>
              <option value="importacion">Importación/TRM</option>
              <option value="exportacion">Exportación</option>
              <option value="carga_suelta">Carga Suelta</option>
            </select>
            
            {form.tipo_operacion === 'importacion' ? (
              <div className="flex items-center gap-2 border p-2 rounded bg-white">
                <label className="text-xs text-gray-600 font-bold whitespace-nowrap">TRAM:</label>
                <select className="flex-1 outline-none text-sm" value={form.tram || 'NO'} onChange={e => updateForm({ tram: e.target.value })}>
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
            ) : <div className="hidden md:block" />}

            <div className="flex gap-2 md:col-span-2">
              <input type="text" placeholder="Nº Op. (VN-0001)" className="border p-2 flex-1 rounded uppercase bg-gray-100 text-gray-500 cursor-not-allowed" value={form.numero_fn || ''} readOnly />
            </div>
            
            <input list="lista-clientes" placeholder="Seleccionar o escribir Cliente *" className="border p-2 rounded md:col-span-3" value={form.cliente || ''} onChange={e => updateForm({ cliente: e.target.value })} />
            <datalist id="lista-clientes">
              {clientes
                .filter((c: any) => c["Razon Social"])
                .map((c: any, index: number) => (
                  <option key={`cliente-${index}-${c["Razon Social"]}`} value={c["Razon Social"]} />
              ))}
            </datalist>

            <input type="text" placeholder="Documento Aduanero" className="border p-2 rounded md:col-span-1" value={form.documento_aduanero || ''} onChange={e => updateForm({ documento_aduanero: e.target.value })} />
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.tipo_operacion === 'importacion' && (
              <>
                <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num || ''} onChange={e => updateForm({ contenedor_num: e.target.value })} />
                <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo || ''} onChange={e => updateForm({ contenedor_tipo: e.target.value })} />
                <input type="text" placeholder="Origen" className="border p-2 rounded" value={form.origen || ''} onChange={e => updateForm({ origen: e.target.value })} />
                <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora)} onChange={e => updateForm({ fecha_hora: e.target.value })} /></div>
                <input type="text" placeholder="Paradas" className="border p-2 rounded" value={form.paradas || ''} onChange={e => updateForm({ paradas: e.target.value })} />
                <input type="text" placeholder="Destino" className="border p-2 rounded" value={form.destino || ''} onChange={e => updateForm({ destino: e.target.value })} />
                <input type="text" placeholder="Lugar Devolución" className="border p-2 rounded" value={form.lugar_devolucion || ''} onChange={e => updateForm({ lugar_devolucion: e.target.value })} />
                <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Libre Hasta</label><input type="date" className="border p-2 rounded" value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => updateForm({ libre_hasta: e.target.value })} /></div>
              </>
            )}
            {form.tipo_operacion === 'exportacion' && (
              <>
                <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num || ''} onChange={e => updateForm({ contenedor_num: e.target.value })} />
                <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo || ''} onChange={e => updateForm({ contenedor_tipo: e.target.value })} />
                <input type="text" placeholder="Lugar Carga Vacío" className="border p-2 rounded" value={form.lugar_carga_vacio || ''} onChange={e => updateForm({ lugar_carga_vacio: e.target.value })} />
                <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga Vacío</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={e => updateForm({ fecha_carga_vacio: e.target.value })} /></div>
                <input type="text" placeholder="Lugar Carga Mercadería" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_carga_mercaderia || ''} onChange={e => updateForm({ lugar_carga_mercaderia: e.target.value })} />
                <input type="text" placeholder="Lugar Entrega Lleno" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega_lleno || ''} onChange={e => updateForm({ lugar_entrega_lleno: e.target.value })} />
              </>
            )}
            {form.tipo_operacion === 'carga_suelta' && (
              <>
                <input type="text" placeholder="Lugar de Carga" className="border p-2 rounded" value={form.lugar_carga || ''} onChange={e => updateForm({ lugar_carga: e.target.value })} />
                <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha/Hora Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={e => updateForm({ fecha_hora_carga: e.target.value })} /></div>
                <input type="text" placeholder="Lugar de Entrega" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega || ''} onChange={e => updateForm({ lugar_entrega: e.target.value })} />
                <input type="text" placeholder="Cantidad y Tipo de Bultos" className="border p-2 rounded" value={form.cantidad_bultos || ''} onChange={e => updateForm({ cantidad_bultos: e.target.value })} />
                <input type="text" placeholder="Peso Bruto" className="border p-2 rounded" value={form.peso_bruto || ''} onChange={e => updateForm({ peso_bruto: e.target.value })} />
              </>
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input list="lista-choferes" placeholder="Seleccionar o escribir Chofer *" className="border p-2 rounded" value={form.chofer || ''} onChange={e => handleChoferChange(e.target.value)} />
            <datalist id="lista-choferes">
              {choferes
                .filter((c: any) => c.CHOFER)
                .map((c: any, index: number) => (
                  <option key={`chofer-${index}-${c.CHOFER}`} value={c.CHOFER} />
              ))}
            </datalist>
            <input type="text" placeholder="DNI" className="border p-2 rounded" value={form.dni_chofer || ''} onChange={e => updateForm({ dni_chofer: e.target.value })} />
            <input type="text" placeholder="Teléfono" className="border p-2 rounded" value={form.telefono_chofer || ''} onChange={e => updateForm({ telefono_chofer: e.target.value })} />
            <div className="hidden md:block"></div>
            <input type="text" placeholder="Patente Camión" className="border p-2 rounded" value={form.patente_camion || ''} onChange={e => updateForm({ patente_camion: e.target.value })} />
            <input type="text" placeholder="Patente Semi" className="border p-2 rounded" value={form.patente_semi || ''} onChange={e => updateForm({ patente_semi: e.target.value })} />
          </div>
        </section>

        <textarea className="w-full border p-4 rounded-lg" placeholder="Notas adicionales..." value={form.notas_adicionales || ''} onChange={(e) => updateForm({ notas_adicionales: e.target.value })} />
        
        <div className="flex flex-col gap-3">
          <button type="submit" className="w-full bg-sky-600 text-white p-4 font-bold rounded-lg hover:bg-sky-700 transition shadow-lg">Guardar Cambios</button>
          <button type="button" onClick={handleCancelar} className="w-full bg-red-400 text-white p-3 font-bold rounded-lg hover:bg-red-500 transition">Cancelar</button>
        </div>
      </form>

      {/* --- CARTEL DE ADVERTENCIA: CAMBIOS SIN GUARDAR --- */}
      {mostrarAvisoSalida && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 text-center">
            
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 text-3xl font-bold">⚠️</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Atención! Tienes cambios sin guardar</h3>
            <p className="text-sm text-gray-500 mb-6">
              Si sales ahora sin guardar, perderás todas las modificaciones que realizaste en esta operación.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setMostrarAvisoSalida(false)}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
              >
                Continuar editando
              </button>
              
              <button 
                onClick={confirmarSalidaSinGuardar}
                className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl text-sm transition"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CARTEL DE ÉXITO Y DESCARGA DE PDF --- */}
      {modificacionExitosa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 text-center">
            
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 text-3xl font-bold">👍</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Operación Modificada con Éxito 👍</h3>
            <p className="text-sm text-gray-500 mb-6">
              Los cambios de la operación <span className="font-bold text-gray-800">{numero_fn}</span> se guardaron correctamente.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => generarPDF(form)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>📥</span> Descargar Orden de Carga (PDF)
              </button>
              
              <button 
                onClick={() => router.push('/')}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
              >
                🏠 Ir a la página principal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}