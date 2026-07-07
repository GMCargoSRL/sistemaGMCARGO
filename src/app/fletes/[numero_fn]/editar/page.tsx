'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// Mover el componente Field FUERA de la función principal para evitar que pierda el foco
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-sm font-semibold text-gray-700">{label}</label>
    {children}
  </div>
)

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
      const { data: c } = await supabase.from('choferes').select('CHOFER')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      
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
    
    // Limpieza: convertir strings vacíos a null para la BD
    const formLimpio = { ...form }
    Object.keys(formLimpio).forEach(key => {
      if (formLimpio[key] === '') formLimpio[key] = null
    })

    const { error } = await supabase
      .from('fletes_nacionales')
      .update(formLimpio)
      .eq('numero_fn', numero_fn)
      
    if (error) alert("Error: " + error.message)
    else {
      alert("¡Cambios guardados con éxito!")
      router.push('/')
    }
  }

  if (!form) return <div className="p-8">Cargando datos...</div>

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold border-b pb-4">Editar Operación: {numero_fn}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Cliente">
          <select 
            value={form.cliente || ''} 
            className="border p-2 rounded" 
            onChange={e => setForm({...form, cliente: e.target.value})}
          >
            <option value="">Seleccionar Cliente</option>
            {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
          </select>
        </Field>

        <Field label="Chofer">
          <select 
            value={form.chofer || ''} 
            className="border p-2 rounded" 
            onChange={e => setForm({...form, chofer: e.target.value})}
          >
            <option value="">Seleccionar Chofer</option>
            {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
          </select>
        </Field>

        <Field label="Nº Contenedor">
          <input type="text" value={form.contenedor_num || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} />
        </Field>

        <Field label="Tipo de Contenedor">
          <input type="text" value={form.contenedor_tipo || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} />
        </Field>

        <Field label="Origen">
          <input type="text" value={form.origen || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, origen: e.target.value})} />
        </Field>

        <Field label="Fecha y Hora">
          <input type="datetime-local" value={form.fecha_hora?.slice(0, 16) || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, fecha_hora: e.target.value})} />
        </Field>

        <Field label="Patente Camión">
          <input type="text" value={form.patente_camion || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, patente_camion: e.target.value})} />
        </Field>

        <Field label="Patente Semi">
          <input type="text" value={form.patente_semi || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, patente_semi: e.target.value})} />
        </Field>

        <Field label="Destino">
          <input type="text" value={form.destino || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, destino: e.target.value})} />
        </Field>

        <Field label="Lugar Devolucion">
          <input type="text" value={form.lugar_devolucion || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} />
        </Field>

        <Field label="Libre Hasta">
          <input type="text" value={form.libre_hasta || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, libre_hasta: e.target.value})} />
        </Field>
      </div>

      <Field label="Notas Adicionales">
        <textarea value={form.notas_adicionales || ''} className="w-full border p-2 h-24 rounded" onChange={(e) => setForm({...form, notas_adicionales: e.target.value})} />
      </Field>

      <button type="submit" className="bg-sky-600 text-white w-full p-4 font-bold rounded shadow-lg hover:bg-blue-700">
        Guardar Cambios
      </button>
    </form>
  )
}