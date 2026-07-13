'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function FletesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientes, setClientes] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [form, setForm] = useState({ 
    numero_fn: '', cliente: '', chofer: '', telefono_chofer: '', contenedor_num: '', 
    contenedor_tipo: '', origen: '', fecha_hora: '', 
    paradas: '', destino: '', patente_camion: '', patente_semi: '',
    lugar_devolucion: '', libre_hasta: '',
    notas_adicionales: '',
    lugar_carga_vacio: '', fecha_carga_vacio: '',
    lugar_carga_mercaderia: '', lugar_entrega_lleno: '',
    lugar_carga: '', fecha_hora_carga: '', documento_aduanero: '', 
    cantidad_bultos: '', peso_bruto: '', lugar_entrega: '',
    tipo_operacion: 'importacion'
  })

  useEffect(() => {
    async function fetchData() {
      const { data: c } = await supabase.from('choferes').select('CHOFER')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      if (c) setChoferes(c)
      if (cl) setClientes(cl)
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente || !form.chofer) {
      alert("Por favor, selecciona un Cliente y un Chofer para continuar.")
      return
    }

    const datosLimpio = { ...form }
    Object.keys(datosLimpio).forEach(key => {
      if (datosLimpio[key as keyof typeof datosLimpio] === '') {
        datosLimpio[key as keyof typeof datosLimpio] = null as any
      }
    })

    const { error } = await supabase.from('fletes_nacionales').insert([datosLimpio])
    if (error) {
      alert("Error en la base de datos: " + error.message)
    } else {
      alert("¡Operación cargada con éxito!")
    }
  }

  const renderCamposSegunTipo = () => {
    // ... (el resto de tu lógica de renderizado se mantiene igual)
    if (form.tipo_operacion === 'importacion') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Nº Contenedor" className="border p-2" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
          <input type="text" placeholder="Tipo de Contenedor" className="border p-2" onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} />
          <input type="text" placeholder="Origen" className="border p-2" onChange={(e) => setForm({...form, origen: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Fecha de Carga</label>
            <input type="datetime-local" className="w-full border p-2" onChange={(e) => setForm({...form, fecha_hora: e.target.value})} />
          </div>
          <input type="text" placeholder="Paradas" className="border p-2" onChange={(e) => setForm({...form, paradas: e.target.value})} />
          <input type="text" placeholder="Destino" className="border p-2" onChange={(e) => setForm({...form, destino: e.target.value})} />
          <input type="text" placeholder="Lugar Devolucion" className="border p-2" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} />
          <div>
            <label className="text-xs font-bold text-slate-500">Libre Hasta</label>
            <input type="datetime-local" className="w-full border p-2" onChange={(e) => setForm({...form, libre_hasta: e.target.value})} />
          </div>
        </div>
      )
    }
    // (Asegúrate de copiar el resto de bloques de exportacion y carga_suelta aquí)
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Carga de Nueva Operación</h2>
      
      <div className="bg-sky-50 p-4 rounded border border-sky-200">
        <label className="block text-sm font-bold mb-2">Tipo de Operación *</label>
        <select 
          required 
          className="w-full border p-2 rounded" 
          value={form.tipo_operacion}
          onChange={e => setForm({...form, tipo_operacion: e.target.value})}
        >
          <option value="importacion">Contenedor de Importación/TRM</option>
          <option value="exportacion">Contenedor de Exportación</option>
          <option value="carga_suelta">Carga Suelta</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Número de FN" className="border p-2" onChange={(e) => setForm({...form, numero_fn: e.target.value})} />
        <select required className="border p-2 rounded" onChange={e => setForm({...form, cliente: e.target.value})}>
          <option value="">Seleccionar Cliente *</option>
          {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
        </select>
        <select required className="border p-2 rounded" onChange={e => setForm({...form, chofer: e.target.value})}>
          <option value="">Seleccionar Chofer *</option>
          {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
        </select>
        
        {/* NUEVO CAMPO */}
        <input type="text" placeholder="Teléfono del Chofer" className="border p-2" onChange={(e) => setForm({...form, telefono_chofer: e.target.value})} />
        
        <input type="text" placeholder="Documento Aduanero" className="border p-2" onChange={(e) => setForm({...form, documento_aduanero: e.target.value})} />
        <input type="text" placeholder="Patente Camión" className="border p-2" onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        <input type="text" placeholder="Patente Semi" className="border p-2" onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
      </div>

      {renderCamposSegunTipo()}

      <label className="block text-sm font-bold">Notas Adicionales:</label>
      <textarea className="w-full border p-2 h-24" onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />

      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold text-lg rounded shadow-lg hover:bg-blue-700">
        Guardar Operación
      </button>
    </form>
  )
}