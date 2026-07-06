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

    // Colores corporativos (RGB)
    const azul = [26, 68, 143]; 
    const grisOscuro = [70, 70, 70];
    const grisClaro = [245, 245, 245];

    // Logo
    doc.addImage("/logo.png", "PNG", 20, 10, 35, 20);

    // Encabezado
    doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("GM CARGO & COMEX", 65, 20);
    doc.setFontSize(8);
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text("GM CARGO S.R.L. | Av. Belgrano 687 Piso 3 Of.12 | Buenos Aires | Argentina", 65, 25);
    doc.text("Tel: +54 11 2150 4310 | info@gmcargo.com | www.gmcargo.com", 65, 29);
    
    doc.setDrawColor(azul[0], azul[1], azul[2]);
    doc.line(20, 35, 190, 35);

    // Título principal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text("ORDEN DE CARGA", 20, 50);
    doc.setFontSize(10);
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text("Documento de Transporte Nacional", 20, 55);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`FN: ${flete.numero_fn}`, 160, 50);
    doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 160, 55);

    const printText = (text: string, x: number, y: number, maxWidth: number) => {
      doc.text(doc.splitTextToSize(text || '', maxWidth), x, y);
    };

    // --- DETALLES DE OPERACIÓN ---
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(20, 65, 85, 7, 'F');
    doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLES DE OPERACIÓN", 22, 70);
    
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 72, 85, 45);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Cliente: ${flete.cliente || ''}`, 25, 78);
    doc.text(`Fecha/Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR', { hour12: false }) : '-'}`, 25, 85);
    doc.text(`Contenedor: ${flete.contenedor_num || ''}`, 25, 92);
    doc.text(`Origen: ${flete.origen || ''}`, 25, 99);
    printText(`Destino: ${flete.destino || ''}`, 25, 106, 75);

    // --- DATOS DEL EQUIPO ---
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(115, 65, 75, 7, 'F');
    doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.text("DATOS DEL EQUIPO", 117, 70);
    
    doc.rect(115, 72, 75, 45);
    doc.setTextColor(0, 0, 0);
    doc.text(`Chofer: ${flete.chofer || ''}`, 120, 78);
    doc.text(`Camión: ${flete.patente_camion || ''}`, 120, 85);
    doc.text(`Semi: ${flete.patente_semi || ''}`, 120, 92);

    // --- NOTAS ---
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(20, 125, 170, 7, 'F');
    doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.text("INSTRUCCIONES Y NOTAS", 22, 130);
    
    doc.rect(20, 132, 170, 30);
    doc.setTextColor(0, 0, 0);
    printText(flete.notas_adicionales || '', 25, 138, 160);

    doc.save(`Orden_Carga_${flete.numero_fn}.pdf`);
  };

  if (!flete) return <div className="p-10">Cargando datos...</div>

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <div className="bg-white p-12 border shadow-lg mb-8">
        <h2 className="text-xl font-bold border-b pb-4 mb-6">GM CARGO & COMEX</h2>
        <h1 className="text-3xl font-bold mb-2">ORDEN DE CARGA: {flete.numero_fn}</h1>
        {/* ... resto del diseño ... */}
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