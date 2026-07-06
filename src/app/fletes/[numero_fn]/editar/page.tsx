'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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
  const [form, setForm] = useState<any>(null) // null mientras carga

  useEffect(() => {
    async function fetchData() {
      // 1. Cargar listas para los desplegables
      const { data: c } = await supabase.from('choferes').select('CHOFER')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      
      // 2. Cargar los datos del flete actual
      const { data: flete } = await supabase
        .from('fletes_nacionales')
        .select('*')
        .eq('numero_fn', numero_fn)
        .single()

      if (c) setChoferes(c)
      if (cl) setClientes(cl)
      if (flete) setForm(flete)
    }
    fetchData()
  }, [numero_fn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('fletes_nacionales')
      .update(form)
      .eq('numero_fn', numero_fn)
      
    if (error) alert("Error: " + error.message)
    else {
      alert("¡Cambios guardados con éxito!")
      router.push('/') // Vuelve al inicio o a donde prefieras
    }
  }

  if (!form) return <div className="p-8">Cargando datos...</div>

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Editar Operación: {numero_fn}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente Select */}
        <select 
          value={form.cliente || ''} 
          className="border p-2 rounded" 
          onChange={e => setForm({...form, cliente: e.target.value})}
        >
          <option value="">Seleccionar Cliente</option>
          {clientes.map((c: any) => (
            <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>
          ))}
        </select>

        {/* Chofer Select */}
        <select 
          value={form.chofer || ''} 
          className="border p-2 rounded" 
          onChange={e => setForm({...form, chofer: e.target.value})}
        >
          <option value="">Seleccionar Chofer</option>
          {choferes.map((c: any) => (
            <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>
          ))}
        </select>

        <input type="text" placeholder="Nº Contenedor" value={form.contenedor_num || ''} className="border p-2" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
        <input type="text" placeholder="Origen" value={form.origen || ''} className="border p-2" onChange={(e) => setForm({...form, origen: e.target.value})} />
        <input type="datetime-local" value={form.fecha_hora?.slice(0, 16) || ''} className="border p-2" onChange={(e) => setForm({...form, fecha_hora: e.target.value})} />
        <input type="text" placeholder="Patente Camión" value={form.patente_camion || ''} className="border p-2" onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        <input type="text" placeholder="Patente Semi" value={form.patente_semi || ''} className="border p-2" onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
      </div>

      <input type="text" placeholder="Destino" value={form.destino || ''} className="w-full border p-2" onChange={(e) => setForm({...form, destino: e.target.value})} />
      <textarea placeholder="Notas Adicionales" value={form.notas_adicionales || ''} className="w-full border p-2 h-24" onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />

      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold rounded shadow-lg hover:bg-blue-700">
        Guardar Cambios
      </button>
    </form>
  )
}