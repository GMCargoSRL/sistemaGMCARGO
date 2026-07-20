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
      }
    }
    fetchData()
  }, [numero_fn])

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
      alert("¡Cambios guardados con éxito!")
      router.push('/')
    }
  }

  if (!form) return <div className="p-8">Cargando datos...</div>

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Editar Operación: {numero_fn}</h2>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="border p-2 rounded" value={form.tipo_operacion || 'importacion'} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
            <option value="importacion">Importación/TRM</option>
            <option value="exportacion">Exportación</option>
            <option value="carga_suelta">Carga Suelta</option>
          </select>
          
          {form.tipo_operacion === 'importacion' ? (
            <div className="flex items-center gap-2 border p-2 rounded bg-white">
              <label className="text-xs text-gray-600 font-bold whitespace-nowrap">TRAM:</label>
              <select className="flex-1 outline-none text-sm" value={form.tram || 'NO'} onChange={e => setForm({...form, tram: e.target.value})}>
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>
          ) : <div className="hidden md:block" />}

          <div className="flex gap-2 md:col-span-2">
            <input type="text" placeholder="Nº Op. (VN-0001)" className="border p-2 flex-1 rounded uppercase bg-gray-100 text-gray-500 cursor-not-allowed" value={form.numero_fn || ''} readOnly />
          </div>
          
          <input list="lista-clientes" placeholder="Seleccionar o escribir Cliente *" className="border p-2 rounded md:col-span-3" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} />
          <datalist id="lista-clientes">{clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]} />)}</datalist>

          <input type="text" placeholder="Documento Aduanero" className="border p-2 rounded md:col-span-1" value={form.documento_aduanero || ''} onChange={e => setForm({...form, documento_aduanero: e.target.value})} />
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.tipo_operacion === 'importacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num || ''} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo || ''} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Origen" className="border p-2 rounded" value={form.origen || ''} onChange={e => setForm({...form, origen: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora)} onChange={e => setForm({...form, fecha_hora: e.target.value})} /></div>
              <input type="text" placeholder="Paradas" className="border p-2 rounded" value={form.paradas || ''} onChange={e => setForm({...form, paradas: e.target.value})} />
              <input type="text" placeholder="Destino" className="border p-2 rounded" value={form.destino || ''} onChange={e => setForm({...form, destino: e.target.value})} />
              <input type="text" placeholder="Lugar Devolución" className="border p-2 rounded" value={form.lugar_devolucion || ''} onChange={e => setForm({...form, lugar_devolucion: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Libre Hasta</label><input type="date" className="border p-2 rounded" value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => setForm({...form, libre_hasta: e.target.value})} /></div>
            </>
          )}
          {form.tipo_operacion === 'exportacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num || ''} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo || ''} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Lugar Carga Vacío" className="border p-2 rounded" value={form.lugar_carga_vacio || ''} onChange={e => setForm({...form, lugar_carga_vacio: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga Vacío</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={e => setForm({...form, fecha_carga_vacio: e.target.value})} /></div>
              <input type="text" placeholder="Lugar Carga Mercadería" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_carga_mercaderia || ''} onChange={e => setForm({...form, lugar_carga_mercaderia: e.target.value})} />
              <input type="text" placeholder="Lugar Entrega Lleno" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega_lleno || ''} onChange={e => setForm({...form, lugar_entrega_lleno: e.target.value})} />
            </>
          )}
          {form.tipo_operacion === 'carga_suelta' && (
            <>
              <input type="text" placeholder="Lugar de Carga" className="border p-2 rounded" value={form.lugar_carga || ''} onChange={e => setForm({...form, lugar_carga: e.target.value})} />
              <div className="flex flex-col"><label className="text-[10px] uppercase font-bold text-gray-400">Fecha/Hora Carga</label><input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={e => setForm({...form, fecha_hora_carga: e.target.value})} /></div>
              <input type="text" placeholder="Lugar de Entrega" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega || ''} onChange={e => setForm({...form, lugar_entrega: e.target.value})} />
              <input type="text" placeholder="Cantidad y Tipo de Bultos" className="border p-2 rounded" value={form.cantidad_bultos || ''} onChange={e => setForm({...form, cantidad_bultos: e.target.value})} />
              <input type="text" placeholder="Peso Bruto" className="border p-2 rounded" value={form.peso_bruto || ''} onChange={e => setForm({...form, peso_bruto: e.target.value})} />
            </>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input list="lista-choferes" placeholder="Seleccionar o escribir Chofer *" className="border p-2 rounded" value={form.chofer || ''} onChange={e => handleChoferChange(e.target.value)} />
          <datalist id="lista-choferes">{choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER} />)}</datalist>
          <input type="text" placeholder="DNI" className="border p-2 rounded" value={form.dni_chofer || ''} onChange={e => setForm({...form, dni_chofer: e.target.value})} />
          <input type="text" placeholder="Teléfono" className="border p-2 rounded" value={form.telefono_chofer || ''} onChange={e => setForm({...form, telefono_chofer: e.target.value})} />
          <div className="hidden md:block"></div>
          <input type="text" placeholder="Patente Camión" className="border p-2 rounded" value={form.patente_camion || ''} onChange={e => setForm({...form, patente_camion: e.target.value})} />
          <input type="text" placeholder="Patente Semi" className="border p-2 rounded" value={form.patente_semi || ''} onChange={e => setForm({...form, patente_semi: e.target.value})} />
        </div>
      </section>

      <textarea className="w-full border p-4 rounded-lg" placeholder="Notas adicionales..." value={form.notas_adicionales || ''} onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
      
      <div className="flex flex-col gap-3">
        <button type="submit" className="w-full bg-sky-600 text-white p-4 font-bold rounded-lg hover:bg-sky-700 transition shadow-lg">Guardar Cambios</button>
        <button type="button" onClick={() => router.push('/')} className="w-full bg-red-400 text-white p-3 font-bold rounded-lg hover:bg-red-500 transition">Cancelar</button>
      </div>
    </form>
  )
}