'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Notificacion {
  id: number
  asunto: string | null
  recibido: string | null
  remitente: string | null
  contenedor: string | null
  bl: string | null
  lugar_carga: string | null
  lugar_descarga: string | null
}

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const cargarNotificaciones = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .order('recibido', { ascending: false })

    if (error) {
      console.error('Error cargando notificaciones:', error.message)
    } else if (data) {
      setNotificaciones(data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarNotificaciones()
  }, [])

  const notificacionesFiltradas = notificaciones.filter((n) => {
    const query = busqueda.toLowerCase()
    return (
      (n.asunto && n.asunto.toLowerCase().includes(query)) ||
      (n.remitente && n.remitente.toLowerCase().includes(query)) ||
      (n.contenedor && n.contenedor.toLowerCase().includes(query)) ||
      (n.bl && n.bl.toLowerCase().includes(query)) ||
      (n.lugar_carga && n.lugar_carga.toLowerCase().includes(query)) ||
      (n.lugar_descarga && n.lugar_descarga.toLowerCase().includes(query))
    )
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Notificaciones de Contenedores
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Correos recibidos e ingresados automáticamente desde n8n
          </p>
        </div>

        <button
          onClick={cargarNotificaciones}
          className="self-start md:self-auto bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer shadow-sm flex items-center gap-2"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
        <input
          type="text"
          placeholder="Buscar por Asunto, Remitente, Contenedor, B/L o Lugar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-colors text-sm"
        />
      </div>

      {/* Tabla de Notificaciones */}
      <div className="bg-white dark:bg-slate-900/90 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Fecha Recibido</th>
                <th className="px-5 py-3.5 text-left">Remitente</th>
                <th className="px-5 py-3.5 text-left">Asunto</th>
                <th className="px-5 py-3.5 text-left">Contenedor</th>
                <th className="px-5 py-3.5 text-left">B/L</th>
                <th className="px-5 py-3.5 text-left">Lugar de Carga</th>
                <th className="px-5 py-3.5 text-left">Lugar de Descarga</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800 text-sm text-slate-900 dark:text-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500">
                    Cargando notificaciones de Supabase...
                  </td>
                </tr>
              ) : notificacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                    No se encontraron notificaciones registradas.
                  </td>
                </tr>
              ) : (
                notificacionesFiltradas.map((item) => {
                  const fechaFormateada = item.recibido
                    ? new Date(item.recibido).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-gray-600 dark:text-slate-300">
                        {fechaFormateada}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {item.remitente || '-'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-sky-600 dark:text-sky-400 max-w-xs truncate">
                        {item.asunto || '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.contenedor ? (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            {item.contenedor}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.bl || '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                        {item.lugar_carga || '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                        {item.lugar_descarga || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}