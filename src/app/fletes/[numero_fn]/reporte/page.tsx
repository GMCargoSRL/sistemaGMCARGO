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
    const { jsPDF } = require("jspdf");
    const doc = new jsPDF();

    const fechaHoraFormateada = flete.fecha_hora 
      ? new Date(flete.fecha_hora).toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false
        }) 
      : '-';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("GM CARGO & COMEX", 20, 20);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("GM CARGO S.R.L. | Av. Belgrano 687 Piso 3 Of.12 | Buenos Aires | Argentina", 20, 25);
    doc.text("Tel: +54 11 2150 4310 | info@gmcargo.com | www.gmcargo.com", 20, 29);
    doc.line(20, 32, 190, 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ORDEN DE FLETE", 20, 45);
    doc.setFontSize(10);
    doc.text("Documento de Transporte Nacional", 20, 50);
    doc.text(`FN: ${flete.numero_fn}`, 160, 45);
    doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 160, 50);
    doc.line(20, 55, 190, 55);

    doc.setFontSize(10);
    doc.text("DETALLES DE OPERACIÓN", 20, 65);
    doc.rect(20, 68, 85, 40);
    doc.text(`Cliente: ${flete.cliente || ''}`, 25, 75);
    doc.text(`Fecha/Hora Carga: ${fechaHoraFormateada}`, 25, 82);
    doc.text(`Contenedor: ${flete.contenedor_num || ''}`, 25, 89);
    doc.text(`Origen: ${flete.origen || ''}`, 25, 96);
    doc.text(`Destino: ${flete.destino || ''}`, 25, 103);

    doc.text("DATOS DEL EQUIPO", 115, 65);
    doc.rect(115, 68, 75, 40);
    doc.text(`Chofer: ${flete.chofer || ''}`, 120, 75);
    doc.text(`Camión: ${flete.patente_camion || ''}`, 120, 82);
    doc.text(`Semi: ${flete.patente_semi || ''}`, 120, 89);

    doc.text("INSTRUCCIONES Y NOTAS", 20, 120);
    doc.rect(20, 123, 170, 30);
    doc.text(doc.splitTextToSize(flete.notas_adicionales || '', 165), 25, 130);

    doc.save(`Orden_Flete_${flete.numero_fn}.pdf`);
  };

  if (!flete) return <div className="p-10">Cargando datos...</div>

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <div className="bg-white p-12 border shadow-lg mb-8">
        <h2 className="text-xl font-bold border-b pb-4 mb-6">GM CARGO & COMEX</h2>
        <h1 className="text-3xl font-bold mb-2">ORDEN DE FLETE: {flete.numero_fn}</h1>
        
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <h3 className="font-bold border-b mb-2">DETALLES DE OPERACIÓN</h3>
            <p>Cliente: {flete.cliente}</p>
            <p>Fecha/Hora Carga: {flete.fecha_hora 
              ? new Date(flete.fecha_hora).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: false
                }) 
              : '-'}</p>
            <p>Contenedor: {flete.contenedor_num}</p>
            <p>Origen: {flete.origen}</p>
            <p>Destino: {flete.destino}</p>
          </div>
          <div>
            <h3 className="font-bold border-b mb-2">DATOS DEL EQUIPO</h3>
            <p>Chofer: {flete.chofer}</p>
            <p>Camión: {flete.patente_camion}</p>
            <p>Semi: {flete.patente_semi}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-bold border-b mb-2">INSTRUCCIONES Y NOTAS</h3>
          <div className="border p-4 min-h-[100px] bg-gray-50 text-sm">
            {flete.notas_adicionales}
          </div>
        </div>
      </div>

      <div className="text-center">
        <button 
          onClick={generarPDF}
          className="bg-black text-white px-10 py-4 rounded font-bold hover:bg-gray-800 transition"
        >
          DESCARGAR PDF
        </button>
      </div>
    </div>
  )
}