'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import './globals.css'
import { metadata } from './layout-metadata'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [fechaHoraActual, setFechaHoraActual] = useState<string>('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 🌙 Cargar la preferencia de tema guardada al iniciar
  useEffect(() => {
    const temaGuardado = localStorage.getItem('theme')
    const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (temaGuardado === 'dark' || (!temaGuardado && prefiereOscuro)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // 🔄 Alternar entre modo claro y oscuro
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  // Efecto para actualizar el reloj cada segundo
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
      <body className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-x-auto m-0 p-0 transition-colors duration-300">
        
        {/* 🖼️ Marca de Agua Repetida (Se adapta la opacidad según el modo) */}
        <div className="fixed inset-0 pointer-events-none z-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-12 p-8 opacity-5 dark:opacity-10 dark:invert overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center p-4">
              <Image 
                src="/icon-192x192.png"
                alt="Logo GM Cargo"
                width={120}
                height={120}
                priority={i < 4}
                className="object-contain select-none grayscale -rotate-12"
              />
            </div>
          ))}
        </div>

        {/* Overlay oscuro cuando la barra está abierta */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Barra Lateral */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          transition-transform duration-300 ease-in-out bg-slate-900 text-white shadow-2xl flex-shrink-0 flex flex-col h-screen
        `}>
          <div className="w-64 h-full flex flex-col"> 
            <div className="p-6 font-bold text-xl border-b border-slate-700 flex justify-between items-center whitespace-nowrap">
              GM CARGO SRL
              <button className="p-2 text-slate-400 hover:text-white cursor-pointer" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <nav className="p-4 space-y-2 flex-1 whitespace-nowrap overflow-y-auto">
              <Link href="/" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Operaciones</Link>
              <Link href="/fletes" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Nueva Operación</Link>
              <Link href="/terminados" className="block p-3 hover:bg-emerald-800 rounded text-emerald-100 font-medium transition-colors" onClick={() => setSidebarOpen(false)}>Terminados</Link>
              <Link href="/facturacion" className="block p-3 hover:bg-yellow-600 rounded text-orange-300 font-medium transition-colors" onClick={() => setSidebarOpen(false)}>Facturación</Link>
            </nav>

            {/* 🌙 Botón de cambio de modo en el menú lateral */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
              >
                <span>Modo de Interfaz</span>
                <span className="text-lg">{isDarkMode ? '🌙 Oscuro' : '☀️ Claro'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Encabezado Fijo */}
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs shadow-sm p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-30 w-full border-b border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center">
            <button 
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 font-semibold text-slate-700 dark:text-slate-200">Sistema de Gestión</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón rápido en el Header */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Reloj en tiempo real */}
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-xs capitalize">
              {fechaHoraActual}
            </div>
          </div>
        </header>

        {/* Contenedor Principal */}
        <div className="flex flex-col min-h-screen w-full min-w-[1200px] pt-20 relative z-10">
          <main className="flex-1 w-full px-4 py-4">
            {children}
          </main>
        </div>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}