'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ESTADO_INICIAL = { 
  numero_fn: '', cliente: '', chofer: '', dni_chofer: '', telefono_chofer: '', contenedor_num: '', 
  contenedor_tipo: '', origen: '', fecha_hora: '', 
  paradas: '', destino: '', patente_camion: '', patente_semi: '',
  lugar_devolucion: '', libre_hasta: '',
  notas_adicionales: '',
  lugar_carga_vacio: '', fecha_carga_vacio: '',
  lugar_carga_mercaderia: '', lugar_entrega_lleno: '',
  lugar_carga: '', fecha_hora_carga: '', documento_aduanero: '', 
  cantidad_bultos: '', peso_bruto: '', lugar_entrega: '',
  tipo_operacion: 'importacion',
  tram: 'NO'
}

const formatDateTimeLocal = (dateString: string) => dateString ? dateString.substring(0, 16) : '';

export default function FletesPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientes, setClientes] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [form, setForm] = useState({ ...ESTADO_INICIAL })
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const [operacionGuardada, setOperacionGuardada] = useState<any | null>(null)

  useEffect(() => {
    const hayDatosCargados = Object.entries(form).some(([key, value]) => {
      if (key === 'tipo_operacion') return value !== 'importacion'
      if (key === 'tram') return value !== 'NO'
      return value !== ''
    })

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hayDatosCargados) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form])

  useEffect(() => {
    async function fetchData() {
      setCargandoDatos(true)
      const { data: c } = await supabase.from('choferes').select('*')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      if (c) setChoferes(c)
      if (cl) setClientes(cl)
      setCargandoDatos(false)
    }
    fetchData()
  }, [])

  const handleChoferChange = (nombre: string) => {
    const seleccionado = choferes.find(c => c.CHOFER === nombre)
    setForm({ 
      ...form, 
      chofer: nombre,
      dni_chofer: seleccionado ? (seleccionado["DOC. ID."] || '') : '',
      telefono_chofer: seleccionado ? (seleccionado.TEL || '') : '',
      patente_camion: seleccionado ? (seleccionado.patente_camion || '') : '',
      patente_semi: seleccionado ? (seleccionado.patente_semi || '') : ''
    })
  }

  const generarVN = async () => {
    const { data } = await supabase.from('fletes_nacionales').select('numero_fn').ilike('numero_fn', 'VN-%')
    let maxNum = 0
    if (data && data.length > 0) {
      data.forEach(item => {
        const numStr = item.numero_fn.replace('VN-', '').replace(/[A-Z]/g, '')
        const num = parseInt(numStr, 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      })
    }
    setForm({ ...form, numero_fn: `VN-${(maxNum + 1).toString().padStart(4, '0')}` })
    toast.success("Número de operación generado correctamente")
  }

  const handleNuevoVNCorrelativo = async (mantenerDatos: boolean) => {
    const { data } = await supabase.from('fletes_nacionales').select('numero_fn').ilike('numero_fn', 'VN-%')
    let maxNum = 0
    if (data && data.length > 0) {
      data.forEach(item => {
        const numStr = item.numero_fn.replace('VN-', '').replace(/[A-Z]/g, '')
        const num = parseInt(numStr, 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      })
    }
    const nuevoNumero = `VN-${(maxNum + 1).toString().padStart(4, '0')}`

    setOperacionGuardada(null)
    if (mantenerDatos) {
      setForm(prev => ({
        ...prev,
        numero_fn: nuevoNumero,
        contenedor_num: '',
        contenedor_tipo: '',
        documento_aduanero: '',
        cantidad_bultos: '',
        peso_bruto: ''
      }))
      toast.success(`Se abrió el siguiente VN correlativo manteniendo los datos: ${nuevoNumero}`)
    } else {
      setForm({ ...ESTADO_INICIAL, numero_fn: nuevoNumero })
      toast.success(`Se abrió un nuevo VN correlativo limpio: ${nuevoNumero}`)
    }
  }

  const handleMismoVNCorrelativo = async (fleteAnterior: any) => {
    const vnActual = fleteAnterior.numero_fn || ''
    let siguienteVN = ''

    const matchLetra = vnActual.match(/^(VN-\d+)([A-Z])$/)
    if (matchLetra) {
      const base = matchLetra[1]
      const letraActual = matchLetra[2]
      const siguienteLetra = String.fromCharCode(letraActual.charCodeAt(0) + 1)
      siguienteVN = `${base}${siguienteLetra}`
    } else {
      const matchBase = vnActual.match(/^VN-\d+$/)
      if (matchBase) {
        siguienteVN = `${vnActual}A`
      } else {
        const { data } = await supabase.from('fletes_nacionales').select('numero_fn').ilike('numero_fn', 'VN-%')
        let maxNum = 0
        if (data && data.length > 0) {
          data.forEach(item => {
            const numStr = item.numero_fn.replace('VN-', '').replace(/[A-Z]/g, '')
            const num = parseInt(numStr, 10)
            if (!isNaN(num) && num > maxNum) maxNum = num
          })
        }
        siguienteVN = `VN-${maxNum.toString().padStart(4, '0')}A`
      }
    }

    setOperacionGuardada(null)
    setForm({
      ...fleteAnterior,
      numero_fn: siguienteVN,
      contenedor_num: '',
      contenedor_tipo: '',
      fecha_hora: '',
      lugar_devolucion: '',
      libre_hasta: '',
      chofer: '',
      dni_chofer: '',
      telefono_chofer: '',
      patente_camion: '',
      patente_semi: ''
    })
    toast.success(`Se generó el VN correlativo: ${siguienteVN}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.numero_fn || form.numero_fn.trim() === '') {
      toast.error("¡Atención! Debes ingresar o generar un Número de Operación (VN) antes de guardar.")
      return
    }

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

    const { error } = await supabase.from('fletes_nacionales').insert([dataToSend])
     
    if (error) {
      toast.error("Error: " + error.message)
    } else { 
      toast.success("¡Operación cargada con éxito!")
      setOperacionGuardada(dataToSend)
    }
  }

  const generarPDF = async (flete: any) => {
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
      `Tipo Operación: ${flete.tipo_operacion?.toUpperCase() || ' '}`
    ]

    const hGen = drawBox("DETALLES DE LA OPERACION", datosGenerales, 15, startY, 85, 75)
    const hEquipo = drawBox("DATOS DEL EQUIPO", [
      `Chofer: ${flete.chofer || ' '}`,
      `Patente Camión: ${flete.patente_camion || ' '}`,
      `Patente Semi: ${flete.patente_semi || ' '}`
    ], 115, startY, 80, 70)

    drawBox("INSTRUCCIONES Y NOTAS", [flete.notas_adicionales || 'Sin notas adicionales.'], 15, startY + Math.max(hGen, hEquipo) + 10, 180, 170)

    doc.save(`Orden Carga ${flete.numero_fn}.pdf`)
  }

  const handleCancelar = () => {
    setForm({ ...ESTADO_INICIAL })
    toast.info("Formulario blanqueado")
  }

  if (cargandoDatos) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-48 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-10 bg-gray-200 rounded col-span-1"></div>
            <div className="h-10 bg-gray-200 rounded col-span-2"></div>
            <div className="h-10 bg-gray-200 rounded col-span-1"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-64"></div>
      </div>
    )
  }

  return (
    <>
    <form 
      onSubmit={handleSubmit} 
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault()
        }
      }}
      className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen"
    >
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Carga de Nueva Operación</h2>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="border p-2 rounded" value={form.tipo_operacion} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
            <option value="importacion">Importación/TRM</option>
            <option value="exportacion">Exportación</option>
            <option value="carga_suelta">Carga Suelta</option>
          </select>
           
          {form.tipo_operacion === 'importacion' ? (
            <div className="flex items-center gap-2 border p-2 rounded bg-white">
              <label className="text-xs text-gray-600 font-bold whitespace-nowrap">TRAM:</label>
              <select className="flex-1 outline-none text-sm" value={form.tram} onChange={e => setForm({...form, tram: e.target.value})}>
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>
          ) : <div className="hidden md:block" />}

          <div className="flex gap-2 md:col-span-2">
            <input type="text" placeholder="Nº Op. (VN-0001) *" required className="border p-2 flex-1 rounded uppercase" value={form.numero_fn} onChange={(e) => setForm({...form, numero_fn: e.target.value.toUpperCase()})} />
            <button type="button" onClick={generarVN} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded font-bold text-sm transition">Generar</button>
          </div>
           
          <input list="lista-clientes" placeholder="Seleccionar o escribir Cliente *" className="border p-2 rounded md:col-span-3" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
          <datalist id="lista-clientes">
            {clientes.filter((c: any) => c && c["Razon Social"]).map((c: any) => (
              <option key={c["Razon Social"]} value={c["Razon Social"]} />
            ))}
          </datalist>

          <input type="text" placeholder="Documento Aduanero" className="border p-2 rounded md:col-span-1" value={form.documento_aduanero} onChange={e => setForm({...form, documento_aduanero: e.target.value})} />
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.tipo_operacion === 'importacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Origen" className="border p-2 rounded" value={form.origen} onChange={e => setForm({...form, origen: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora)} onChange={e => setForm({...form, fecha_hora: e.target.value})} /></div>
              <input type="text" placeholder="Paradas" className="border p-2 rounded" value={form.paradas} onChange={e => setForm({...form, paradas: e.target.value})} />
              <input type="text" placeholder="Destino" className="border p-2 rounded" value={form.destino} onChange={e => setForm({...form, destino: e.target.value})} />
              <input type="text" placeholder="Lugar Devolución" className="border p-2 rounded" value={form.lugar_devolucion} onChange={e => setForm({...form, lugar_devolucion: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Libre Hasta</label><input type="date" className="border p-2 rounded" value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => setForm({...form, libre_hasta: e.target.value})} /></div>
            </>
          )}
          {form.tipo_operacion === 'exportacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Lugar Carga Vacío" className="border p-2 rounded" value={form.lugar_carga_vacio} onChange={e => setForm({...form, lugar_carga_vacio: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga Vacío</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={e => setForm({...form, fecha_carga_vacio: e.target.value})} /></div>
              <input type="text" placeholder="Lugar Carga Mercadería" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_carga_mercaderia} onChange={e => setForm({...form, lugar_carga_mercaderia: e.target.value})} />
              <input type="text" placeholder="Lugar Entrega Lleno" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega_lleno} onChange={e => setForm({...form, lugar_entrega_lleno: e.target.value})} />
            </>
          )}
          {form.tipo_operacion === 'carga_suelta' && (
            <>
              <input type="text" placeholder="Lugar de Carga" className="border p-2 rounded" value={form.lugar_carga} onChange={e => setForm({...form, lugar_carga: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha/Hora Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={e => setForm({...form, fecha_hora_carga: e.target.value})} /></div>
              <input type="text" placeholder="Lugar de Entrega" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega} onChange={e => setForm({...form, lugar_entrega: e.target.value})} />
              <input type="text" placeholder="Cantidad y Tipo de Bultos" className="border p-2 rounded" value={form.cantidad_bultos} onChange={e => setForm({...form, cantidad_bultos: e.target.value})} />
              <input type="text" placeholder="Peso Bruto" className="border p-2 rounded" value={form.peso_bruto} onChange={e => setForm({...form, peso_bruto: e.target.value})} />
            </>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input list="lista-choferes" placeholder="Seleccionar o escribir Chofer *" className="border p-2 rounded" value={form.chofer} onChange={e => handleChoferChange(e.target.value)} />
          <datalist id="lista-choferes">
            {choferes.filter((c: any) => c && c.CHOFER).map((c: any) => (
              <option key={c.CHOFER} value={c.CHOFER} />
            ))}
          </datalist>
          <input type="text" placeholder="DNI" className="border p-2 rounded" value={form.dni_chofer} onChange={e => setForm({...form, dni_chofer: e.target.value})} />
          <input type="text" placeholder="Teléfono" className="border p-2 rounded" value={form.telefono_chofer} onChange={e => setForm({...form, telefono_chofer: e.target.value})} />
          <div className="hidden md:block"></div>
          <input type="text" placeholder="Patente Camión" className="border p-2 rounded" value={form.patente_camion} onChange={e => setForm({...form, patente_camion: e.target.value})} />
          <input type="text" placeholder="Patente Semi" className="border p-2 rounded" value={form.patente_semi} onChange={e => setForm({...form, patente_semi: e.target.value})} />
        </div>
      </section>

      <textarea className="w-full border p-4 rounded-lg" placeholder="Notas adicionales..." value={form.notas_adicionales} onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
       
      <div className="flex flex-col gap-3">
        <button type="submit" className="w-full bg-sky-600 text-white p-4 font-bold rounded-lg hover:bg-sky-700 transition shadow-lg">Guardar Operación</button>
        <button type="button" onClick={handleCancelar} className="w-full bg-red-400 text-white p-3 font-bold rounded-lg hover:bg-red-500 transition">Cancelar</button>
      </div>
    </form>

      {/* --- CARTEL / MODAL DE ÉXITO Y PRÓXIMOS PASOS --- */}
      {operacionGuardada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
             
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 text-3xl font-bold">✓</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1">¡Operación guardada con éxito!</h3>
            <p className="text-sm text-gray-500 mb-6">
              La operación <span className="font-bold text-gray-800">{operacionGuardada.numero_fn || 'registrada'}</span> se guardó correctamente. ¿Qué te gustaría hacer ahora?
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => generarPDF(operacionGuardada)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                📥 Descargar Orden de Flete (PDF)
              </button>

              <button 
                onClick={() => handleMismoVNCorrelativo(operacionGuardada)}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 border border-indigo-200"
              >
                🔁 Abrir mismo VN correlativo (ej. VN-0007B)
              </button>

              <button 
                onClick={() => handleNuevoVNCorrelativo(false)}
                className="w-full py-2.5 px-4 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 border border-sky-200"
              >
                ➕ Abrir nuevo VN correlativo
              </button>

              <button 
                onClick={() => router.push('/')}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
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