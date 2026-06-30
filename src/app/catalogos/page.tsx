import React from 'react'

export default function ClientesPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Encabezado con acción primaria según criterios de diseño */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Maestro de Clientes</h1>
          <p className="text-sm text-zinc-500">Administración y consulta del historial de cuentas de GM CARGO SRL.</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition">
          Nuevo Cliente
        </button>
      </div>

      {/* Contenedor temporal de trabajo */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center bg-zinc-50/50">
        <div className="mx-auto max-w-md space-y-2">
          <div className="text-zinc-400 font-semibold text-lg">Módulo en Desarrollo</div>
          <p className="text-sm text-zinc-500">
            Próximamente se integrarán aquí las búsquedas por CUIT y razón social conectadas a la base de datos de Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}