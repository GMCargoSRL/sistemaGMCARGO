'use client'
import { useState, useEffect } from 'react'
import './globals.css' // Asegúrate de tener tus estilos aquí

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Inicializamos en false para que empiece cerrada
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <html lang="es">
      <body className="flex min-h-screen bg-gray-50">
        
        {/* Barra Lateral */}
        <aside className={`
  fixed md:relative z-50 h-full 
  ${isSidebarOpen ? 'w-64' : 'w-0'} 
  transition-all duration-300 bg-slate-900 text-white overflow-hidden shadow-2xl
`}>
          <div className="p-6 font-bold text-xl border-b border-slate-700">GM CARGO SRL</div>
          <nav className="p-4 space-y-2">
            <a href="/" className="block p-3 hover:bg-slate-700 rounded transition-colors">Dashboard</a>
            <a href="/fletes" className="block p-3 hover:bg-slate-700 rounded transition-colors">Nueva Operación</a>
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col">
          {/* Barra superior con botón hamburguesa */}
          <header className="bg-white shadow-sm p-4 flex items-center">
            <button 
              className="p-2 text-slate-600 hover:bg-gray-100 rounded"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              {/* Icono de hamburguesa */}
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