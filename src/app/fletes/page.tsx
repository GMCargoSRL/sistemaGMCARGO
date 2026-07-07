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
    numero_fn: '', cliente: '', chofer: '', contenedor_num: '', 
    contenedor_tipo: '', origen: '', fecha_hora: '', 
    paradas: '', destino: '', patente_camion: '', patente_semi: '',
    lugar_devolucion: '', libre_hasta: '',
    notas_adicionales: '' 
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

    // 1. VALIDACIÓN OBLIGATORIA
    if (!form.cliente || !form.chofer) {
      alert("Por favor, selecciona un Cliente y un Chofer para continuar.")
      return
    }

    // 2. LIMPIEZA: Convertimos strings vacíos a null para el resto
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
      // Opcional: recargar la página o limpiar el formulario
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Carga de Nueva Operación</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Número de FN" className="border p-2" onChange={(e) => setForm({...form, numero_fn: e.target.value})} />
        
        {/* SELECTS OBLIGATORIOS: Añadimos 'required' en el HTML */}
        <select required className="border p-2 rounded" onChange={e => setForm({...form, cliente: e.target.value})}>
          <option value="">Seleccionar Cliente *</option>
          {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
        </select>

        <select required className="border p-2 rounded" onChange={e => setForm({...form, chofer: e.target.value})}>
          <option value="">Seleccionar Chofer *</option>
          {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
        </select>

        {/* RESTO DE CAMPOS: Sin 'required', son opcionales */}
        <input type="text" placeholder="Nº Contenedor" className="border p-2" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
        <input type="text" placeholder="Tipo de Contenedor" className="border p-2" onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} />
        <input type="text" placeholder="Origen" className="border p-2" onChange={(e) => setForm({...form, origen: e.target.value})} />
        <input type="datetime-local" className="border p-2" onChange={(e) => setForm({...form, fecha_hora: e.target.value})} />
        <input type="text" placeholder="Patente Camión" className="border p-2" onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        <input type="text" placeholder="Patente Semi" className="border p-2" onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
      </div>

      <input type="text" placeholder="Paradas" className="w-full border p-2" onChange={(e) => setForm({...form, paradas: e.target.value})} />
      <input type="text" placeholder="Destino" className="w-full border p-2" onChange={(e) => setForm({...form, destino: e.target.value})} />
      <input type="text" placeholder="Lugar Devolucion" className="w-full border p-2" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} />
      
      <label className="block text-sm font-bold">Fecha Devolucion:</label>
      <input type="datetime-local" className="border p-2" onChange={(e) => setForm({...form, libre_hasta: e.target.value})} />
      
      <label className="block text-sm font-bold">Notas Adicionales:</label>
      <textarea className="w-full border p-2 h-24" onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />

      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold text-lg rounded shadow-lg hover:bg-blue-700">
        Guardar Operación
      </button>
    </form>
  )
}