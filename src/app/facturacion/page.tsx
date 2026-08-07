"use client";

import React, { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Funciones auxiliares para búsqueda aproximada y resaltado (igual que en principal)
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= bn; i++) matrix[i][0] = i;
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

function obtenerPuntajeSimilitud(valor: any, query: string): number {
  if (!valor) return 0;
  const strVal = String(valor).toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  if (strVal === q) return 1000;

  let baseScore = 0;
  if (strVal.startsWith(q)) baseScore = 500;
  else if (strVal.includes(q)) baseScore = 200;

  const palabrasQuery = q.split(/\s+/);
  const tokensVal = strVal.split(/[\s-_]+/);

  let tokenScoreTotal = 0;
  let coincidenciaLaxa = false;

  palabrasQuery.forEach(pq => {
    if (pq.length === 0) return;
    let bestTokenScore = 0;
    
    tokensVal.forEach(token => {
      if (token === pq) {
        bestTokenScore = Math.max(bestTokenScore, 100);
      } else if (token.startsWith(pq)) {
        bestTokenScore = Math.max(bestTokenScore, 80);
      } else if (token.includes(pq) || pq.includes(token)) {
        bestTokenScore = Math.max(bestTokenScore, 50);
      } else {
        const maxDist = pq.length <= 4 ? 1 : 2;
        if (Math.abs(token.length - pq.length) <= maxDist) {
          const dist = levenshtein(token, pq);
          if (dist <= maxDist) {
            bestTokenScore = Math.max(bestTokenScore, 30 - (dist * 10));
          }
        }
      }
    });
    
    if (bestTokenScore > 0) {
      coincidenciaLaxa = true;
      tokenScoreTotal += bestTokenScore;
    }
  });

  if (coincidenciaLaxa || baseScore > 0) {
    return Math.max(baseScore, tokenScoreTotal);
  }
  
  return 0;
}

function highlightMatch(text: any, query: string): React.ReactNode {
  if (!text) return '-';
  const strText = String(text);
  const q = query.trim().toLowerCase();
  if (!q) return strText;

  const lowerText = strText.toLowerCase();
  let index = lowerText.indexOf(q);
  if (index !== -1) {
    const before = strText.substring(0, index);
    const match = strText.substring(index, index + q.length);
    const after = strText.substring(index + q.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{match}</mark>
        {highlightMatch(after, q)}
      </>
    );
  }

  const palabrasQuery = q.split(/\s+/).filter(p => p.length > 0);
  if (palabrasQuery.length === 0) return strText;

  const parts = strText.split(/([\s-_]+)/);
  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    const isMatched = palabrasQuery.some(pq => {
      if (lowerPart.includes(pq) || pq.includes(lowerPart)) return true;
      if (lowerPart.length >= 2 && pq.length >= 2) {
        const maxDist = pq.length <= 4 ? 1 : 2;
        return Math.abs(lowerPart.length - pq.length) <= maxDist && levenshtein(lowerPart, pq) <= maxDist;
      }
      return false;
    });

    if (isMatched && part.trim().length > 0) {
      return <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>;
    }
    return part;
  });
}

