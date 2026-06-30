'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function FletesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [choferes, setChoferes] = useState([])
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({
    numero_fn: '', cliente: '', chofer: '', 
    contenedor_num: '', contenedor_tipo: '', 
    origen: '', fecha_hora: '', paradas: '', destino: ''
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

  const guardarFlete = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').insert([form])
    if (error) alert("Error: " + error.message)
    else alert("¡Operación registrada!")
  }

  return (
    <form onSubmit={guardarFlete} className="p-8 grid grid-cols-2 gap-4">
      <input className="border p-2 rounded" placeholder="Número de FN" onChange={e => setForm({...form, numero_fn: e.target.value})} />
      
      <select className="border p-2 rounded" onChange={e => setForm({...form, cliente: e.target.value})}>
        <option value="">Seleccionar Cliente</option>
        {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
      </select>

      <select className="border p-2 rounded" onChange={e => setForm({...form, chofer: e.target.value})}>
        <option value="">Seleccionar Chofer</option>
        {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
      </select>

      <div className="flex gap-2">
        <input className="border p-2 rounded w-1/2" placeholder="N° Contenedor" onChange={e => setForm({...form, contenedor_num: e.target.value})} />
        <input className="border p-2 rounded w-1/2" placeholder="Tipo (20/40)" onChange={e => setForm({...form, contenedor_tipo: e.target.value})} />
      </div>
      
      <input className="border p-2 rounded" placeholder="Origen" onChange={e => setForm({...form, origen: e.target.value})} />
      <input type="datetime-local" className="border p-2 rounded" onChange={e => setForm({...form, fecha_hora: e.target.value})} />
      <input className="border p-2 rounded col-span-2" placeholder="Paradas intermedias" onChange={e => setForm({...form, paradas: e.target.value})} />
      <input className="border p-2 rounded col-span-2" placeholder="Destino" onChange={e => setForm({...form, destino: e.target.value})} />
      
      <button type="submit" className="col-span-2 bg-amber-600 text-white p-3 rounded">Guardar</button>
    </form>
  )
}