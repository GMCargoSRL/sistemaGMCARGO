'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ReporteFlete() {
  const params = useParams()
  const numero_fn = params.numero_fn
  const [flete, setFlete] = useState<any>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getFlete() {
      if (!numero_fn) return
      const { data } = await supabase
        .from('fletes_nacionales')
        .select('*')
        .eq('numero_fn', decodeURIComponent(numero_fn as string))
        .single()
      if (data) setFlete(data)
    }
    getFlete()
  }, [numero_fn])

  const generarPDF = () => {
    if (!flete) return
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()

    // Fondo y Títulos
    doc.addImage("/membrete GM CARGO.jpg", "JPG", -10, 0, 230, 297)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.text("ORDEN DE CARGA", 20, 60)
    
    doc.setTextColor(128, 128, 128)
    doc.setFontSize(10)
    doc.text("Fletes Nacionales", 20, 65)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(`FN: ${flete.numero_fn}`, 160, 60)
    doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 160, 67)

    // Función auxiliar para dibujar cuadros
    const drawBox = (title: string, data: string[], x: number, y: number, w: number, maxWidth: number) => {
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(250, 250, 250)
      
      let allLines: string[] = []
      data.forEach(line => {
        const splitLines = doc.splitTextToSize(line, maxWidth)
        allLines = allLines.concat(splitLines)
      })

      const lineSpacing = 10 
      const h = (allLines.length * lineSpacing) + 15
      
      doc.rect(x, y, w, h, 'FD')
      
      doc.setTextColor(26, 68, 143)
      doc.setFont("helvetica", "bold")
      doc.text(title, x + 5, y + 7)
      
      doc.line(x, y + 10, x + w, y + 10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      
      allLines.forEach((line, i) => {
        doc.text(line, x + 5, y + 18 + (i * lineSpacing))
      })
      return h
    }

    // Dibujo de los bloques
    // Bloques superiores
    drawBox("DETALLES DE OPERACION", [
      `Cliente: ${flete.cliente || ''}`,
      `Fecha/Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString() : '-'}`,
      `Contenedor: ${flete.contenedor_num || ''}`,
      `Tipo: ${flete.contenedor_tipo || '-'}`,
      `Origen: ${flete.origen || ''}`,
      `Destino: ${flete.destino || ''}`
    ], 15, 80, 85, 75)

    drawBox("DATOS DEL EQUIPO", [
      `Chofer: ${flete.chofer || ''}`,
      `Camion: ${flete.patente_camion || ''}`,
      `Semi: ${flete.patente_semi || ''}`
    ], 115, 80, 80, 70)

    // Bloque Devolución
    const hDevolucion = drawBox("DEVOLUCION DE VACIO", [
      `Lugar: ${flete.devolucion_lugar || 'No especificado'}`,
      `Fecha Limite: ${flete.devolucion_fecha || 'No especificada'}`
    ], 15, 170, 175, 160)

    // Bloque Notas (Posicionado dinámicamente con un margen de 10 unidades extra)
    drawBox("INSTRUCCIONES Y NOTAS", [
      flete.notas_adicionales || 'Sin notas adicionales.'
    ], 15, 165 + hDevolucion + 10, 175, 160)

    doc.save(`Orden de Carga ${flete.numero_fn}.pdf`)
  }

  if (!flete) return <div className="p-10">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <div className="bg-white p-12 border shadow-lg mb-8 text-center">
        <h1 className="text-3xl font-bold">ORDEN DE CARGA: {flete.numero_fn}</h1>
      </div>
      <div className="text-center">
        <button 
          onClick={generarPDF} 
          className="bg-blue-900 text-white px-10 py-4 rounded font-bold hover:bg-blue-800 transition"
        >
          DESCARGAR ORDEN DE CARGA
        </button>
      </div>
    </div>
  )
}