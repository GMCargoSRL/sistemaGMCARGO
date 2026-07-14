'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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

  // CORRECCIÓN: Función que limpia el string para evitar conversiones UTC
  const formatDatetime = (dateString: string | null) => {
    if (!dateString) return '';
    return dateString.substring(0, 16);
  };

  useEffect(() => {
    async function fetchData() {
      const { data: listadoChoferes } = await supabase.from('choferes').select('CHOFER, "DOC. ID."')
      const { data: cl } = await supabase.from('clientes').select('"Razon Social"')
      
      const { data: flete } = await supabase
        .from('fletes_nacionales')
        .select('*')
        .eq('numero_fn', numero_fn)
        .single()

      if (listadoChoferes) setChoferes(listadoChoferes)
      if (cl) setClientes(cl)
      
      if (flete) {
        if (!flete.dni_chofer && flete.chofer && listadoChoferes) {
          const choferEncontrado = listadoChoferes.find(c => c.CHOFER === flete.chofer)
          flete.dni_chofer = choferEncontrado ? choferEncontrado["DOC. ID."] : ''
        }
        setForm(flete)
      }
    }
    fetchData()
  }, [numero_fn])

  const handleChoferChange = (nombreChofer: string) => {
    const choferSeleccionado = choferes.find(c => c.CHOFER === nombreChofer)
    const dni = choferSeleccionado ? choferSeleccionado["DOC. ID."] : ''
    
    setForm({
      ...form,
      chofer: nombreChofer,
      dni_chofer: dni || ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <h2 className="text-xl font-bold border-b pb-4">Editar Operación: {numero_fn} ({form.tipo_operacion})</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Cliente">
          <select value={form.cliente || ''} className="border p-2 rounded" onChange={e => setForm({...form, cliente: e.target.value})}>
            <option value="">Seleccionar Cliente</option>
            {clientes.map((c: any) => <option key={c["Razon Social"]} value={c["Razon Social"]}>{c["Razon Social"]}</option>)}
          </select>
        </Field>

        <Field label="Chofer">
          <select value={form.chofer || ''} className="border p-2 rounded" onChange={e => handleChoferChange(e.target.value)}>
            <option value="">Seleccionar Chofer</option>
            {choferes.map((c: any) => <option key={c.CHOFER} value={c.CHOFER}>{c.CHOFER}</option>)}
          </select>
        </Field>

        <Field label="DNI Chofer">
          <input type="text" value={form.dni_chofer || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, dni_chofer: e.target.value})} />
        </Field>

        <Field label="Teléfono del Chofer">
          <input type="text" value={form.telefono_chofer || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, telefono_chofer: e.target.value})} />
        </Field>

        <Field label="Documento Aduanero"><input type="text" value={form.documento_aduanero || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, documento_aduanero: e.target.value})} /></Field>
        <Field label="Patente Camión"><input type="text" value={form.patente_camion || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, patente_camion: e.target.value})} /></Field>
        <Field label="Patente Semi"><input type="text" value={form.patente_semi || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, patente_semi: e.target.value})} /></Field>

        {form.tipo_operacion === 'importacion' && (
          <>
            <Field label="Nº Contenedor"><input type="text" value={form.contenedor_num || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} /></Field>
            <Field label="Tipo de Contenedor"><input type="text" value={form.contenedor_tipo || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} /></Field>
            <Field label="Origen"><input type="text" value={form.origen || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, origen: e.target.value})} /></Field>
            <Field label="Fecha de Carga"><input type="datetime-local" value={formatDatetime(form.fecha_hora)} className="border p-2 rounded" onChange={(e) => setForm({...form, fecha_hora: e.target.value})} /></Field>
            <Field label="Paradas"><input type="text" value={form.paradas || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, paradas: e.target.value})} /></Field>
            <Field label="Destino"><input type="text" value={form.destino || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, destino: e.target.value})} /></Field>
            <Field label="Lugar Devolución"><input type="text" value={form.lugar_devolucion || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_devolucion: e.target.value})} /></Field>
            <Field label="Libre Hasta"><input type="datetime-local" value={formatDatetime(form.libre_hasta)} className="border p-2 rounded" onChange={(e) => setForm({...form, libre_hasta: e.target.value})} /></Field>
            <Field label="¿Es TRAM?">
              <select value={form.tram || 'NO'} className="border p-2 rounded" onChange={e => setForm({...form, tram: e.target.value})}>
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </Field>
          </>
        )}

        {form.tipo_operacion === 'exportacion' && (
          <>
            <Field label="Nº Contenedor"><input type="text" value={form.contenedor_num || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_num: e.target.value})} /></Field>
            <Field label="Tipo de Contenedor"><input type="text" value={form.contenedor_tipo || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, contenedor_tipo: e.target.value})} /></Field>
            <Field label="Lugar Carga Vacío"><input type="text" value={form.lugar_carga_vacio || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_carga_vacio: e.target.value})} /></Field>
            <Field label="Fecha Carga Vacío"><input type="datetime-local" value={formatDatetime(form.fecha_carga_vacio)} className="border p-2 rounded" onChange={(e) => setForm({...form, fecha_carga_vacio: e.target.value})} /></Field>
            <Field label="Lugar Carga Mercadería"><input type="text" value={form.lugar_carga_mercaderia || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_carga_mercaderia: e.target.value})} /></Field>
            <Field label="Lugar Entrega Lleno"><input type="text" value={form.lugar_entrega_lleno || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_entrega_lleno: e.target.value})} /></Field>
          </>
        )}

        {form.tipo_operacion === 'carga_suelta' && (
          <>
            <Field label="Lugar de Carga"><input type="text" value={form.lugar_carga || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_carga: e.target.value})} /></Field>
            <Field label="Fecha/Hora Carga"><input type="datetime-local" value={formatDatetime(form.fecha_hora_carga)} className="border p-2 rounded" onChange={(e) => setForm({...form, fecha_hora_carga: e.target.value})} /></Field>
            <Field label="Lugar de Entrega"><input type="text" value={form.lugar_entrega || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, lugar_entrega: e.target.value})} /></Field>
            <Field label="Cantidad y Tipo de Bultos"><input type="text" value={form.cantidad_bultos || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, cantidad_bultos: e.target.value})} /></Field>
            <Field label="Peso Bruto"><input type="text" value={form.peso_bruto || ''} className="border p-2 rounded" onChange={(e) => setForm({...form, peso_bruto: e.target.value})} /></Field>
          </>
        )}
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