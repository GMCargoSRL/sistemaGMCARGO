import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let fechasTexto = '18/09 – 25/09 – 02/10 – 09/10 – 16/10'

    // 1. Verificar si hay configuración personalizada activa
    const { data: config } = await supabase
      .from('configuracion_firmas')
      .select('modo, fechas_manuales')
      .eq('id', 1)
      .single()

    if (config && config.modo === 'manual' && config.fechas_manuales) {
      fechasTexto = config.fechas_manuales
    } else {
      // 2. Si es automático, calcular desde la tabla 'salidas'
      const { data } = await supabase
        .from('salidas')
        .select('fecha')
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .limit(1)

      if (data && data.length > 0 && data[0].fecha) {
        const proximaFecha = new Date(data[0].fecha)
        const listaFechas: string[] = []

        for (let i = 0; i < 5; i++) {
          const f = new Date(proximaFecha)
          f.setDate(f.getDate() + i * 7)
          const dia = String(f.getDate()).padStart(2, '0')
          const mes = String(f.getMonth() + 1).padStart(2, '0')
          listaFechas.push(`${dia}/${mes}`)
        }
        fechasTexto = listaFechas.join(' – ')
      }
    }

    // 3. Generar la imagen con JSX nativo usando ImageResponse
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#F4F6F9',
            border: '1px solid #D0D7DE',
            borderLeft: '6px solid #1A448F',
            borderRadius: '4px',
            fontFamily: 'sans-serif',
            boxSizing: 'border-box',
            padding: '8px 12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#1A448F',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}
          >
            Servicio Consolidado Terrestre
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#444444',
              textAlign: 'center',
            }}
          >
            EXPORTACIÓN: Origen ARGENTINA → Destino PARAGUAY
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#444444',
              textAlign: 'center',
              marginBottom: '5px',
            }}
          >
            IMPORTACIÓN: Origen PARAGUAY → Destino ARGENTINA
          </span>
          <div
            style={{
              width: '100%',
              backgroundColor: '#E3E9F5',
              padding: '5px 0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#1A448F',
              }}
            >
              Próximas Salidas VIERNES: {fechasTexto}
            </span>
          </div>
          <span
            style={{
              fontSize: '9.5px',
              color: '#555555',
              textAlign: 'center',
            }}
          >
            ▪ Corte operativo &amp; documental / Cut off: Jueves anterior 14:00 hs. &nbsp;|&nbsp; ▪ Llegada a ASUNCIÓN: Todos los Lunes posteriores a la salida
          </span>
        </div>
      ),
      {
        width: 600,
        height: 140,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (err: any) {
    console.error('Error generando banner:', err)
    return new Response('Error al generar la imagen', { status: 500 })
  }
}