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
  notas_facturacion: '',
  lugar_carga_vacio: '', fecha_carga_vacio: '',
  lugar_carga_mercaderia: '', lugar_entrega_lleno: '',
  lugar_carga: '', fecha_hora_carga: '', documento_aduanero: '', 
  cantidad_bultos: '', peso_bruto: '', lugar_entrega: '',
  tipo_operacion: 'importacion',
  tram: 'NO',
  estado_facturacion: 'SI'
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

  // Estados para el control del cartel de advertencia al salir sin guardar
  const [mostrarAvisoSalida, setMostrarAvisoSalida] = useState(false)
  const [rutaPendiente, setRutaPendiente] = useState<string | null>(null)

  const hayDatosCargados = Object.entries(form).some(([key, value]) => {
    if (key === 'tipo_operacion') return value !== 'importacion'
    if (key === 'tram') return value !== 'NO'
    if (key === 'estado_facturacion') return value !== 'SI'
    return value !== ''
  })

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hayDatosCargados && !operacionGuardada) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hayDatosCargados, operacionGuardada])

  // Intercepta enlaces internos para advertir cambios sin guardar
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (target && hayDatosCargados && !operacionGuardada) {
        const href = target.getAttribute('href')
        if (href && (href.startsWith('/') || href.startsWith('.'))) {
          e.preventDefault()
          setRutaPendiente(href)
          setMostrarAvisoSalida(true)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => document.removeEventListener('click', handleAnchorClick, true)
  }, [hayDatosCargados, operacionGuardada])

  const confirmarSalidaSinGuardar = () => {
    setMostrarAvisoSalida(false)
    router.push(rutaPendiente || '/')
  }

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

  // Estilos reutilizables optimizados para máxima legibilidad
  const inputClass = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-colors text-sm font-sans"
  const selectClass = "w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-colors text-sm font-sans cursor-pointer"
  const labelClass = "text-[11px] uppercase font-bold text-gray-600 dark:text-slate-300 mb-1 font-sans"

  if (cargandoDatos) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-pulse font-sans">
        <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 h-48 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded col-span-1"></div>
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded col-span-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded col-span-1"></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 h-64"></div>
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
      className="p-8 max-w-4xl mx-auto space-y-8 bg-transparent transition-colors duration-300 font-sans"
    >
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b border-gray-200 dark:border-slate-800 pb-4">
        Carga de Nueva Operación
      </h2>

      {/* SECCIÓN 1: DATOS DE OPERACIÓN */}
      <section className="bg-white dark:bg-slate-900/90 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
        <h3 className="font-bold text-sky-700 dark:text-sky-400 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className={selectClass} value={form.tipo_operacion} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
            <option value="importacion" className="dark:bg-slate-800 dark:text-slate-100">Importación/TRM</option>
            <option value="exportacion" className="dark:bg-slate-800 dark:text-slate-100">Exportación</option>
            <option value="carga_suelta" className="dark:bg-slate-800 dark:text-slate-100">Carga Suelta</option>
          </select>
            
          {form.tipo_operacion === 'importacion' ? (
            <div className="flex items-center gap-2 border border-gray-300 dark:border-slate-600 p-2.5 rounded-lg bg-white dark:bg-slate-800">
              <label className="text-xs text-gray-700 dark:text-slate-200 font-bold whitespace-nowrap">TRAM:</label>
              <select className="flex-1 outline-none text-sm bg-transparent cursor-pointer text-slate-900 dark:text-slate-100 font-sans" value={form.tram} onChange={e => setForm({...form, tram: e.target.value})}>
                <option value="NO" className="dark:bg-slate-800 dark:text-slate-100">NO</option>
                <option value="SI" className="dark:bg-slate-800 dark:text-slate-100">SI</option>
              </select>
            </div>
          ) : <div className="hidden md:block" />}

          <div className="flex gap-2 md:col-span-2">
            <input type="text" placeholder="Nº Op. (VN-0001) *" required className={`${inputClass} flex-1 uppercase`} value={form.numero_fn} onChange={(e) => setForm({...form, numero_fn: e.target.value.toUpperCase()})} />
            <button type="button" onClick={generarVN} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-lg font-bold text-sm transition cursor-pointer shadow-sm">Generar</button>
          </div>
            
          <input list="lista-clientes" placeholder="Seleccionar o escribir Cliente *" className={`${inputClass} md:col-span-2`} value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
          <datalist id="lista-clientes">
            {clientes.filter((c: any) => c && c["Razon Social"]).map((c: any) => (
              <option key={c["Razon Social"]} value={c["Razon Social"]} />
            ))}
          </datalist>

          <input type="text" placeholder="Documento Aduanero" className={`${inputClass} md:col-span-1`} value={form.documento_aduanero} onChange={e => setForm({...form, documento_aduanero: e.target.value})} />
          
          <div className="flex items-center justify-between gap-1 border border-gray-300 dark:border-slate-600 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 md:col-span-1">
            <span className="text-[13px] text-gray-700 dark:text-slate-300 font-medium">¿Se Factura?</span>
            <select className="outline-none text-sm bg-transparent cursor-pointer font-bold text-right text-slate-900 dark:text-slate-100 font-sans" value={form.estado_facturacion} onChange={e => setForm({...form, estado_facturacion: e.target.value})}>
              <option value="SI" className="dark:bg-slate-800 dark:text-slate-100">SI</option>
              <option value="NO" className="dark:bg-slate-800 dark:text-slate-100">NO</option>
              <option value="FACTURADO" className="dark:bg-slate-800 dark:text-slate-100">FACTURADO</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: DETALLES DE LA CARGA */}
      <section className="bg-white dark:bg-slate-900/90 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
        <h3 className="font-bold text-sky-700 dark:text-sky-400 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.tipo_operacion === 'importacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className={inputClass} value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className={inputClass} value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Origen" className={inputClass} value={form.origen} onChange={e => setForm({...form, origen: e.target.value})} />
              <div className="flex flex-col"><label className={labelClass}>Fecha Carga</label><input type="datetime-local" className={inputClass} value={formatDateTimeLocal(form.fecha_hora)} onChange={e => setForm({...form, fecha_hora: e.target.value})} /></div>
              <input type="text" placeholder="Paradas" className={inputClass} value={form.paradas} onChange={e => setForm({...form, paradas: e.target.value})} />
              <input type="text" placeholder="Destino" className={inputClass} value={form.destino} onChange={e => setForm({...form, destino: e.target.value})} />
              <input type="text" placeholder="Lugar Devolución" className={inputClass} value={form.lugar_devolucion} onChange={e => setForm({...form, lugar_devolucion: e.target.value})} />
              <div className="flex flex-col"><label className={labelClass}>Libre Hasta</label><input type="date" className={inputClass} value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => setForm({...form, libre_hasta: e.target.value})} /></div>
            </>
          )}
          {form.tipo_operacion === 'exportacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className={inputClass} value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className={inputClass} value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Lugar Carga Vacío" className={inputClass} value={form.lugar_carga_vacio} onChange={e => setForm({...form, lugar_carga_vacio: e.target.value})} />
              <div className="flex flex-col"><label className={labelClass}>Fecha Carga Vacío</label><input type="datetime-local" className={inputClass} value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={e => setForm({...form, fecha_carga_vacio: e.target.value})} /></div>
              <input type="text" placeholder="Lugar Carga Mercadería" className={`${inputClass} col-span-1 md:col-span-2`} value={form.lugar_carga_mercaderia} onChange={e => setForm({...form, lugar_carga_mercaderia: e.target.value})} />
              <input type="text" placeholder="Lugar Entrega Lleno" className={`${inputClass} col-span-1 md:col-span-2`} value={form.lugar_entrega_lleno} onChange={e => setForm({...form, lugar_entrega_lleno: e.target.value})} />
            </>
          )}
          {form.tipo_operacion === 'carga_suelta' && (
            <>
              <input type="text" placeholder="Lugar de Carga" className={inputClass} value={form.lugar_carga} onChange={e => setForm({...form, lugar_carga: e.target.value})} />
              <div className="flex flex-col"><label className={labelClass}>Fecha/Hora Carga</label><input type="datetime-local" className={inputClass} value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={e => setForm({...form, fecha_hora_carga: e.target.value})} /></div>
              <input type="text" placeholder="Lugar de Entrega" className={`${inputClass} col-span-1 md:col-span-2`} value={form.lugar_entrega} onChange={e => setForm({...form, lugar_entrega: e.target.value})} />
              <input type="text" placeholder="Cantidad y Tipo de Bultos" className={inputClass} value={form.cantidad_bultos} onChange={e => setForm({...form, cantidad_bultos: e.target.value})} />
              <input type="text" placeholder="Peso Bruto" className={inputClass} value={form.peso_bruto} onChange={e => setForm({...form, peso_bruto: e.target.value})} />
            </>
          )}
        </div>
      </section>

      {/* SECCIÓN 3: CHOFER Y UNIDAD */}
      <section className="bg-white dark:bg-slate-900/90 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
        <h3 className="font-bold text-sky-700 dark:text-sky-400 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input list="lista-choferes" placeholder="Seleccionar o escribir Chofer *" className={inputClass} value={form.chofer} onChange={e => handleChoferChange(e.target.value)} />
          <datalist id="lista-choferes">
            {choferes.filter((c: any) => c && c.CHOFER).map((c: any) => (
              <option key={c.CHOFER} value={c.CHOFER} />
            ))}
          </datalist>
          <input type="text" placeholder="DNI" className={inputClass} value={form.dni_chofer} onChange={e => setForm({...form, dni_chofer: e.target.value})} />
          <input type="text" placeholder="Teléfono" className={inputClass} value={form.telefono_chofer} onChange={e => setForm({...form, telefono_chofer: e.target.value})} />
          <div className="hidden md:block"></div>
          <input type="text" placeholder="Patente Camión" className={inputClass} value={form.patente_camion} onChange={e => setForm({...form, patente_camion: e.target.value})} />
          <input type="text" placeholder="Patente Semi" className={inputClass} value={form.patente_semi} onChange={e => setForm({...form, patente_semi: e.target.value})} />
        </div>
      </section>

      <textarea className={inputClass} rows={3} placeholder="Notas adicionales..." value={form.notas_adicionales} onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
      
      <textarea className={inputClass} rows={3} placeholder="Notas de facturación..." value={form.notas_facturacion} onChange={(e) => setForm({...form, notas_facturacion: e.target.value})} />
        
      <div className="flex flex-col gap-3">
        <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white p-4 font-bold rounded-xl transition shadow-lg cursor-pointer">Guardar Operación</button>
        <button type="button" onClick={handleCancelar} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 p-3 font-bold rounded-xl transition cursor-pointer">Cancelar</button>
      </div>
    </form>

      {/* --- CARTEL DE ADVERTENCIA: CAMBIOS SIN GUARDAR --- */}
      {mostrarAvisoSalida && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 dark:border-slate-800 text-center">
            
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 dark:text-amber-400 text-3xl font-bold">⚠️</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">¡Atención! Tienes cambios sin guardar</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
              Si sales ahora sin guardar, perderás todos los datos ingresados en esta nueva operación.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setMostrarAvisoSalida(false)}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
              >
                Continuar cargando
              </button>
              
              <button 
                onClick={confirmarSalidaSinGuardar}
                className="w-full py-3 px-4 bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CARTEL / MODAL DE ÉXITO Y PRÓXIMOS PASOS --- */}
      {operacionGuardada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 dark:border-slate-800 text-center animate-in fade-in zoom-in duration-200">
              
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 dark:text-emerald-400 text-3xl font-bold">✓</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">¡Operación guardada con éxito!</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
              La operación <span className="font-bold text-slate-900 dark:text-slate-100">{operacionGuardada.numero_fn || 'registrada'}</span> se guardó correctamente. ¿Qué te gustaría hacer ahora?
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => generarPDF(operacionGuardada)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                📥 Descargar Orden de Flete (PDF)
              </button>

              <button 
                onClick={() => handleMismoVNCorrelativo(operacionGuardada)}
                className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800/50 cursor-pointer"
              >
                🔁 Abrir mismo VN correlativo (ej. VN-0007B)
              </button>

              <button 
                onClick={() => handleNuevoVNCorrelativo(false)}
                className="w-full py-2.5 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 border border-sky-200 dark:border-sky-800/50 cursor-pointer"
              >
                ➕ Abrir nuevo VN correlativo
              </button>

              <button 
                onClick={() => router.push('/')}
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
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