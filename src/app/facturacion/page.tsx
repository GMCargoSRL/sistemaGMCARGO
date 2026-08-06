"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function FacturacionPage() {
  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

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
        const estFact = String(op.estado_facturaci || op.estado_facturacion || '').trim().toLowerCase();
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
      .update({ estado_facturaci: 'facturado' })
      .eq('numero_fn', numeroFn);

    if (error) {
      alert("Error al actualizar la factura: " + error.message);
      return;
    }

    alert(`¡Factura generada con éxito para la carga ${numeroFn}!`);
    setOperaciones(operaciones.filter(op => op.numero_fn !== numeroFn));
  };

  return (
    <div className="p-6 max-w-[95vw] mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Facturación Pendiente</h1>
          <p className="text-gray-500 mt-2">
            Operaciones terminadas con estado de facturación en &quot;SI&quot;.
          </p>
        </div>
        <button 
          onClick={obtenerFacturacionPendiente}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
        >
          🔄 Actualizar
        </button>
      </div>

      <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
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
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-base">
                    Cargando operaciones pendientes...
                  </td>
                </tr>
              ) : operaciones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-base">
                    No hay operaciones pendientes de facturar. ¡Todo al día! 🎉
                  </td>
                </tr>
              ) : (
                operaciones.map((op) => {
                  // Fecha de finalización / terminado
                  const fechaFin = op.fecha_terminado || op.updated_at || op.fecha_hora;
                  const fechaFormateada = fechaFin 
                    ? new Date(fechaFin).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                    : '-';

                  // Fecha de carga
                  const fechaCargaVal = op.fecha_hora || op.fecha_carga_vacio || op.fecha_hora_carga;
                  const fechaCargaFormateada = fechaCargaVal 
                    ? new Date(fechaCargaVal).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) 
                    : '-';

                  // Ruta (origen, destino, paradas y devolución con respaldo en campos alternativos)
                  const origen = op.origen || op.lugar_carga || op.lugar_carga_vacio || 'Sin origen';
                  const destino = op.destino || op.lugar_entrega || op.lugar_entrega_lleno || op.descarga || op.lugar_descarga || 'Sin destino';
                  const devolucion = op.lugar_devolucion || op.devolucion || op.lugar_devolucion_vacio || '';

                  // Tipo de carga y detalles
                  const tipoOpLower = String(op.tipo_operacion || '').trim().toLowerCase();
                  let detalleCarga = '';
                  if (tipoOpLower === 'carga_suelta') {
                    detalleCarga = `Carga Suelta: ${op.cantidad_bultos || '0'} bultos ${op.peso_bruto ? `(${op.peso_bruto})` : ''}`;
                  } else {
                    detalleCarga = `Contenedor: ${op.contenedor_num || 'S/N'} (${op.contenedor_tipo || 'N/A'})`;
                  }

                  // Notas de la operación apuntando a notas_adicionales
                  const notas = op.notas_adicionales || op.notas_adionale || op.notas || op.observaciones || '';

                  return (
                    <tr key={op.numero_fn} className="hover:bg-gray-50/80 transition-colors">
                      {/* ID Carga */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-blue-600 text-base">{op.numero_fn}</div>
                        <div className="text-sm text-gray-500 font-medium mt-0.5">
                          Terminado: {fechaFormateada}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-base">{op.cliente || '-'}</div>
                      </td>

                      {/* Ruta */}
                      <td className="px-5 py-4">
                        <div className="text-gray-900 font-medium text-sm flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-400">De:</span> {origen}
                        </div>
                        <div className="text-sm text-gray-700 mt-1 flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-400">A:</span> {destino}
                        </div>
                        {op.paradas && (
                          <div className="text-sm text-amber-700 mt-1 font-medium flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-400">Paradas:</span> {op.paradas}
                          </div>
                        )}
                        {devolucion && (
                          <div className="text-sm text-purple-700 mt-1 font-medium flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-400">Devolución:</span> {devolucion}
                          </div>
                        )}
                      </td>

                      {/* Fecha de Carga */}
                      <td className="px-5 py-4 whitespace-nowrap text-gray-800 font-medium text-sm">
                        {fechaCargaFormateada}
                      </td>

                      {/* Tipo de Carga */}
                      <td className="px-5 py-4 text-gray-800">
                        <div className="font-medium text-sm">{detalleCarga}</div>
                        {op.documento_aduanero && (
                          <div className="text-xs text-gray-500 mt-1 font-medium">Doc: {op.documento_aduanero}</div>
                        )}
                      </td>

                      {/* Chofer y Unidad */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">{op.chofer || 'Sin chofer'}</div>
                        <div className="text-sm text-gray-600 mt-1 flex gap-3">
                          {op.patente_camion && <span>Camión: <strong className="text-gray-900">{op.patente_camion}</strong></span>}
                          {op.patente_semi && <span>Semi: <strong className="text-gray-900">{op.patente_semi}</strong></span>}
                        </div>
                      </td>

                      {/* Notas */}
                      <td className="px-5 py-4 text-sm text-gray-700 max-w-[220px]">
                        {notas ? (
                          <span title={notas} className="block line-clamp-3 font-medium">
                            {notas}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Tipo Operación */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase">
                          {op.tipo_operacion || 'N/A'}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleGenerarFactura(op.numero_fn)}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-xl shadow-sm transition-colors text-sm font-bold cursor-pointer"
                        >
                          Facturar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}