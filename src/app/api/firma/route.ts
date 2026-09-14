import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // tu cliente de supabase

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
  }

  // 1. Obtener datos del empleado desde Supabase
  const { data: empleado, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !empleado) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  // 2. Generar el HTML de la firma dinámicamente
  const firmaHtml = `
  <table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; line-height: 1.4; width: 100%; max-width: 620px;">
    <tr>
      <td colspan="2" style="padding-bottom: 12px; color: #555555; font-size: 13px;">Best regards / Cordialmente,</td>
    </tr>
    <tr>
      <td style="border-bottom: 2px solid #1A448F; padding-bottom: 12px; vertical-align: top; width: 105px;">
        <a href="https://www.gmcargo.com" target="_blank">
          <img src="https://www.gmcargo.com/images/logo.png" alt="GM CARGO" width="90" height="90" style="display: block; border: 0;" />
        </a>
      </td>
      <td style="border-bottom: 2px solid #1A448F; padding-bottom: 12px; vertical-align: middle; padding-left: 15px;">
        <span style="font-size: 16px; font-weight: bold; color: #1A448F;">${empleado.nombre_apellido}</span>
        <span style="color: #888888;"> | </span>
        <a href="mailto:${empleado.email}" style="color: #1A448F; text-decoration: none; font-weight: 500;">${empleado.email}</a><br>
        <span style="font-weight: bold; color: #444444; font-size: 13px;">${empleado.cargo}</span>
        <span style="color: #888888;"> | </span>
        <span style="font-weight: bold; color: #1A448F;">GM CARGO SRL</span>
        <span style="color: #888888;"> | </span>
        <a href="https://www.gmcargo.com" style="color: #1A448F; text-decoration: none;">www.gmcargo.com</a>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding-top: 10px; padding-bottom: 15px; font-size: 12px; color: #666666;">
        Belgrano Avenue 687, Floor 3<sup>rd</sup>, Room 12 — Atención / Retiro documental: L a V de 10 a 13 – 14 a 17 hs.<br>
        <strong style="color: #D9534F;">Ph/Fax:</strong> +5411 2150 4310 &nbsp;|&nbsp; +5411 2150 4311 &nbsp;|&nbsp; +5411 4343 2748<br>
        ZC C1092AAG &nbsp;|&nbsp; Buenos Aires — Argentina
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <table cellpadding="12" cellspacing="0" style="width: 100%; border: 1px solid #1A448F; background-color: #F8FAFC; border-radius: 6px; font-size: 12px;">
          <tr>
            <td align="center"><strong style="font-size: 13px; color: #1A448F; text-transform: uppercase;">Servicio Consolidado Terrestre</strong></td>
          </tr>
          <tr>
            <td align="center" style="font-weight: bold; color: #444444;">
              EXPORTACIÓN: Origen ARGENTINA &rarr; Destino PARAGUAY<br>
              IMPORTACIÓN: Origen PARAGUAY &rarr; Destino ARGENTINA
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #EBF3FC; font-weight: bold; color: #1A448F;">
              Próximas Salidas VIERNES: 18/09 – 25/09 – 02/10 – 09/10 – 16/10
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size: 11px; color: #555555;">
              &#9642; <strong>Corte operativo &amp; documental / Cut off:</strong> Jueves anterior 14:00 hs.<br>
              &#9642; <strong>Llegada a ASUNCIÓN:</strong> Todos los Lunes posteriores a la salida.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  return new Response(firmaHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}