export default function FacturacionPage() {
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [criterioOrden, setCriterioOrden] = useState<'fecha_asc' | 'fecha_desc' | 'operacion_asc' | 'operacion_desc'>('fecha_asc');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const obtenerFacturacionPendiente = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('fletes_nacionales')
      .select('*')
      .eq('estado', 'TERMINADO');

    if (error) {
      console.error("Error al cargar facturación:", error.message);
    } else if (data) {
      const pendientes = data.filter((op: any) => {
        const estFact = String(op.estado_facturacion || '').trim().toLowerCase();
        return estFact === 'si';
      });
      setOperaciones(pendientes);
    }
    setCargando(false);
  };

  useEffect(() => {
    obtenerFacturacionPendiente();
  }, []);

  const handleGenerarFactura = async (numeroFn: string) => {
    const { error } = await supabase
      .from('fletes_nacionales')
      .update({ 
        estado_facturacion: 'FACTURADO' 
      })
      .eq('numero_fn', numeroFn);

    if (error) {
      setMensajeAlerta("Error al actualizar la factura: " + error.message);
      return;
    }

    setMensajeAlerta(`${numeroFn} fue marcada como facturada, se envió automáticamente a "Terminados"`);
    const nuevasOperaciones = operaciones.filter(op => op.numero_fn !== numeroFn);
    setOperaciones(nuevasOperaciones);
    setSeleccionadas(seleccionadas.filter(id => id !== numeroFn));
    if (nuevasOperaciones.length === 0) {
      setModoSeleccion(false);
    }
  };

  const toggleSeleccion = (numeroFn: string) => {
    if (seleccionadas.includes(numeroFn)) {
      setSeleccionadas(seleccionadas.filter(id => id !== numeroFn));
    } else {
      setSeleccionadas([...seleccionadas, numeroFn]);
    }
  };

  const toggleSeleccionarTodas = () => {
    if (seleccionadas.length === operaciones.length) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas(operaciones.map(op => op.numero_fn));
    }
  };

  const generarPDFListaSeleccionadas = () => {
    if (seleccionadas.length === 0) {
      setMensajeAlerta("Por favor, selecciona al menos una operación para imprimir la lista.");
      return;
    }

    const { jsPDF } = require("jspdf");
    const doc = new jsPDF();

    doc.addImage("/membrete GM CARGO.jpg", "JPG", -10, 0, 230, 297);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LISTA DE OPERACIONES A FACTURAR", 10, 35);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 10, 43);
    doc.text(`Total de operaciones seleccionadas: ${seleccionadas.length}`, 10, 50);

    let y = 60;
    doc.setFillColor(240, 243, 246);
    doc.rect(10, y - 5, 190, 8, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    const cols = [
      { title: "ID Carga", x: 11, w: 18 },
      { title: "Cliente", x: 30, w: 27 },
      { title: "Ruta", x: 58, w: 41 },
      { title: "F. Carga", x: 100, w: 22 },
      { title: "Tipo Carga", x: 123, w: 28 },
      { title: "Chofer / Unid.", x: 152, w: 23 },
      { title: "Tipo Op.", x: 176, w: 23 },
    ];

    cols.forEach(col => {
      doc.text(col.title, col.x, y);
    });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    const opsSeleccionadasData = operaciones.filter(op => seleccionadas.includes(op.numero_fn));

    opsSeleccionadasData.forEach((op) => {
      const idCarga = String(op.numero_fn || '-');
      const cliente = String(op.cliente || '-');
      
      const tipoOpLower = String(op.tipo_operacion || '').trim().toLowerCase();
      let rutaStr = '';
      if (tipoOpLower === 'importacion') {
        rutaStr = `De: ${op.origen || '-'} / A: ${op.destino || '-'}`;
      } else if (tipoOpLower === 'exportacion') {
        rutaStr = `Vacío: ${op.lugar_carga_vacio || '-'}\nEntrega: ${op.lugar_entrega_lleno || '-'}`;
      } else if (tipoOpLower === 'carga_suelta') {
        rutaStr = `De: ${op.lugar_carga || '-'} / A: ${op.lugar_entrega || '-'}`;
      } else {
        rutaStr = `De: ${op.origen || op.lugar_carga || '-'} / A: ${op.destino || op.lugar_entrega || '-'}`;
      }

      const fechaCargaVal = op.fecha_hora || op.fecha_carga_vacio || op.fecha_hora_carga;
      const fechaCargaStr = fechaCargaVal 
        ? new Date(fechaCargaVal).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) 
        : '-';

      let tipoCargaStr = '';
      if (tipoOpLower === 'carga_suelta') {
        tipoCargaStr = `Suelta: ${op.cantidad_bultos || '0'} b.`;
      } else {
        tipoCargaStr = `Cont: ${op.contenedor_num || 'S/N'}`;
      }

      const choferStr = `${op.chofer || 'Sin chofer'}\nCam: ${op.patente_camion || '-'}`;
      const tipoOpStr = String(op.tipo_operacion || '-').toUpperCase().replace(/_/g, ' ');

      const linesId = doc.splitTextToSize(idCarga, cols[0].w);
      const linesCliente = doc.splitTextToSize(cliente, cols[1].w);
      const linesRuta = doc.splitTextToSize(rutaStr, cols[2].w);
      const linesFecha = doc.splitTextToSize(fechaCargaStr, cols[3].w);
      const linesTipoCarga = doc.splitTextToSize(tipoCargaStr, cols[4].w);
      const linesChofer = doc.splitTextToSize(choferStr, cols[5].w);
      const linesTipoOp = doc.splitTextToSize(tipoOpStr, cols[6].w);

      const maxLines = Math.max(
        linesId.length,
        linesCliente.length,
        linesRuta.length,
        linesFecha.length,
        linesTipoCarga.length,
        linesChofer.length,
        linesTipoOp.length
      );

      const lineHeight = 3.2;
      const rowHeight = maxLines * lineHeight + 5;

      if (y + rowHeight > 275) {
        doc.addPage();
        doc.addImage("/membrete GM CARGO.jpg", "JPG", -10, 0, 230, 297);
        y = 40;
        doc.setFillColor(240, 243, 246);
        doc.rect(10, y - 5, 190, 8, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        cols.forEach(col => {
          doc.text(col.title, col.x, y);
        });
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
      }

      const drawCenteredText = (lines: string[], x: number) => {
        const textBlockHeight = lines.length * lineHeight;
        const startYText = y + ((rowHeight - textBlockHeight) / 2) + 2.5;
        doc.text(lines, x, startYText);
      };

      drawCenteredText(linesId, cols[0].x);
      drawCenteredText(linesCliente, cols[1].x);
      drawCenteredText(linesRuta, cols[2].x);
      drawCenteredText(linesFecha, cols[3].x);
      drawCenteredText(linesTipoCarga, cols[4].x);
      drawCenteredText(linesChofer, cols[5].x);
      drawCenteredText(linesTipoOp, cols[6].x);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(10, y + rowHeight, 200, y + rowHeight);

      y += rowHeight;
    });

    doc.save(`Lista_Operaciones_Facturar_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const generarPDF = async (flete: any) => {
    const { jsPDF } = require("jspdf");
    const doc = new jsPDF();

    let dniChofer = 'No informado';

    if (flete.dni_chofer) {
      dniChofer = flete.dni_chofer;
    } else if (flete.chofer) {
      const { data: choferData } = await supabase
        .from('choferes')
        .select('"DOC. ID."')
        .eq('CHOFER', flete.chofer)
        .maybeSingle();
      
      if (choferData && choferData['DOC. ID.']) {
        dniChofer = choferData['DOC. ID.'];
      }
    }

    doc.addImage("/membrete GM CARGO.jpg", "JPG", -10, 0, 230, 297);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ORDEN DE CARGA", 20, 40);
    doc.setFontSize(12);
    doc.text(`${flete.numero_fn || ''}`, 160, 40);
    doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 160, 45);

    const drawBox = (title: string, data: string[], x: number, y: number, w: number, maxWidth: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      let allLines: string[] = [];
      data.forEach(line => { allLines = allLines.concat(doc.splitTextToSize(line, maxWidth)); });
      const h = (allLines.length * 8) + 18;
      doc.rect(x, y, w, h, 'FD');
      doc.setTextColor(26, 68, 143);
      doc.setFont("helvetica", "bold");
      doc.text(title, x + 5, y + 7);
      doc.line(x, y + 10, x + w, y + 10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      allLines.forEach((line, i) => { doc.text(line, x + 5, y + 18 + (i * 8)); });
      return h; 
    };

    const startY = 60;
    const valorTramPDF = String(flete.tram || flete.trm || 'NO').trim().toUpperCase();

    const tipoOperacionTexto = flete.tipo_operacion === 'importacion'
      ? `IMPORTACION (TRAM: ${valorTramPDF})`
      : (flete.tipo_operacion?.toUpperCase() || ' ');

    const datosGenerales = [
      `Cliente: ${flete.cliente || ' '}`,
      `Tipo Operación: ${tipoOperacionTexto}`,
      `Documento Aduanero: ${flete.documento_aduanero || ' '}`
    ];

    let datosEspecificos: string[] = [];
    if (flete.tipo_operacion === 'importacion') {
      datosEspecificos = [
        `Contenedor: ${flete.contenedor_num || ' '} (${flete.contenedor_tipo || ' '})`,
        `Origen: ${flete.origen || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora ? new Date(flete.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Paradas: ${flete.paradas || 'Ninguna'}`,
        `Destino: ${flete.destino || ' '}`,
        `Devolución: ${flete.lugar_devolucion || ' '}`,
        `Libre hasta: ${flete.libre_hasta || ' '}`
      ];
    } else if (flete.tipo_operacion === 'exportacion') {
      datosEspecificos = [
        `Lugar Carga Vacío: ${flete.lugar_carga_vacio || ' '}`,
        `Fecha y Hora: ${flete.fecha_carga_vacio ? new Date(flete.fecha_carga_vacio).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Lugar Carga Mercadería: ${flete.lugar_carga_mercaderia || ' '}`,
        `Lugar Entrega Lleno: ${flete.lugar_entrega_lleno || ' '}`
      ];
    } else if (flete.tipo_operacion === 'carga_suelta') {
      datosEspecificos = [
        `Lugar Carga: ${flete.lugar_carga || ' '}`,
        `Fecha y Hora: ${flete.fecha_hora_carga ? new Date(flete.fecha_hora_carga).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ' '}`,
        `Lugar Entrega: ${flete.lugar_entrega || ' '}`,
        `Cantidad Bultos: ${flete.cantidad_bultos || ' '}`,
        `Peso Bruto: ${flete.peso_bruto || ' '}`
      ];
    }

    const hGen = drawBox("DETALLES DE LA OPERACION", [...datosGenerales, ...datosEspecificos], 15, startY, 85, 75);
    
    const hEquipo = drawBox("DATOS DEL EQUIPO", [
      `Chofer: ${flete.chofer || ' '}`,
      `DNI: ${dniChofer}`, 
      `Teléfono: ${flete.telefono_chofer || 'No informado'}`, 
      `Patente Camión: ${flete.patente_camion || ' '}`,
      `Patente Semi: ${flete.patente_semi || ' '}`
    ], 115, startY, 80, 70);

    drawBox("INSTRUCCIONES Y NOTAS", [flete.notas_adicionales || flete.notes_adicionales || 'Sin notas adicionales.'], 15, startY + Math.max(hGen, hEquipo) + 10, 180, 170);

    doc.save(`Orden Carga ${flete.numero_fn}.pdf`);
  };

  // Filtrado y ordenamiento similar a la página principal
  const queryBusqueda = busqueda.trim().toLowerCase();
  
  const operacionesConPuntaje = operaciones.map(op => {
    if (!queryBusqueda) return { ...op, _searchScore: 1 };
    let maxScore = 0;
    Object.values(op).forEach(valor => {
      const score = obtenerPuntajeSimilitud(valor, queryBusqueda);
      if (score > maxScore) maxScore = score;
    });
    return { ...op, _searchScore: maxScore };
  });

  const operacionesFiltradas = queryBusqueda 
    ? operacionesConPuntaje.filter(op => op._searchScore > 0)
    : operacionesConPuntaje;

  const operacionesOrdenadasFinal = [...operacionesFiltradas].sort((a, b) => {
    if (queryBusqueda) {
      if (a._searchScore !== b._searchScore) {
        return b._searchScore - a._searchScore;
      }
    }

    if (criterioOrden === 'operacion_asc' || criterioOrden === 'operacion_desc') {
      const opA = String(a.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const opB = String(b.numero_fn || '').replace(/\s+/g, '').toLowerCase();
      const comparacion = opA.localeCompare(opB, undefined, { numeric: true, sensitivity: 'base' });
      return criterioOrden === 'operacion_asc' ? comparacion : -comparacion;
    }

    const fechaA = new Date(a.fecha_hora || a.fecha_carga_vacio || a.fecha_hora_carga || 0).getTime();
    const fechaB = new Date(b.fecha_hora || b.fecha_carga_vacio || b.fecha_hora_carga || 0).getTime();

    if (criterioOrden === 'fecha_asc') {
      return fechaA - fechaB;
    } else {
      return fechaB - fechaA;
    }
  });

  const colSpanTotal = modoSeleccion ? 10 : 9;

  return (
    <div className="p-4 md:p-8 min-w-full w-fit min-h-screen bg-gray-50/50">
      {/* Cabecera idéntica a la principal adaptada para facturación */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky left-0 max-w-[100vw]">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">Facturación Pendiente</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Registro de operaciones completadas pendientes de facturar.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 text-sm">
              🔍
            </span>
            <input 
              type="text" 
              placeholder="Buscar operación, chofer, cliente..." 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-gray-800 placeholder-gray-400" 
              onChange={(e) => setBusqueda(e.target.value)} 
            />
          </div>
          
          <select 
            value={criterioOrden} 
            onChange={(e) => setCriterioOrden(e.target.value as any)}
            className="bg-white border border-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 transition shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-auto shrink-0"
          >
            <option value="fecha_asc">📅 Más Próximos</option>
            <option value="fecha_desc">📅 Más Lejanos</option>
            <option value="operacion_asc">🔤 Operación: A - Z</option>
            <option value="operacion_desc">🔤 Operación: Z - A</option>
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {operaciones.length > 0 && (
              <>
                {!modoSeleccion ? (
                  <button
                    onClick={() => setModoSeleccion(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto"
                  >
                    📄 Imprimir Lista
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={generarPDFListaSeleccionadas}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full ${
                        seleccionadas.length > 0 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      📄 PDF ({seleccionadas.length})
                    </button>
                    <button
                      onClick={() => {
                        setModoSeleccion(false);
                        setSeleccionadas([]);
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                      title="Cancelar selección"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </>
            )}
            <button 
              onClick={obtenerFacturacionPendiente}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-full w-fit bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto min-w-[900px]">
            <thead className="bg-gray-50 text-xs md:text-sm text-gray-600 border-b border-gray-200">
              <tr>
                {modoSeleccion && (
                  <th className="p-3 md:p-4 text-center w-12 align-middle">
                    <input 
                      type="checkbox"
                      checked={operaciones.length > 0 && seleccionadas.length === operaciones.length}
                      onChange={toggleSeleccionarTodas}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 md:p-4 font-bold align-middle">ID Carga</th>
                <th className="p-3 md:p-4 font-bold align-middle">Cliente</th>
                <th className="p-3 md:p-4 font-bold align-middle min-w-[260px]">Ruta</th>
                <th className="p-3 md:p-4 font-bold align-middle">Fecha de Carga</th>
                <th className="p-3 md:p-4 font-bold align-middle">Tipo de Carga</th>
                <th className="p-3 md:p-4 font-bold align-middle">Chofer y Unidad</th>
                <th className="p-3 md:p-4 font-bold align-middle min-w-[120px]">Notas</th>
                <th className="p-3 md:p-4 font-bold align-middle">Tipo Op.</th>
                <th className="p-3 md:p-4 font-bold align-middle text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-xs md:text-sm">
              {cargando ? (
                <tr>
                  <td colSpan={colSpanTotal} className="p-12 text-center text-gray-400 text-base">
                    Cargando operaciones pendientes...
                  </td>
                </tr>
              ) : operacionesOrdenadasFinal.length === 0 ? (
                <tr>
                  <td colSpan={colSpanTotal} className="p-12 text-center text-gray-500 text-base">
                    No hay operaciones pendientes de facturar que coincidan con la búsqueda. ¡Todo al día! 🎉
                  </td>
                </tr>
              ) : (
                operacionesOrdenadasFinal.map((op) => {
                  const fechaFin = op.fecha_terminado || op.updated_at || op.fecha_hora;
                  const fechaFormateada = fechaFin 
                    ? new Date(fechaFin).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                    : '-';

                  const fechaCargaVal = op.fecha_hora || op.fecha_carga_vacio || op.fecha_hora_carga;
                  const fechaCargaFormateada = fechaCargaVal 
                    ? new Date(fechaCargaVal).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) 
                    : '-';

                  const tipoOpLower = String(op.tipo_operacion || '').trim().toLowerCase();

                  let detalleCarga = '';
                  if (tipoOpLower === 'carga_suelta') {
                    detalleCarga = `Carga Suelta: ${op.cantidad_bultos || '0'} bultos ${op.peso_bruto ? `(${op.peso_bruto})` : ''}`;
                  } else {
                    detalleCarga = `Contenedor: ${op.contenedor_num || 'S/N'} (${op.contenedor_tipo || 'N/A'})`;
                  }

                  const notasCompletas = op.notas_adicionales || op.notes_adicionales || op.notas || op.observaciones || '';
                  const notasCortas = notasCompletas.length > 25 
                    ? notasCompletas.substring(0, 25) + '...' 
                    : (notasCompletas || '-');

                  const estaSeleccionada = seleccionadas.includes(op.numero_fn);

                  return (
                    <tr key={op.numero_fn} className={`transition-colors ${estaSeleccionada ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}>
                      {modoSeleccion && (
                        <td className="p-3 md:p-4 text-center whitespace-nowrap align-middle">
                          <input 
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => toggleSeleccion(op.numero_fn)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="p-3 md:p-4 whitespace-nowrap align-middle">
                        <div className="font-bold text-blue-600 text-sm">{highlightMatch(op.numero_fn, busqueda)}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          Terminado: {fechaFormateada}
                        </div>
                      </td>

                      <td className="p-3 md:p-4 whitespace-nowrap align-middle">
                        <div className="font-bold text-gray-900 text-sm">{highlightMatch(op.cliente || '-', busqueda)}</div>
                      </td>

                      <td className="p-3 md:p-4 min-w-[260px] align-middle">
                        {tipoOpLower === 'importacion' && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-blue-700 uppercase">Origen:</span>
                              <span className="font-semibold text-blue-700">{highlightMatch(op.origen || 'Sin origen', busqueda)}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-cyan-700 uppercase">Destino:</span>
                              <span className="font-semibold text-cyan-700">{highlightMatch(op.destino || 'Sin destino', busqueda)}</span>
                            </div>
                            {op.paradas && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-amber-700 uppercase">Paradas:</span>
                                <span className="font-semibold text-amber-700">{highlightMatch(op.paradas, busqueda)}</span>
                              </div>
                            )}
                            {op.lugar_devolucion && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-purple-700 uppercase">Devolución:</span>
                                <span className="font-semibold text-purple-700">{highlightMatch(op.lugar_devolucion, busqueda)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {tipoOpLower === 'exportacion' && (
                          <div className="space-y-1.5">
                            {op.lugar_carga_vacio && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-emerald-700 uppercase">Vacío:</span>
                                <span className="font-semibold text-emerald-700">{highlightMatch(op.lugar_carga_vacio, busqueda)}</span>
                              </div>
                            )}
                            {op.lugar_carga_mercaderia && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-amber-700 uppercase">Lleno:</span>
                                <span className="font-semibold text-amber-700">{highlightMatch(op.lugar_carga_mercaderia, busqueda)}</span>
                              </div>
                            )}
                            {op.lugar_entrega_lleno && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-blue-700 uppercase">Entrega:</span>
                                <span className="font-semibold text-blue-700">{highlightMatch(op.lugar_entrega_lleno, busqueda)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {tipoOpLower === 'carga_suelta' && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-indigo-700 uppercase">Desde:</span>
                              <span className="font-semibold text-indigo-700">{highlightMatch(op.lugar_carga || 'Sin origen', busqueda)}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-rose-700 uppercase">Hasta:</span>
                              <span className="font-semibold text-rose-700">{highlightMatch(op.lugar_entrega || 'Sin destino', busqueda)}</span>
                            </div>
                          </div>
                        )}

                        {!['importacion', 'exportacion', 'carga_suelta'].includes(tipoOpLower) && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-gray-700 uppercase">De:</span>
                              <span className="font-semibold text-gray-700">{highlightMatch(op.origen || op.lugar_carga || '-', busqueda)}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-gray-700 uppercase">A:</span>
                              <span className="font-semibold text-gray-700">{highlightMatch(op.destino || op.lugar_entrega || '-', busqueda)}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-3 md:p-4 whitespace-nowrap text-gray-800 font-medium text-sm align-middle">
                        {fechaCargaFormateada}
                      </td>

                      <td className="p-3 md:p-4 text-gray-800 align-middle">
                        <div className="font-medium text-sm">{highlightMatch(detalleCarga, busqueda)}</div>
                        {op.documento_aduanero && (
                          <div className="text-xs text-gray-500 mt-1 font-medium">Doc: {highlightMatch(op.documento_aduanero, busqueda)}</div>
                        )}
                      </td>

                      <td className="p-3 md:p-4 whitespace-nowrap align-middle">
                        <div className="font-bold text-gray-900 text-sm">{highlightMatch(op.chofer || 'Sin chofer', busqueda)}</div>
                        <div className="text-sm text-gray-600 mt-1 flex gap-3">
                          {op.patente_camion && <span>Camión: <strong className="text-gray-900">{highlightMatch(op.patente_camion, busqueda)}</strong></span>}
                          {op.patente_semi && <span>Semi: <strong className="text-gray-900">{highlightMatch(op.patente_semi, busqueda)}</strong></span>}
                        </div>
                      </td>

                      {/* Cuadro de notas idéntico y desplegable al de la página principal */}
                      <td className="p-3 md:p-4 relative break-words whitespace-normal align-middle">
                        {notasCompletas ? (
                          <details className="cursor-pointer group">
                            <summary className="list-none text-gray-700 hover:text-blue-600 font-medium block select-none break-words">
                              {highlightMatch(notasCortas, busqueda)}
                            </summary>
                            <div className="absolute right-0 md:left-0 z-20 p-4 mt-2 bg-white border rounded-lg shadow-xl w-64 text-sm text-gray-800 break-words whitespace-pre-wrap">
                              {highlightMatch(notasCompletas, busqueda)}
                            </div>
                          </details>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="p-3 md:p-4 whitespace-nowrap align-middle">
                        <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase">
                          {highlightMatch(op.tipo_operacion || 'N/A', busqueda)}
                        </span>
                      </td>

                      <td className="p-3 md:p-4 whitespace-nowrap text-center align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => handleGenerarFactura(op.numero_fn)}
                            className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-xl shadow-sm transition-colors text-xs font-bold cursor-pointer w-full"
                          >
                            FACTURADO
                          </button>
                          <button
                            onClick={() => generarPDF(op)}
                            className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded-xl shadow-sm transition-colors text-xs font-bold cursor-pointer w-full"
                          >
                            PDF Op.
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mensajeAlerta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full text-center border border-gray-100 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-inner">
              💲
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Aviso del Sistema</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{mensajeAlerta}</p>
            <button
              onClick={() => setMensajeAlerta(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition duration-200 text-sm cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}