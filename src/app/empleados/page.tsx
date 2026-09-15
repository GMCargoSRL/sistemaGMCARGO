'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

interface Empleado {
  id: string
  nombre_apellido: string
  email: string
  cargo: string
  activo: boolean
}

// Función auxiliar para calcular automáticamente los próximos N viernes a partir de hoy
const obtenerProximosViernes = (cantidad: number = 5): string => {
  const fechas: string[] = []
  const hoy = new Date()
  const fecha = new Date(hoy)

  // Encontrar el primer viernes que sea igual o posterior a hoy
  const diasHastaViernes = (5 - fecha.getDay() + 7) % 7
  fecha.setDate(fecha.getDate() + diasHastaViernes)

  for (let i = 0; i < cantidad; i++) {
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    fechas.push(`${dia}/${mes}`)
    fecha.setDate(fecha.getDate() + 7)
  }

  return fechas.join(' – ')
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null)
  
  // Estado para controlar la visibilidad del panel de edición de firma
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false)

  // Estado para modal / formulario de Empleados
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formEmpleado, setFormEmpleado] = useState({
    nombre_apellido: '',
    email: '',
    cargo: '',
    activo: true,
  })

  // Estado para modal de confirmación de eliminación
  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<{ id: string; nombre: string } | null>(null)

  // Estados personalizables para el contenido de la Firma Corporativa
  const [usarFechasAuto, setUsarFechasAuto] = useState(true)
  const [fechasSalidas, setFechasSalidas] = useState(obtenerProximosViernes(5))
  const [direccionTexto, setDireccionTexto] = useState('Avenida Belgrano 687, 3er Piso, Of. 12 — Atención / Retiro documental: L a V de 10 a 13 – 14 a 17 hs.')
  const [telefonosTexto, setTelefonosTexto] = useState('+5411 2150 4310  |  +5411 2150 4311  |  +5411 4343 2748')
  const [rutasTexto, setRutasTexto] = useState('EXPORTACIÓN: Origen ARGENTINA → Destino PARAGUAY\nIMPORTACIÓN: Origen PARAGUAY → Destino ARGENTINA')
  const [cutoffTexto, setCutoffTexto] = useState('▪ Corte operativo & documental / Cut off: Jueves anterior 14:00 hs.\n▪ Llegada a ASUNCIÓN: Todos los Lunes posteriores a la salida.')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Cargar lista de empleados desde Supabase
  const cargarEmpleados = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('nombre_apellido', { ascending: true })

    if (error) {
      console.error('Error al cargar empleados:', error.message)
      toast.error('Error al cargar la lista de empleados')
    } else if (data) {
      setEmpleados(data)
      if (data.length > 0 && !empleadoSeleccionado) {
        setEmpleadoSeleccionado(data[0])
      }
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarEmpleados()
  }, [])

  // Recalcular fechas automáticas si el interruptor está activado
  useEffect(() => {
    if (usarFechasAuto) {
      setFechasSalidas(obtenerProximosViernes(5))
    }
  }, [usarFechasAuto])

  // Abrir modal para Crear Empleado
  const abrirModalCrear = () => {
    setEditandoId(null)
    setFormEmpleado({
      nombre_apellido: '',
      email: '',
      cargo: '',
      activo: true,
    })
    setModalAbierto(true)
  }

  // Abrir modal para Editar Empleado
  const abrirModalEditar = (emp: Empleado) => {
    setEditandoId(emp.id)
    setFormEmpleado({
      nombre_apellido: emp.nombre_apellido,
      email: emp.email,
      cargo: emp.cargo,
      activo: emp.activo,
    })
    setModalAbierto(true)
  }

  // Guardar (Crear o Editar Empleado)
  const guardarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formEmpleado.nombre_apellido || !formEmpleado.email || !formEmpleado.cargo) {
      toast.warning('Por favor completa todos los campos obligatorios.')
      return
    }

    if (editandoId) {
      const { error } = await supabase
        .from('empleados')
        .update(formEmpleado)
        .eq('id', editandoId)

      if (error) {
        toast.error(`Error al actualizar: ${error.message}`)
      } else {
        toast.success('Empleado actualizado correctamente')
        setModalAbierto(false)
        cargarEmpleados()
      }
    } else {
      const { error } = await supabase
        .from('empleados')
        .insert([formEmpleado])

      if (error) {
        toast.error(`Error al crear: ${error.message}`)
      } else {
        toast.success('Empleado agregado con éxito')
        setModalAbierto(false)
        cargarEmpleados()
      }
    }
  }

  // Solicitar eliminación de empleado
  const solicitarEliminacion = (id: string, nombre: string) => {
    setEmpleadoAEliminar({ id, nombre })
  }

  // Ejecutar eliminación confirmada en Supabase
  const confirmarEliminacion = async () => {
    if (!empleadoAEliminar) return

    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', empleadoAEliminar.id)

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`)
    } else {
      toast.success('Empleado eliminado correctamente')
      if (empleadoSeleccionado?.id === empleadoAEliminar.id) {
        setEmpleadoSeleccionado(null)
      }
      cargarEmpleados()
    }

    setEmpleadoAEliminar(null)
  }

  // Generador de Firma HTML dinámica con datos modificables
  const generarHtmlFirma = (emp: Empleado) => {
    const logoUrl = 'https://sistema-gmcargo.vercel.app/logo.png'
    const textoSalidas = usarFechasAuto ? obtenerProximosViernes(5) : fechasSalidas

    const rutasFormatted = rutasTexto.replace(/\n/g, '<br>')
    const cutoffFormatted = cutoffTexto.replace(/\n/g, '<br>')

    return `
<table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; line-height: 1.3; width: 100%; max-width: 620px;">
  <tr>
    <td colspan="2" style="padding-bottom: 8px; color: #555555; font-size: 13px;">Best regards / Cordialmente,</td>
  </tr>
  <tr>
    <td style="border-bottom: 2px solid #1A448F; padding-bottom: 8px; vertical-align: middle; width: 70px;">
      <a href="https://www.gmcargo.com" target="_blank" style="text-decoration: none; display: block;">
        <img src="${logoUrl}" alt="GM CARGO SRL" width="60" height="60" style="display: block; border: 0; outline: none; text-decoration: none;" />
      </a>
    </td>
    <td style="border-bottom: 2px solid #1A448F; padding-bottom: 8px; vertical-align: middle; padding-left: 12px;">
      <span style="font-size: 16px; font-weight: bold; color: #1A448F;">${emp.nombre_apellido}</span>
      <span style="color: #888888;"> | </span>
      <a href="mailto:${emp.email}" style="color: #1A448F; text-decoration: none; font-weight: 500;">${emp.email}</a><br>
      <span style="font-weight: bold; color: #444444; font-size: 13px;">${emp.cargo}</span>
      <span style="color: #888888;"> | </span>
      <span style="font-weight: bold; color: #1A448F;">GM CARGO SRL</span>
      <span style="color: #888888;"> | </span>
      <a href="https://www.gmcargo.com" target="_blank" style="color: #1A448F; text-decoration: none;">www.gmcargo.com</a>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 8px; padding-bottom: 10px; font-size: 12px; color: #666666; line-height: 1.35;">
      ${direccionTexto}<br>
      <strong style="color: #D9534F;">Ph/Fax:</strong> ${telefonosTexto}<br>
      CP C1092AAG &nbsp;|&nbsp; Buenos Aires — Argentina
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <table cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #1A448F; background-color: #F8FAFC; border-radius: 6px; font-size: 12px;">
        <tr>
          <td align="center" style="padding: 6px 8px 3px 8px;"><strong style="font-size: 12px; color: #1A448F; text-transform: uppercase;">Servicio Consolidado Terrestre</strong></td>
        </tr>
        <tr>
          <td align="center" style="padding: 2px 8px 5px 8px; font-weight: bold; color: #444444; line-height: 1.25;">
            ${rutasFormatted}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 4px 8px; background-color: #EBF3FC; font-weight: bold; color: #1A448F; border-top: 1px solid #D0E2F7; border-bottom: 1px solid #D0E2F7;">
            Próximas Salidas VIERNES: ${textoSalidas}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 5px 8px 6px 8px; font-size: 11px; color: #555555; line-height: 1.25;">
            ${cutoffFormatted}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.trim()
  }

  // Copiar firma HTML al portapapeles
  const copiarFirma = (emp: Empleado) => {
    const htmlContent = generarHtmlFirma(emp)
    
    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' })
      const blobText = new Blob([htmlContent], { type: 'text/plain' })
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]
      
      navigator.clipboard.write(data).then(() => {
        toast.success(`Firma de ${emp.nombre_apellido} copiada al portapapeles!`)
      }).catch(() => {
        navigator.clipboard.writeText(htmlContent)
        toast.success('Código HTML copiado al portapapeles!')
      })
    } catch {
      navigator.clipboard.writeText(htmlContent)
      toast.success('Código HTML copiado al portapapeles!')
    }
  }

  const empleadosFiltrados = empleados.filter((emp) => {
    const q = busqueda.toLowerCase()
    return (
      emp.nombre_apellido.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.cargo.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            👥 Planilla de Empleados &amp; Firmas
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Administra los datos corporativos para generar firmas de correo actualizadas dinámicamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarEmpleados}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl font-medium text-sm transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={abrirModalCrear}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition cursor-pointer shadow-sm flex items-center gap-2"
          >
            ➕ Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TABLA DE EMPLEADOS */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
            <input
              type="text"
              placeholder="Buscar por Nombre, Email o Cargo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-colors text-sm"
            />
          </div>

          <div className="bg-white dark:bg-slate-900/90 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                  {cargando ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        Cargando planilla de empleados...
                      </td>
                    </tr>
                  ) : empleadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        No hay empleados registrados.
                      </td>
                    </tr>
                  ) : (
                    empleadosFiltrados.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => setEmpleadoSeleccionado(emp)}
                        className={`cursor-pointer transition-colors ${
                          empleadoSeleccionado?.id === emp.id
                            ? 'bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-sky-600'
                            : 'hover:bg-gray-50/80 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.nombre_apellido}</div>
                          <div className="text-xs text-sky-600 dark:text-sky-400">{emp.email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {emp.cargo}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              emp.activo
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => abrirModalEditar(emp)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition"
                            title="Editar Datos"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => solicitarEliminacion(emp.id, emp.nombre_apellido)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition"
                            title="Eliminar Empleado"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* VISTA PREVIA Y DESPLEGABLE DE CONFIGURACIÓN DE LA FIRMA */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900/90 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors space-y-4">
            
            {/* Botón desplegable para 'Editar Información' */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
                className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 p-3.5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  ⚙️ Editar Información de Firma
                </span>
                <span className="text-slate-500 font-medium">
                  {mostrarConfiguracion ? '▲ Ocultar' : '▼ Expandir'}
                </span>
              </button>

              {/* Formulario Desplegable */}
              {mostrarConfiguracion && (
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-end mb-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-sky-600 dark:text-sky-400">
                      <input
                        type="checkbox"
                        checked={usarFechasAuto}
                        onChange={(e) => setUsarFechasAuto(e.target.checked)}
                        className="w-4 h-4 text-sky-600 rounded"
                      />
                      Fechas automáticas (próximos 5 viernes)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Próximas Salidas (Fechas):</label>
                      <input
                        type="text"
                        disabled={usarFechasAuto}
                        value={fechasSalidas}
                        onChange={(e) => setFechasSalidas(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Teléfonos:</label>
                      <input
                        type="text"
                        value={telefonosTexto}
                        onChange={(e) => setTelefonosTexto(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Dirección y Horarios:</label>
                      <input
                        type="text"
                        value={direccionTexto}
                        onChange={(e) => setDireccionTexto(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Rutas / Servicios (Cuadro Azul):</label>
                      <textarea
                        rows={2}
                        value={rutasTexto}
                        onChange={(e) => setRutasTexto(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Cut off &amp; Llegada (Cuadro Azul):</label>
                      <textarea
                        rows={2}
                        value={cutoffTexto}
                        onChange={(e) => setCutoffTexto(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Header de Vista Previa */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2 pt-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                ✉️ Vista Previa
              </h3>
              {empleadoSeleccionado && (
                <button
                  onClick={() => copiarFirma(empleadoSeleccionado)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  📋 Copiar Firma
                </button>
              )}
            </div>

            {empleadoSeleccionado ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Firma para <strong className="text-slate-800 dark:text-slate-200">{empleadoSeleccionado.nombre_apellido}</strong> ({empleadoSeleccionado.email}):
                </div>

                <div className="p-4 bg-white text-slate-900 rounded-lg border border-gray-200 overflow-x-auto shadow-inner min-h-[280px]">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generarHtmlFirma(empleadoSeleccionado),
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                Selecciona un empleado de la lista para ver y copiar su firma corporativa.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA CREAR / EDITAR EMPLEADO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 pb-3">
              {editandoId ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}
            </h3>

            <form onSubmit={guardarEmpleado} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={formEmpleado.nombre_apellido}
                  onChange={(e) => setFormEmpleado({ ...formEmpleado, nombre_apellido: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={formEmpleado.email}
                  onChange={(e) => setFormEmpleado({ ...formEmpleado, email: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cargo / Puesto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Operaciones Terrestres"
                  value={formEmpleado.cargo}
                  onChange={(e) => setFormEmpleado({ ...formEmpleado, cargo: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formEmpleado.activo}
                  onChange={(e) => setFormEmpleado({ ...formEmpleado, activo: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <label htmlFor="activo" className="text-slate-700 dark:text-slate-300 font-medium">
                  Empleado Activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {empleadoAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ¿Eliminar empleado?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta acción no se puede deshacer. Vas a eliminar a <strong className="text-slate-800 dark:text-slate-200">{empleadoAEliminar.nombre}</strong>.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmpleadoAEliminar(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacion}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}