'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function NuevaOperacion() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Inicializamos el estado con todos los campos nuevos
  const [form, setForm] = useState({ 
    origen: '', 
    destino: '', 
    estado: 'Programado',
    cliente: '',
    contenedor_num: '',
    patente_camion: '',
    patente_semi: '',
    libre_hasta: '',
    lugar_devolucion: '',
    notas_adicionales: '' // Este es el cuadro de texto que pediste
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').insert([form])
    if (error) alert("Error: " + error.message)
    else alert("¡Operación cargada con éxito!")
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-lg space-y-4">
      <h2 className="text-xl font-bold">Carga de Nueva Operación</h2>
      
      <input type="text" placeholder="Cliente" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, cliente: e.target.value})} />
      <input type="text" placeholder="Contenedor" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
      <input type="text" placeholder="Origen" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, origen: e.target.value})} />
      <input type="text" placeholder="Destino" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, destino: e.target.value})} />
      
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Patente Camión" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        <input type="text" placeholder="Patente Semi" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
      </div>

      <input type="date" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, libre_hasta: e.target.value})} />
      <input type="text" placeholder="Lugar Devolución" className="w-full border p-2 rounded" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} />

      <label className="block text-sm font-medium">Estado:</label>
      <select className="w-full border p-2 rounded" onChange={(e) => setForm({...form, estado: e.target.value})}>
        <option value="Programado">Programado</option>
        <option value="En Transito">En Tránsito</option>
        <option value="Entregado">Entregado</option>
      </select>

      {/* Aquí está el nuevo cuadro de texto solicitado */}
      <label className="block text-sm font-medium">Notas Adicionales:</label>
      <textarea 
        className="w-full border p-2 rounded" 
        rows={4}
        placeholder="Escribe aquí comentarios, detalles adicionales..."
        onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} 
      />
      
      <button type="submit" className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700">
        Guardar Operación
      </button>
    </form>
  )
}