'use client'
import { useState, useRef, useEffect } from 'react'

interface Option {
  label: string;
  value: string;
  sublabel?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  icon,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [busqueda, setBusqueda] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBusqueda(value)
  }, [value])

  // Cerrar el desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtrados = options.filter(opt =>
    opt.label.toLowerCase().includes(busqueda.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={busqueda}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setBusqueda(e.target.value)
            onChange(e.target.value)
            setIsOpen(true)
          }}
          className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 p-2.5 pr-10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 text-sm font-sans shadow-sm"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          {icon || (
            <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú desplegable flotante con estética de la app */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56 overflow-y-auto backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          {filtrados.length > 0 ? (
            filtrados.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onChange(opt.value)
                  setBusqueda(opt.label)
                  setIsOpen(false)
                }}
                className="px-4 py-2.5 hover:bg-sky-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex justify-between items-center border-b border-gray-100 dark:border-slate-800/50 last:border-none"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 uppercase">
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span className="text-xs text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full font-mono">
                    {opt.sublabel}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 italic text-center">
              Sin coincidencias. (Se guardará como nuevo)
            </div>
          )}
        </div>
      )}
    </div>
  )
}