'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-[10px] uppercase font-bold text-gray-400">{label}</label>
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
      const { data: c } = await supabase.from('choferes').select('CHOFER, "DOC. ID."')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      const { data: flete } = await supabase.from('fletes_nacionales').select('*').eq('numero_fn', numero_fn).single()

      if (c) setChoferes(c)
      if (cl) setClientes(cl)
      if (flete) setForm(flete)
    }
    fetchData()
  }, [numero_fn])

  const handleChoferChange = (nombreChofer: string) => {
    const choferSeleccionado = choferes.find(ch => ch.CHOFER === nombreChofer)
    setForm({ 
      ...form, 
      chofer: nombreChofer, 
      dni_chofer: choferSeleccionado ? choferSeleccionado["DOC. ID."] : '' 
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fletes_nacionales').update(form).eq('numero_fn', numero_fn)
    if (error) alert("Error: " + error.message)
    else { alert("¡Cambios guardados!"); router.push('/') }
  }

  if (!form) return <div className="p-8">Cargando datos...</div>

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Editar Operación: {numero_fn}</h2>

      {/* DATOS DE OPERACIÓN */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Datos de Operación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo de Operación">
            <select className="border p-2 rounded w-full" value={form.tipo_operacion || ''} onChange={e => setForm({...form, tipo_operacion: e.target.value})}>
              <option value="importacion">Contenedor de Importación/TRM</option>
              <option value="exportacion">Contenedor de Exportación</option>
              <option value="carga_suelta">Carga Suelta</option>
            </select>
          </Field>
          <Field label="Cliente">
            <input list="lista-clientes" className="border p-2 rounded w-full" value={form.cliente || ''} onChange={e => setForm({...form, cliente: e.target.value})} />
            <datalist id="lista-clientes">{clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]} />)}</datalist>
          </Field>
          <Field label="Documento Aduanero"><input type="text" className="border p-2 rounded w-full" value={form.documento_aduanero || ''} onChange={e => setForm({...form, documento_aduanero: e.target.value})} /></Field>
        </div>
      </section>

      {/* DETALLES DE LA CARGA */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Detalles de la Carga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {form.tipo_operacion === 'importacion' && (
            <>
              <Field label="Nº Contenedor"><input type="text" className="border p-2 rounded w-full" value={form.contenedor_num || ''} onChange={e => setForm({...form, contenedor_num: e.target.value})} /></Field>
              <Field label="Tipo Contenedor"><input type="text" className="border p-2 rounded w-full" value={form.contenedor_tipo || ''} onChange={e => setForm({...form, contenedor_tipo: e.target.value})} /></Field>
              <Field label="Origen"><input type="text" className="border p-2 rounded w-full" value={form.origen || ''} onChange={e => setForm({...form, origen: e.target.value})} /></Field>
              <Field label="Fecha Carga"><input type="datetime-local" className="border p-2 rounded w-full" value={form.fecha_hora ? form.fecha_hora.substring(0, 16) : ''} onChange={e => setForm({...form, fecha_hora: e.target.value})} /></Field>
              <Field label="Paradas"><input type="text" className="border p-2 rounded w-full" value={form.paradas || ''} onChange={e => setForm({...form, paradas: e.target.value})} /></Field>
              <Field label="Destino"><input type="text" className="border p-2 rounded w-full" value={form.destino || ''} onChange={e => setForm({...form, destino: e.target.value})} /></Field>
              <Field label="Lugar Devolución"><input type="text" className="border p-2 rounded w-full" value={form.lugar_devolucion || ''} onChange={e => setForm({...form, lugar_devolucion: e.target.value})} /></Field>
              <Field label="Libre Hasta"><input type="date" className="border p-2 rounded w-full" value={form.libre_hasta ? form.libre_hasta.substring(0, 10) : ''} onChange={e => setForm({...form, libre_hasta: e.target.value})} /></Field>
            </>
          )}

          {form.tipo_operacion === 'exportacion' && (
            <>
              <Field label="Nº Contenedor"><input type="text" className="border p-2 rounded w-full" value={form.contenedor_num || ''} onChange={e => setForm({...form, contenedor_num: e.target.value})} /></Field>
              <Field label="Lugar Carga Vacío"><input type="text" className="border p-2 rounded w-full" value={form.lugar_carga_vacio || ''} onChange={e => setForm({...form, lugar_carga_vacio: e.target.value})} /></Field>
              <Field label="Fecha Carga Vacío"><input type="datetime-local" className="border p-2 rounded w-full" value={form.fecha_carga_vacio ? form.fecha_carga_vacio.substring(0, 16) : ''} onChange={e => setForm({...form, fecha_carga_vacio: e.target.value})} /></Field>
              <Field label="Lugar Carga Mercadería"><input type="text" className="border p-2 rounded w-full" value={form.lugar_carga_mercaderia || ''} onChange={e => setForm({...form, lugar_carga_mercaderia: e.target.value})} /></Field>
            </>
          )}

          {form.tipo_operacion === 'carga_suelta' && (
            <>
              <Field label="Lugar Carga"><input type="text" className="border p-2 rounded w-full" value={form.lugar_carga || ''} onChange={e => setForm({...form, lugar_carga: e.target.value})} /></Field>
              <Field label="Lugar Entrega"><input type="text" className="border p-2 rounded w-full" value={form.lugar_entrega || ''} onChange={e => setForm({...form, lugar_entrega: e.target.value})} /></Field>
              <Field label="Cantidad Bultos"><input type="text" className="border p-2 rounded w-full" value={form.cantidad_bultos || ''} onChange={e => setForm({...form, cantidad_bultos: e.target.value})} /></Field>
              <Field label="Peso Bruto"><input type="text" className="border p-2 rounded w-full" value={form.peso_bruto || ''} onChange={e => setForm({...form, peso_bruto: e.target.value})} /></Field>
            </>
          )}
        </div>
      </section>

      {/* CHOFER Y UNIDAD */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Chofer y Unidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Chofer">
            <input list="lista-choferes" className="border p-2 rounded w-full" value={form.chofer || ''} onChange={e => handleChoferChange(e.target.value)} />
            <datalist id="lista-choferes">{choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER} />)}</datalist>
          </Field>
          <Field label="DNI Chofer"><input type="text" className="border p-2 rounded w-full" value={form.dni_chofer || ''} onChange={e => setForm({...form, dni_chofer: e.target.value})} /></Field>
          <Field label="Teléfono del Chofer"><input type="text" className="border p-2 rounded w-full" value={form.telefono_chofer || ''} onChange={e => setForm({...form, telefono_chofer: e.target.value})} /></Field>
          <Field label="Patente Camión"><input type="text" className="border p-2 rounded w-full" value={form.patente_camion || ''} onChange={e => setForm({...form, patente_camion: e.target.value})} /></Field>
          <Field label="Patente Semi"><input type="text" className="border p-2 rounded w-full" value={form.patente_semi || ''} onChange={e => setForm({...form, patente_semi: e.target.value})} /></Field>
        </div>
      </section>

      {/* NOTAS ADICIONALES */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-sky-700 mb-4 uppercase text-sm tracking-wider">Notas Adicionales</h3>
        <textarea 
          className="w-full border p-2 rounded" 
          rows={4}
          value={form.notas_adicionales || ''} 
          onChange={e => setForm({...form, notas_adicionales: e.target.value})} 
        />
      </section>

      {/* BOTONES */}
      <div className="flex flex-col gap-3">
        <button type="submit" className="w-full bg-sky-600 text-white p-4 font-bold rounded-lg hover:bg-sky-700 transition">
          Guardar Cambios
        </button>
        <button type="button" onClick={() => router.push('/')} className="w-full bg-white text-gray-600 p-4 font-bold rounded-lg border border-gray-300 hover:bg-gray-50 transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}