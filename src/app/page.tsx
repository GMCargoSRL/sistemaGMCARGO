'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Dashboard() {
  const [fletes, setFletes] = useState<any[]>([])
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc') // Estado inicial: descendente
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'EN PREPARACIÓN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EN CURSO': return 'bg-red-100 text-red-800 border-red-200';
      case 'TERMINADO': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  async function getFletes() {
    const { data } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .order('fecha_hora', { ascending: orden === 'asc' })
    if (data) setFletes(data)
  }

  useEffect(() => { getFletes() }, [orden])

  async function eliminarFlete(numero_fn: string) {
    if (confirm(`¿Estás seguro de eliminar la operación ${numero_fn}?`)) {
      await supabase.from('fletes_nacionales').delete().eq('numero_fn', numero_fn)
      setFletes(fletes.filter((f: any) => f.numero_fn !== numero_fn))
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Operaciones en Curso</h1>
      
      <table className="w-full bg-white border rounded-lg shadow-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">FN</th>
            <th className="p-3">Fecha y Hora</th>
            <th className="p-3">Chofer</th>
            <th className="p-3">Camión</th>
            <th className="p-3">Semi</th>
            <th className="p-3">Contenedor</th>
            <th className="p-3">Comentarios</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {fletes.map((f: any) => (
            <tr key={f.numero_fn} className="border-t">
              <td className="p-3 font-medium">{f.numero_fn}</td>
              <td className="p-3">{f.fecha_hora ? new Date(f.fecha_hora).toLocaleString() : '-'}</td>
              <td className="p-3 font-medium">{f.chofer}</td>
              <td className="p-3">{f.patente_camion}</td>
              <td className="p-3">{f.patente_semi}</td>
              <td className="p-3">{f.contenedor_num}</td>
              <td className="p-3 text-sm text-gray-600 truncate max-w-[150px]">{f.notas_adicionales}</td>
              <td className="p-3">
                <select 
                  className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${getEstadoStyle(f.estado)}`}
                  value={f.estado || 'EN PREPARACIÓN'}
                  onChange={async (e) => {
                    const nuevoEstado = e.target.value;
                    await supabase.from('fletes_nacionales').update({ estado: nuevoEstado }).eq('numero_fn', f.numero_fn);
                    setFletes(fletes.map((item: any) => item.numero_fn === f.numero_fn ? { ...item, estado: nuevoEstado } : item));
                  }}
                >
                  <option value="EN PREPARACIÓN">EN PREPARACIÓN</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="TERMINADO">TERMINADO</option>
                </select>
              </td>
              <td className="p-3 flex gap-2">
                <button onClick={() => window.location.href = `/fletes/${f.numero_fn}/editar`} className="text-blue-600 hover:underline text-xs font-bold">Editar</button>
                <button onClick={() => window.print()} className="text-green-600 hover:underline text-xs font-bold">PDF</button>
                <button onClick={() => eliminarFlete(f.numero_fn)} className="text-red-500 hover:underline text-xs font-bold">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}