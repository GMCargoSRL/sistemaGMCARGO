'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function EditarFlete() {
  const { numero_fn } = useParams()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    async function getFlete() {
      const { data } = await supabase
        .from('fletes_nacionales')
        .select('*')
        .eq('numero_fn', numero_fn)
        .single()
      if (data) setForm(data)
    }
    getFlete()
  }, [numero_fn])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').update(form).eq('numero_fn', numero_fn)
    if (error) alert("Error: " + error.message)
    else {
      alert("¡Operación actualizada con éxito!")
      router.push('/')
    }
  }

  if (!form) return <div className="p-10">Cargando datos...</div>

  return (
    <form onSubmit={handleUpdate} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Editar Operación: {numero_fn}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" value={form.cliente || ''} className="border p-2" onChange={(e) => setForm({...form, cliente: e.target.value})} placeholder="Cliente" />
        <input type="text" value={form.chofer || ''} className="border p-2" onChange={(e) => setForm({...form, chofer: e.target.value})} placeholder="Chofer" />
        <input type="text" value={form.contenedor_num || ''} className="border p-2" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} placeholder="Nº Contenedor" />
        <input type="text" value={form.origen || ''} className="border p-2" onChange={(e) => setForm({...form, origen: e.target.value})} placeholder="Origen" />
        <input type="text" value={form.patente_camion || ''} className="border p-2" onChange={(e) => setForm({...form, patente_camion: e.target.value})} placeholder="Patente Camión" />
        <input type="text" value={form.patente_semi || ''} className="border p-2" onChange={(e) => setForm({...form, patente_semi: e.target.value})} placeholder="Patente Semi" />
      </div>

      <input type="text" value={form.destino || ''} className="w-full border p-2" onChange={(e) => setForm({...form, destino: e.target.value})} placeholder="Destino" />
      <input type="text" value={form.lugar_devolucion || ''} className="w-full border p-2" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} placeholder="Lugar Devolución" />
      
      <label className="block text-sm font-bold">Notas Adicionales:</label>
      <textarea 
        value={form.notas_adicionales || ''} 
        className="w-full border p-2 h-24" 
        onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} 
      />

      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold rounded shadow-lg hover:bg-blue-700">
        Guardar Cambios
      </button>
    </form>
  )
}