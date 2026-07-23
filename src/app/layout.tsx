'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import './globals.css'
import { metadata } from './layout-metadata'
import { Toaster } from 'sonner' // <-- Añadido para las notificaciones flotantes

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [fechaHoraActual, setFechaHoraActual] = useState<string>('')

  // Efecto para actualizar el reloj cada segundo en el encabezado global
  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date()
      setFechaHoraActual(ahora.toLocaleString('es-AR', {
        dateStyle: 'full',
        timeStyle: 'medium'
      }))
    }
    actualizarReloj()
    const timer = setInterval(actualizarReloj, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <html lang="es">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={metadata.themeColor || '#0284c7'} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-gray-50 relative overflow-x-auto m-0 p-0">
        
        {/* Overlay oscuro de fondo cuando la barra está abierta */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Barra Lateral que se abre y se cierra con el botón */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          transition-transform duration-300 ease-in-out bg-slate-900 text-white shadow-2xl flex-shrink-0 flex flex-col h-screen
        `}>
          <div className="w-64 h-full flex flex-col"> 
            <div className="p-6 font-bold text-xl border-b border-slate-700 flex justify-between items-center whitespace-nowrap">
              GM CARGO SRL
              <button className="p-2 text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <nav className="p-4 space-y-2 flex-1 whitespace-nowrap overflow-y-auto">
              <Link href="/" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Operaciones</Link>
              <Link href="/fletes" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Nueva Operación</Link>
              <Link href="/terminados" className="block p-3 hover:bg-emerald-800 rounded text-emerald-100 font-medium transition-colors" onClick={() => setSidebarOpen(false)}>Terminados</Link>
            </nav>
          </div>
        </aside>

        {/* Encabezado Fijo a la pantalla (fuera del scroll horizontal) */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-30 w-full">
          <div className="flex items-center">
            <button 
              className="p-2 text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 font-semibold text-slate-700">Sistema de Gestión</span>
          </div>

          {/* Reloj en tiempo real en la parte superior derecha */}
          <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs capitalize ml-8">
            {fechaHoraActual}
          </div>
        </header>

        {/* Contenedor Principal con límite fluido, scroll inteligente y pt-20 para evitar que el header tape el contenido */}
        <div className="flex flex-col min-h-screen w-full min-w-[1200px] pt-20">
          
          {/* Contenido principal */}
          <main className="flex-1 w-full px-4 py-4">
            {children}
          </main>
        </div>

        {/* Componente que renderiza los avisos flotantes */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}