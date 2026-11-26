import { formatBs, formatPrice } from '@/lib/utils';

export interface PrintReport {
  start?: string;
  end?: string;
  count: number;
  cancelled: number;
  revenue: number;
  revenueBs: number;
  exchangeRate: number;
  tips: number;
  discounts: number;
  avgTicket: number;
  avgRating: number | null;
  ratingCount: number;
  byHour: { hour: number; count: number; total: number }[];
  byMethod: Record<string, { count: number; total: number }>;
  byWaiter: Record<string, { count: number; total: number; cash?: number }>;
  topProducts: Array<{ productName: string; quantity: number; revenue: number }>;
}

export interface PrintBusiness {
  name?: string;
  legalName?: string | null;
  rif?: string | null;
  address?: string | null;
  phone?: string | null;
}

const METHOD: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };
const dateFmt = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '—');
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * Corte de Caja para imprimir: una sola hoja carta/A4, ordenada como un reporte
 * contable (encabezado del negocio, resumen, métodos de pago, cobros por persona,
 * productos, ventas por hora y firmas). Solo se ve al imprimir.
 */
export default function ReportPrintSheet({ data, business, periodLabel }: { data: PrintReport; business: PrintBusiness | null; periodLabel: string }) {
  const start = data.start ? new Date(data.start) : null;
  // "end" es exclusivo (medianoche del día siguiente): se muestra el día anterior
  const end = data.end ? new Date(new Date(data.end).getTime() - 1) : null;
  const sameDay = start && end && dateFmt.format(start) === dateFmt.format(end);
  const methods = Object.entries(data.byMethod).sort((a, b) => b[1].total - a[1].total);
  const people = Object.entries(data.byWaiter).sort((a, b) => b[1].total - a[1].total);
  const hours = data.byHour.filter((h) => h.count > 0);
  const products = data.topProducts.slice(0, 10);
  const cashTotal = data.byMethod.CASH?.total ?? 0;

  return (
    <div className="report-print hidden print:block">
      {/* encabezado */}
      <header className="rp-head">
        <div>
          <h1>{business?.legalName || business?.name || 'Corte de Caja'}</h1>
          <p>
            {[business?.rif && `RIF ${business.rif}`, business?.address, business?.phone && `Tel. ${business.phone}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="rp-head-right">
          <h2>Corte de Caja</h2>
          <p>
            {start && end ? (sameDay ? dateFmt.format(start) : `${dateFmt.format(start)} al ${dateFmt.format(end)}`) : periodLabel}
          </p>
          <p className="rp-muted">Impreso {dateTimeFmt.format(new Date())}</p>
        </div>
      </header>

      {/* resumen */}
      <section className="rp-kpis">
        <div>
          <span>Ventas</span>
          <b>{formatPrice(data.revenue)}</b>
          {data.revenueBs > 0 && <small>{formatBs(data.revenueBs)}</small>}
        </div>
        <div>
          <span>Pedidos</span>
          <b>{data.count}</b>
          <small>{data.cancelled ? `${data.cancelled} cancelado(s)` : 'sin cancelados'}</small>
        </div>
        <div>
          <span>Ticket promedio</span>
          <b>{formatPrice(data.avgTicket)}</b>
        </div>
        <div>
          <span>Propinas</span>
          <b>{formatPrice(data.tips)}</b>
        </div>
        <div>
          <span>Descuentos</span>
          <b>{formatPrice(data.discounts)}</b>
        </div>
        <div>
          <span>Calificación</span>
          <b>{data.avgRating ? `${data.avgRating.toFixed(1)} / 5` : '—'}</b>
          <small>{data.ratingCount ? `${data.ratingCount} opinión(es)` : 'sin opiniones'}</small>
        </div>
      </section>

      <div className="rp-cols">
        <section>
          <h3>Por método de pago</h3>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th className="num">Pedidos</th>
                <th className="num">Total</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {methods.length === 0 && (
                <tr>
                  <td colSpan={4} className="rp-muted">Sin ventas</td>
                </tr>
              )}
              {methods.map(([m, v]) => (
                <tr key={m}>
                  <td>{METHOD[m] ?? m}</td>
                  <td className="num">{v.count}</td>
                  <td className="num">{formatPrice(v.total)}</td>
                  <td className="num">{pct(v.total, data.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{data.count}</td>
                <td className="num">{formatPrice(data.revenue)}</td>
                <td className="num">{data.revenue > 0 ? '100%' : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section>
          <h3>Cobros por persona</h3>
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th className="num">Pedidos</th>
                <th className="num">Total</th>
                <th className="num">Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 && (
                <tr>
                  <td colSpan={4} className="rp-muted">Sin cobros</td>
                </tr>
              )}
              {people.map(([name, v]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="num">{v.count}</td>
                  <td className="num">{formatPrice(v.total)}</td>
                  <td className="num">{v.cash ? formatPrice(v.cash) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="rp-cols">
        <section>
          <h3>Productos más vendidos</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Cant.</th>
                <th className="num">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={3} className="rp-muted">Sin ventas</td>
                </tr>
              )}
              {products.map((p, i) => (
                <tr key={p.productName}>
                  <td>
                    {i + 1}. {p.productName}
                  </td>
                  <td className="num">{p.quantity}</td>
                  <td className="num">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>Ventas por hora</h3>
          {/* con muchas horas se reparte en dos columnas: la hoja nunca pasa de una página */}
          <div className={hours.length > 8 ? 'rp-split' : undefined}>
            {(hours.length > 8 ? [hours.slice(0, Math.ceil(hours.length / 2)), hours.slice(Math.ceil(hours.length / 2))] : [hours]).map((part, k) => (
              <table key={k}>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th className="num">Ped.</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {part.length === 0 && (
                    <tr>
                      <td colSpan={3} className="rp-muted">Sin ventas</td>
                    </tr>
                  )}
                  {part.map((h) => (
                    <tr key={h.hour}>
                      <td>{hourLabel(h.hour)}</td>
                      <td className="num">{h.count}</td>
                      <td className="num">{formatPrice(h.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </section>
      </div>

      {/* cuadre y firmas */}
      <section className="rp-close">
        <div className="rp-cash">
          <span>Ventas en efectivo</span>
          <b>{formatPrice(cashTotal)}</b>
          {data.exchangeRate > 0 && <small>Tasa del día: Bs {data.exchangeRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })} por $</small>}
        </div>
        <div className="rp-sign">
          <span>Entregado por</span>
        </div>
        <div className="rp-sign">
          <span>Recibido por</span>
        </div>
      </section>
      <p className="rp-foot">Solo cuentan pedidos pagados (no incluye por pagar ni cancelados). Documento interno, no fiscal.</p>
    </div>
  );
}
