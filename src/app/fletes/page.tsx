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

const formatDateTimeLocal = (dateString: string) => dateString ? dateString.substring(0, 16) : '';

export default function FletesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientes, setClientes] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [form, setForm] = useState({ ...ESTADO_INICIAL })

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
    setForm({ 
      ...form, 
      chofer: nombreChofer, 
      // Solo autocompletar si encontramos el chofer en la lista
      dni_chofer: choferSeleccionado ? choferSeleccionado["DOC. ID."] : form.dni_chofer 
    })
  }

  const generarVN = async () => {
    const { data } = await supabase.from('fletes_nacionales').select('numero_fn').ilike('numero_fn', 'VN-%')
    let maxNum = 0
    if (data && data.length > 0) {
      data.forEach(item => {
        const num = parseInt(item.numero_fn.replace('VN-', ''), 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      })
    }
    setForm({ ...form, numero_fn: `VN-${(maxNum + 1).toString().padStart(4, '0')}` })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').insert([form])
    if (error) alert("Error: " + error.message)
    else { alert("¡Operación cargada con éxito!"); setForm({ ...ESTADO_INICIAL }) }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Carga de Nueva Operación</h2>

      {/* DATOS DE OPERACIÓN */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="border p-2 rounded" value={form.tipo_operacion} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
            <option value="importacion">Contenedor de Importación/TRM</option>
            <option value="exportacion">Contenedor de Exportación</option>
            <option value="carga_suelta">Carga Suelta</option>
          </select>
          <div className="flex gap-2">
            <input type="text" placeholder="Nº Op. (VN-0001)" className="border p-2 flex-1 rounded uppercase" value={form.numero_fn} onChange={(e) => setForm({...form, numero_fn: e.target.value.toUpperCase()})} />
            <button type="button" onClick={generarVN} className="bg-indigo-600 text-white px-3 rounded font-bold text-sm">Generar</button>
          </div>
          
          <input 
            list="lista-clientes" 
            placeholder="Seleccionar o escribir Cliente *" 
            className="border p-2 rounded" 
            value={form.cliente} 
            onChange={e => setForm({...form, cliente: e.target.value})} 
          />
          <datalist id="lista-clientes">
            {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]} />)}
          </datalist>

          <input type="text" placeholder="Documento Aduanero" className="border p-2 rounded" value={form.documento_aduanero} onChange={e => setForm({...form, documento_aduanero: e.target.value})} />
        </div>
      </section>

      {/* DETALLES DE LA CARGA */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {form.tipo_operacion === 'importacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Origen" className="border p-2 rounded" value={form.origen} onChange={e => setForm({...form, origen: e.target.value})} />
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga</label>
                <input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora)} onChange={e => setForm({...form, fecha_hora: e.target.value})} />
              </div>
              <input type="text" placeholder="Paradas" className="border p-2 rounded" value={form.paradas} onChange={e => setForm({...form, paradas: e.target.value})} />
              <input type="text" placeholder="Destino" className="border p-2 rounded" value={form.destino} onChange={e => setForm({...form, destino: e.target.value})} />
              <input type="text" placeholder="Lugar Devolución" className="border p-2 rounded" value={form.lugar_devolucion} onChange={e => setForm({...form, lugar_devolucion: e.target.value})} />
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-gray-400">Libre Hasta</label>
                <input type="date" className="border p-2 rounded" value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => setForm({...form, libre_hasta: e.target.value})} />
              </div>
            </>
          )}

          {form.tipo_operacion === 'exportacion' && (
            <>
              <input type="text" placeholder="Nº Contenedor" className="border p-2 rounded" value={form.contenedor_num} onChange={e => setForm({...form, contenedor_num: e.target.value})} />
              <input type="text" placeholder="Tipo Contenedor" className="border p-2 rounded" value={form.contenedor_tipo} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
              <input type="text" placeholder="Lugar Carga Vacío" className="border p-2 rounded" value={form.lugar_carga_vacio} onChange={e => setForm({...form, lugar_carga_vacio: e.target.value})} />
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-gray-400">Fecha Carga Vacío</label>
                <input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_carga_vacio)} onChange={e => setForm({...form, fecha_carga_vacio: e.target.value})} />
              </div>
              <input type="text" placeholder="Lugar Carga Mercadería" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_carga_mercaderia} onChange={e => setForm({...form, lugar_carga_mercaderia: e.target.value})} />
              <input type="text" placeholder="Lugar Entrega Lleno" className="border p-2 rounded col-span-1 md:col-span-2" value={form.lugar_entrega_lleno} onChange={e => setForm({...form, lugar_entrega_lleno: e.target.value})} />
            </>
          )}

          {form.tipo_operacion === 'carga_suelta' && (
            <>
              <input type="text" placeholder="Lugar de Carga" className="border p-2 rounded" value={form.lugar_carga} onChange={e => setForm({...form, lugar_carga: e.target.value})} />
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-gray-400">Fecha/Hora Carga</label>
                <input type="datetime-local" className="border p-2 rounded" value={formatDateTimeLocal(form.fecha_hora_carga)} onChange={e => setForm({...form, fecha_hora_carga: e.target.value})} />
              </div>
              <input type="text" placeholder="Lugar de Entrega" className="border p-2 rounded" value={form.lugar_entrega} onChange={e => setForm({...form, lugar_entrega: e.target.value})} />
              <input type="text" placeholder="Cantidad y Tipo de Bultos" className="border p-2 rounded" value={form.cantidad_bultos} onChange={e => setForm({...form, cantidad_bultos: e.target.value})} />
              <input type="text" placeholder="Peso Bruto" className="border p-2 rounded" value={form.peso_bruto} onChange={e => setForm({...form, peso_bruto: e.target.value})} />
            </>
          )}
        </div>
      </section>

      {/* CHOFER Y UNIDAD */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            list="lista-choferes" 
            placeholder="Seleccionar o escribir Chofer *" 
            className="border p-2 rounded" 
            value={form.chofer} 
            onChange={e => handleChoferChange(e.target.value)} 
          />
          <datalist id="lista-choferes">
            {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER} />)}
          </datalist>

          {/* DNI EDITABLE */}
          <input 
            type="text" 
            placeholder="DNI" 
            className="border p-2 rounded" 
            value={form.dni_chofer} 
            onChange={e => setForm({...form, dni_chofer: e.target.value})} 
          />

          <input type="text" placeholder="Teléfono del Chofer" className="border p-2 rounded" value={form.telefono_chofer} onChange={e => setForm({...form, telefono_chofer: e.target.value})} />
          <div /> 
          <input type="text" placeholder="Patente Camión" className="border p-2 rounded" value={form.patente_camion} onChange={e => setForm({...form, patente_camion: e.target.value})} />
          <input type="text" placeholder="Patente Semi" className="border p-2 rounded" value={form.patente_semi} onChange={e => setForm({...form, patente_semi: e.target.value})} />
        </div>
      </section>

      <textarea className="w-full border p-4 rounded-lg" placeholder="Notas adicionales..." value={form.notas_adicionales} onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
      <button type="submit" className="w-full bg-sky-600 text-white p-4 font-bold rounded-lg hover:bg-sky-700 transition shadow-lg">Guardar Operación</button>
    </form>
  )
}