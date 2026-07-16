'use client'
import { useState } from 'react'
import './globals.css'
import { metadata } from './layout-metadata'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <html lang="es">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="manifest" href={metadata.manifest} />
        <meta name="theme-color" content={metadata.themeColor} />
        <meta name="viewport" content={metadata.viewport} />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="flex min-h-screen bg-gray-50">
        
        {/* Overlay sin blur: solo el oscurecido */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Barra Lateral */}
        <aside className={`
          fixed md:sticky top-0 z-50 h-screen 
          ${isSidebarOpen ? 'w-64' : 'w-0'} 
          transition-all duration-300 ease-in-out bg-slate-900 text-white shadow-2xl overflow-hidden
        `}>
          <div className="w-64 h-full flex flex-col"> 
            <div className="p-6 font-bold text-xl border-b border-slate-700 flex justify-between items-center">
              GM CARGO SRL
              <button className="md:hidden p-2" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <nav className="p-4 space-y-2 flex-1">
              <a href="/" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Operaciones</a>
              <a href="/fletes" className="block p-3 hover:bg-slate-700 rounded transition-colors" onClick={() => setSidebarOpen(false)}>Nueva Operación</a>
              <a href="/terminados" className="block p-3 hover:bg-emerald-800 rounded text-emerald-100 font-medium transition-colors" onClick={() => setSidebarOpen(false)}>Terminados</a>
            </nav>
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col min-w-0 w-full">
          <header className="bg-white shadow-sm p-4 flex items-center sticky top-0 z-40">
            <button 
              className="p-2 text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 font-semibold text-slate-700">Sistema de Gestión</span>
          </header>
          
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}