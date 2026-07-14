'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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

// Función para limpiar la fecha y evitar el ajuste de zona horaria (UTC)
const formatDateTimeLocal = (dateString: string) => {
  if (!dateString) return '';
  return dateString.substring(0, 16);
};

export default function FletesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientes, setClientes] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [form, setForm] = useState({ ...ESTADO_INICIAL })
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)

  const tieneCambiosSinGuardar = () => {
    return Object.keys(form).some(key => {
      const valorActual = form[key as keyof typeof form];
      const valorInicial = ESTADO_INICIAL[key as keyof typeof ESTADO_INICIAL];
      return valorActual !== valorInicial;
    });
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tieneCambiosSinGuardar() && !guardadoExitoso) {
        e.preventDefault()
        e.returnValue = '¿Seguro que quieres salir? Los cambios no guardados se perderán.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form, guardadoExitoso])

  useEffect(() => {
    async function fetchData() {
      const { data: c } = await supabase.from('choferes').select('CHOFER, "DOC. ID."')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      if (c) setChoferes(c)
      if (cl) setClientes(cl)
    }
    fetchData()
  }, [])

  const handleChoferChange = (nombreChofer: string) => {
    const choferSeleccionado = choferes.find(c => c.CHOFER === nombreChofer)
    const dni = choferSeleccionado ? choferSeleccionado["DOC. ID."] : ''
    setForm({ ...form, chofer: nombreChofer, dni_chofer: dni || '' })
  }

  const generarVN = async () => {
    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('numero_fn')
      .ilike('numero_fn', 'VN-%')

    if (error) {
      alert("Error al buscar el correlativo: " + error.message)
      return
    }

    let maxNum = 0
    if (data && data.length > 0) {
      data.forEach(item => {
        const numPart = item.numero_fn.replace('VN-', '')
        const num = parseInt(numPart, 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      })
    }
    const nextNum = maxNum + 1
    const nextVN = `VN-${nextNum.toString().padStart(4, '0')}`
    setForm({ ...form, numero_fn: nextVN })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente || !form.chofer) {
      alert("Por favor, selecciona un Cliente y un Chofer.")
      return
    }
    const datosLimpio = { ...form }
    Object.keys(datosLimpio).forEach(key => {
      if (datosLimpio[key as keyof typeof datosLimpio] === '') datosLimpio[key as keyof typeof datosLimpio] = null as any
    })
    const { error } = await supabase.from('fletes_nacionales').insert([datosLimpio])
    if (error) {
      alert("Error en la base de datos: " + error.message)
    } else {
      setGuardadoExitoso(true)
      alert("¡Operación cargada con éxito!")
      setForm({ ...ESTADO_INICIAL })
      setGuardadoExitoso(false)
    }
  }

  const renderCamposSegunTipo = () => {
    if (form.tipo_operacion === 'importacion') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Nº Contenedor" className="border p-2" value={form.contenedor_num} onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
          <input type="text" placeholder="Tipo de Contenedor" className="border p-2" value={form.contenedor_tipo} onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} />
          <input type="text" placeholder="Origen" className="border p-2" value={form.origen} onChange={(e) => setForm({...form, origen: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Fecha de Carga</label>
            <input type="datetime-local" className="w-full border p-2" value={formatDateTimeLocal(form.fecha_hora)} onChange={(e) => setForm({...form, fecha_hora: e.target.value})} />
          </div>
          <input type="text" placeholder="Paradas" className="border p-2" value={form.paradas} onChange={(e) => setForm({...form, paradas: e.target.value})} />
          <input type="text" placeholder="Destino" className="border p-2" value={form.destino} onChange={(e) => setForm({...form, destino: e.target.value})} />
          <input type="text" placeholder="Lugar Devolucion" className="border p-2" value={form.lugar_devolucion} onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Libre Hasta</label>
            <input type="datetime-local" className="w-full border p-2" value={formatDateTimeLocal(form.libre_hasta)} onChange={(e) => setForm({...form, libre_hasta: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">¿Es TRAM?</label>
            <select className="w-full border p-2 rounded" value={form.tram} onChange={(e) => setForm({...form, tram: e.target.value})}>
              <option value="NO">NO</option>
              <option value="SI">SI</option>
            </select>
          </div>
        </div>
      )
    }
    if (form.tipo_operacion === 'exportacion') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Lugar Carga Vacío" className="border p-2" value={form.lugar_carga_vacio} onChange={(e) => setForm({...form, lugar_carga_vacio: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Fecha Carga Vacío</label>
            <input type="datetime-local" className="w-full border p-2" value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={(e) => setForm({...form, fecha_carga_vacio: e.target.value})} />
          </div>
          <input type="text" placeholder="Lugar Carga Mercadería" className="border p-2" value={form.lugar_carga_mercaderia} onChange={(e) => setForm({...form, lugar_carga_mercaderia: e.target.value})} />
          <input type="text" placeholder="Lugar Entrega Lleno" className="border p-2" value={form.lugar_entrega_lleno} onChange={(e) => setForm({...form, lugar_entrega_lleno: e.target.value})} />
        </div>
      )
    }
    if (form.tipo_operacion === 'carga_suelta') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Lugar de Carga" className="border p-2" value={form.lugar_carga} onChange={(e) => setForm({...form, lugar_carga: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Fecha/Hora Carga</label>
            <input type="datetime-local" className="w-full border p-2" value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={(e) => setForm({...form, fecha_hora_carga: e.target.value})} />
          </div>
          <input type="text" placeholder="Lugar de Entrega" className="border p-2" value={form.lugar_entrega} onChange={(e) => setForm({...form, lugar_entrega: e.target.value})} />
          <input type="text" placeholder="Cantidad y Tipo de Bultos" className="border p-2" value={form.cantidad_bultos} onChange={(e) => setForm({...form, cantidad_bultos: e.target.value})} />
          <input type="text" placeholder="Peso Bruto" className="border p-2" value={form.peso_bruto} onChange={(e) => setForm({...form, peso_bruto: e.target.value})} />
        </div>
      )
    }
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Carga de Nueva Operación</h2>
      <div className="bg-sky-50 p-4 rounded border border-sky-200">
        <label className="block text-sm font-bold mb-2">Tipo de Operación *</label>
        <select required className="w-full border p-2 rounded" value={form.tipo_operacion} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
          <option value="importacion">Contenedor de Importación/TRM</option>
          <option value="exportacion">Contenedor de Exportación</option>
          <option value="carga_suelta">Carga Suelta</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-2 w-full">
          <input type="text" placeholder="Nº Op. (Ej: FN-1234)" className="border p-2 flex-1 rounded uppercase placeholder:normal-case" value={form.numero_fn} onChange={(e) => setForm({...form, numero_fn: e.target.value.toUpperCase()})} required />
          <button type="button" onClick={generarVN} className="bg-indigo-600 text-white px-3 py-2 rounded font-bold text-sm shadow hover:bg-indigo-700 transition">Generar VN</button>
        </div>
        <select required className="border p-2 rounded" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})}>
          <option value="">Seleccionar Cliente *</option>
          {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
        </select>
        <select required className="border p-2 rounded" value={form.chofer} onChange={e => handleChoferChange(e.target.value)}>
          <option value="">Seleccionar Chofer *</option>
          {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
        </select>
        <input type="text" placeholder="DNI Chofer" className="border p-2 bg-gray-50" value={form.dni_chofer} onChange={(e) => setForm({...form, dni_chofer: e.target.value})} />
        <input type="text" placeholder="Teléfono del Chofer" className="border p-2" value={form.telefono_chofer} onChange={(e) => setForm({...form, telefono_chofer: e.target.value})} />
        <input type="text" placeholder="Documento Aduanero" className="border p-2" value={form.documento_aduanero} onChange={(e) => setForm({...form, documento_aduanero: e.target.value})} />
        <input type="text" placeholder="Patente Camión" className="border p-2" value={form.patente_camion} onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        <input type="text" placeholder="Patente Semi" className="border p-2" value={form.patente_semi} onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
      </div>
      {renderCamposSegunTipo()}
      <label className="block text-sm font-bold">Notas Adicionales:</label>
      <textarea className="w-full border p-2 h-24" value={form.notas_adicionales} onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold text-lg rounded shadow-lg hover:bg-blue-700">Guardar Operación</button>
    </form>
  )
}