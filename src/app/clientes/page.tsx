import React from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export default async function ClientesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  // Usamos 'public.clientes' para forzar la búsqueda en el esquema correcto
  // He ajustado los nombres de las columnas para que coincidan con tu CSV:
  // "Razon Social", "CUIT", "Provincia", "Pais", "Codigo"
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('"Codigo", "Razon Social", "CUIT", "Provincia", "Pais"')
    .order('Razon Social', { ascending: true })

  return (
    <div className="p-6 bg-white min-h-screen text-zinc-900">
      <h1 className="text-2xl font-bold mb-6">Maestro de Clientes</h1>
      
      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700">
          <strong>Error de Supabase:</strong> {error.message}
          <br/>
          <pre className="text-xs mt-2">{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-zinc-200">
            <thead>
              <tr className="bg-zinc-100">
                <th className="p-3 border">Código</th>
                <th className="p-3 border">Razón Social</th>
                <th className="p-3 border">CUIT</th>
                <th className="p-3 border">Provincia</th>
              </tr>
            </thead>
            <tbody>
              {clientes?.map((c: any) => (
                <tr key={c["Codigo"]} className="border-b hover:bg-zinc-50">
                  <td className="p-3 border">{c["Codigo"]}</td>
                  <td className="p-3 border font-medium">{c["Razon Social"]}</td>
                  <td className="p-3 border">{c["CUIT"]}</td>
                  <td className="p-3 border">{c["Provincia"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}