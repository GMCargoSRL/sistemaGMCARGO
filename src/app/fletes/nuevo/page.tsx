'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function NuevaOperacion() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [form, setForm] = useState({ 
    origen: '', destino: '', estado: 'Programado' 
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').insert([form])
    if (error) alert("Error: " + error.message)
    else alert("¡Operación cargada con estado: " + form.estado + "!")
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Carga de Flete con Estado</h2>
      
      <input type="text" placeholder="Origen" className="w-full border p-2" onChange={(e) => setForm({...form, origen: e.target.value})} />
      <input type="text" placeholder="Destino" className="w-full border p-2" onChange={(e) => setForm({...form, destino: e.target.value})} />
      
      <label className="block text-sm font-medium">Estado del Flete:</label>
      <select className="w-full border p-2" onChange={(e) => setForm({...form, estado: e.target.value})}>
        <option value="Programado">Programado</option>
        <option value="En Transito">En Tránsito</option>
        <option value="Entregado">Entregado</option>
        <option value="Demorado">Demorado</option>
      </select>
      
      <button type="submit" className="bg-blue-600 text-white w-full p-2 rounded">Guardar Flete</button>
    </form>
  )
}