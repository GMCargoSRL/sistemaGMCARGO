"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function FacturacionPage() {
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);

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

  const colSpanTotal = modoSeleccion ? 10 : 9;

  return (
    <div className="p-6 max-w-[95vw] mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Facturación Pendiente</h1>
          <p className="text-gray-500 mt-2">
            Operaciones terminadas con estado de facturación en &quot;SI&quot;.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {operaciones.length > 0 && (
            <>
              {!modoSeleccion ? (
                <button
                  onClick={() => setModoSeleccion(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  📄 Imprimir Lista
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={generarPDFListaSeleccionadas}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm ${
                      seleccionadas.length > 0 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    📄 Generar PDF ({seleccionadas.length})
                  </button>
                  <button
                    onClick={() => {
                      setModoSeleccion(false);
                      setSeleccionadas([]);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
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
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                {modoSeleccion && (
                  <th className="px-4 py-4 text-center w-12">
                    <input 
                      type="checkbox"
                      checked={operaciones.length > 0 && seleccionadas.length === operaciones.length}
                      onChange={toggleSeleccionarTodas}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-5 py-4 text-left">ID Carga</th>
                <th className="px-5 py-4 text-left">Cliente</th>
                <th className="px-5 py-4 text-left">Ruta</th>
                <th className="px-5 py-4 text-left">Fecha de Carga</th>
                <th className="px-5 py-4 text-left">Tipo de Carga</th>
                <th className="px-5 py-4 text-left">Chofer y Unidad</th>
                <th className="px-5 py-4 text-left">Notas</th>
                <th className="px-5 py-4 text-left">Tipo Op.</th>
                <th className="px-5 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {cargando ? (
                <tr>
                  <td colSpan={colSpanTotal} className="px-6 py-12 text-center text-gray-400 text-base">
                    Cargando operaciones pendientes...
                  </td>
                </tr>
              ) : operaciones.length === 0 ? (
                <tr>
                  <td colSpan={colSpanTotal} className="px-6 py-12 text-center text-gray-500 text-base">
                    No hay operaciones pendientes de facturar. ¡Todo al día! 🎉
                  </td>
                </tr>
              ) : (
                operaciones.map((op) => {
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

                  const notas = op.notas_adicionales || op.notas_adionale || op.notas || op.observaciones || '';
                  const estaSeleccionada = seleccionadas.includes(op.numero_fn);

                  return (
                    <tr key={op.numero_fn} className={`transition-colors ${estaSeleccionada ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}>
                      {modoSeleccion && (
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <input 
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => toggleSeleccion(op.numero_fn)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-blue-600 text-sm">{op.numero_fn}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          Terminado: {fechaFormateada}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">{op.cliente || '-'}</div>
                      </td>

                      <td className="px-5 py-4 min-w-[260px]">
                        {tipoOpLower === 'importacion' && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-blue-700 uppercase">Origen:</span>
                              <span className="font-semibold text-blue-700">{op.origen || 'Sin origen'}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-cyan-700 uppercase">Destino:</span>
                              <span className="font-semibold text-cyan-700">{op.destino || 'Sin destino'}</span>
                            </div>
                            {op.paradas && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-amber-700 uppercase">Paradas:</span>
                                <span className="font-semibold text-amber-700">{op.paradas}</span>
                              </div>
                            )}
                            {op.lugar_devolucion && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-purple-700 uppercase">Devolución:</span>
                                <span className="font-semibold text-purple-700">{op.lugar_devolucion}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {tipoOpLower === 'exportacion' && (
                          <div className="space-y-1.5">
                            {op.lugar_carga_vacio && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-emerald-700 uppercase">Vacío:</span>
                                <span className="font-semibold text-emerald-700">{op.lugar_carga_vacio}</span>
                              </div>
                            )}
                            {op.lugar_carga_mercaderia && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-amber-700 uppercase">Lleno:</span>
                                <span className="font-semibold text-amber-700">{op.lugar_carga_mercaderia}</span>
                              </div>
                            )}
                            {op.lugar_entrega_lleno && (
                              <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                                <span className="font-bold text-blue-700 uppercase">Entrega:</span>
                                <span className="font-semibold text-blue-700">{op.lugar_entrega_lleno}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {tipoOpLower === 'carga_suelta' && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-indigo-700 uppercase">Desde:</span>
                              <span className="font-semibold text-indigo-700">{op.lugar_carga || 'Sin origen'}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-rose-700 uppercase">Hasta:</span>
                              <span className="font-semibold text-rose-700">{op.lugar_entrega || 'Sin destino'}</span>
                            </div>
                          </div>
                        )}

                        {!['importacion', 'exportacion', 'carga_suelta'].includes(tipoOpLower) && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-gray-700 uppercase">De:</span>
                              <span className="font-semibold text-gray-700">{op.origen || op.lugar_carga || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[85px_1fr] gap-1 items-start text-xs">
                              <span className="font-bold text-gray-700 uppercase">A:</span>
                              <span className="font-semibold text-gray-700">{op.destino || op.lugar_entrega || '-'}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-gray-800 font-medium text-sm">
                        {fechaCargaFormateada}
                      </td>

                      <td className="px-5 py-4 text-gray-800">
                        <div className="font-medium text-sm">{detalleCarga}</div>
                        {op.documento_aduanero && (
                          <div className="text-xs text-gray-500 mt-1 font-medium">Doc: {op.documento_aduanero}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">{op.chofer || 'Sin chofer'}</div>
                        <div className="text-sm text-gray-600 mt-1 flex gap-3">
                          {op.patente_camion && <span>Camión: <strong className="text-gray-900">{op.patente_camion}</strong></span>}
                          {op.patente_semi && <span>Semi: <strong className="text-gray-900">{op.patente_semi}</strong></span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700 max-w-[220px]">
                        {notas ? (
                          <span title={notas} className="block line-clamp-3 font-medium">
                            {notas}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase">
                          {op.tipo_operacion || 'N/A'}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
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