import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

type TipoInteres = 'porcentaje' | 'fijo';

interface Credito {
  id: number;
  nombre: string;
  fechaInicial: string;
  fechaFinal: string;
  valorProducto: number;
  valorIntereses: number;
  tipoInteres: TipoInteres;
  valorCuota: number;
  frecuenciaPago: number;
  fechaPago: string;
  cantidadCuotas: number;
  cuotasRestantes: number;
  historialPagos: string[];
}

interface FormularioCredito {
  nombre: string;
  fechaInicial: string;
  valorProducto: number | null;
  valorIntereses: number | null;
  tipoInteres: TipoInteres;
  frecuenciaPago: number;
  cantidadCuotas: number | null;
  cuotasRestantes: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="barra">
      <div class="barra-inner">
        <div class="marca">
          <span class="marca-logo">GC</span>
          <div class="marca-text">
            <strong>Gestión de Créditos</strong>
            <small>Panel administrativo</small>
          </div>
        </div>
        <div class="usuario">
          <span class="usuario-nombre">Hola, <b>{{ nombre }}</b></span>
          <button (click)="salir()">Cerrar sesión</button>
        </div>
      </div>
    </header>

    <main class="contenido">
      <div class="tarjeta">
        <div class="tabs">
          <button [class.activo]="vista() === 'simulador'" (click)="vista.set('simulador')">Simulador</button>
          <button [class.activo]="vista() === 'creditos'" (click)="vista.set('creditos')">Créditos</button>
        </div>

        @if (vista() === 'creditos') {
        <div class="tarjeta-cabecera">
          <div>
            <h2>Créditos</h2>
            <p class="ayuda">Haz clic en una fila para ver el detalle y las acciones.</p>
          </div>
          <div class="acciones-cabecera">
            <button class="btn-imprimir" (click)="imprimir()">🖨 Imprimir</button>
            <button class="btn-crear" (click)="abrirForm()">＋ Crear</button>
          </div>
        </div>

        @if (creditosEnMora().length > 0) {
          <div class="alerta-mora">
            ⚠ Tienes {{ creditosEnMora().length }} crédito(s) en mora (con el pago vencido).
          </div>
        }

        @if (error()) {
          <p class="error">{{ error() }}</p>
        } @else if (creditos().length === 0) {
          <p class="cargando">No hay créditos. Usa "＋ Crear" para agregar uno.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th>Nombre</th>
                <th>Fecha final</th>
                <th class="col-flecha"></th>
              </tr>
            </thead>
            <tbody>
              @for (c of creditos(); track c.id) {
                <tr class="fila" [class.fila-mora]="estaEnMora(c)" (click)="alternar(c.id)">
                  <td class="col-num">{{ c.id }}</td>
                  <td>
                    {{ c.nombre }}
                    @if (estaEnMora(c)) {
                      <span class="badge-mora">⚠ En mora</span>
                    }
                  </td>
                  <td>{{ formatoFecha(c.fechaFinal) }}</td>
                  <td class="col-flecha">{{ estaAbierto(c.id) ? '▲' : '▼' }}</td>
                </tr>
                @if (estaAbierto(c.id)) {
                  <tr class="detalle">
                    <td colspan="4">
                      <div class="detalle-grid">
                        <div>
                          <span>Valor producto</span>
                          <b>{{ formatoMoneda(c.valorProducto) }}</b>
                        </div>
                        <div>
                          <span>Valor intereses</span>
                          <b>{{ formatoInteres(c) }}</b>
                        </div>
                        <div>
                          <span>Valor cuota</span>
                          <b>{{ formatoMoneda(c.valorCuota) }}</b>
                        </div>
                        <div>
                          <span>Frecuencia de pago</span>
                          <b>{{ textoFrecuencia(c.frecuenciaPago) }}</b>
                        </div>
                        <div>
                          <span>Fecha inicial</span>
                          <b>{{ formatoFecha(c.fechaInicial) }}</b>
                        </div>
                        <div>
                          <span>Próximo pago</span>
                          <b>{{ formatoFecha(c.fechaPago) }}</b>
                        </div>
                        <div>
                          <span>Cantidad de cuotas</span>
                          <b>{{ c.cantidadCuotas }}</b>
                        </div>
                        <div>
                          <span>Cuotas restantes</span>
                          <b>{{ c.cuotasRestantes }}</b>
                        </div>
                      </div>

                      <div class="detalle-acciones">
                        <button
                          class="btn-pago"
                          (click)="abrirPago(c)"
                          [disabled]="c.cuotasRestantes === 0"
                          [title]="c.cuotasRestantes === 0 ? 'Ya no quedan cuotas' : 'Registrar el pago de una cuota'"
                        >
                          {{ c.cuotasRestantes === 0 ? 'Pagado' : 'Pago' }}
                        </button>
                        <button class="btn-historial" (click)="abrirHistorial(c)">
                          Historial
                        </button>
                        <button class="btn-eliminar" (click)="pedirEliminar(c)">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        }
        } @else {
          <div class="sim">
            <div>
              <h2>Simulador de crédito</h2>
              <p class="ayuda">Ingresa los datos y mira las cuotas al instante.</p>
            </div>

            <div class="sim-campos">
              <label>
                Valor del producto
                <input type="number" min="0" name="simProducto" [(ngModel)]="sim.valorProducto" placeholder="0" />
              </label>

              <label>
                Intereses
                <div class="input-con-toggle">
                  <input type="number" min="0" name="simIntereses" [(ngModel)]="sim.valorIntereses" placeholder="0" />
                  <div class="toggle">
                    <button type="button" [class.activo]="sim.tipoInteres === 'porcentaje'" (click)="sim.tipoInteres = 'porcentaje'" title="Porcentaje">%</button>
                    <button type="button" [class.activo]="sim.tipoInteres === 'fijo'" (click)="sim.tipoInteres = 'fijo'" title="Valor fijo">$</button>
                  </div>
                </div>
              </label>

              <label>
                Cantidad de cuotas
                <input type="number" min="1" name="simCantidad" [(ngModel)]="sim.cantidadCuotas" placeholder="0" />
              </label>

              <label>
                Frecuencia de pago
                <select name="simFrecuencia" [(ngModel)]="sim.frecuenciaPago">
                  <option [ngValue]="7">Cada 7 días (1 semana)</option>
                  <option [ngValue]="15">Cada 15 días</option>
                  <option [ngValue]="30">Cada 30 días</option>
                </select>
              </label>

              <label>
                Fecha inicial
                <input type="date" name="simFecha" [(ngModel)]="sim.fechaInicial" />
              </label>
            </div>

            <div class="sim-resumen">
              <div>
                <span>Monto de intereses</span>
                <b>{{ formatoMoneda(simMontoIntereses()) }}</b>
              </div>
              <div>
                <span>Total a pagar</span>
                <b>{{ formatoMoneda(simTotal()) }}</b>
              </div>
              <div>
                <span>Valor de la cuota</span>
                <b>{{ formatoMoneda(simValorCuota()) }}</b>
              </div>
              <div>
                <span>Fecha final</span>
                <b>{{ simFechaFinal() ? formatoFecha(simFechaFinal()) : '—' }}</b>
              </div>
            </div>

            @if (simCuotas().length > 0) {
              <div class="tabla-scroll">
                <table class="tabla-sim">
                  <thead>
                    <tr>
                      <th>Cuota</th>
                      <th>Fecha de pago</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cuota of simCuotas(); track cuota.numero) {
                      <tr>
                        <td>{{ cuota.numero }}</td>
                        <td>{{ formatoFecha(cuota.fecha) }}</td>
                        <td>{{ formatoMoneda(cuota.valor) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <button class="btn-crear sim-crear" (click)="crearDesdeSimulacion()">
                ＋ Crear crédito con estos datos
              </button>
            } @else {
              <p class="cargando">
                Completa el valor del producto, la cantidad de cuotas y la fecha inicial
                para ver la simulación.
              </p>
            }
          </div>
        }
      </div>

      <!-- Tabla que solo aparece al imprimir (todos los datos, sin botones) -->
      <section class="solo-impresion">
        <h2>Listado de créditos</h2>
        <table class="tabla-impresion">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Fecha final</th>
              <th>Valor producto</th>
              <th>Intereses</th>
              <th>Valor cuota</th>
              <th>Frecuencia</th>
              <th>Próx. pago</th>
              <th>Cant. cuotas</th>
              <th>Restantes</th>
            </tr>
          </thead>
          <tbody>
            @for (c of creditos(); track c.id) {
              <tr>
                <td>{{ c.id }}</td>
                <td>{{ c.nombre }}</td>
                <td>{{ formatoFecha(c.fechaFinal) }}</td>
                <td>{{ formatoMoneda(c.valorProducto) }}</td>
                <td>{{ formatoInteres(c) }}</td>
                <td>{{ formatoMoneda(c.valorCuota) }}</td>
                <td>{{ textoFrecuencia(c.frecuenciaPago) }}</td>
                <td>{{ formatoFecha(c.fechaPago) }}</td>
                <td>{{ c.cantidadCuotas }}</td>
                <td>{{ c.cuotasRestantes }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </main>

    @if (mostrandoForm()) {
      <div class="overlay" (click)="cerrarForm()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
          <div class="modal-cabecera">
            <h3>Nuevo crédito</h3>
            <button type="button" class="cerrar" (click)="cerrarForm()">✕</button>
          </div>

          <div class="campos">
            <label class="ancho-total">
              Nombre
              <input name="nombre" [(ngModel)]="form.nombre" required placeholder="Nombre de la persona" />
            </label>

            <label>
              Fecha inicial
              <input type="date" name="fechaInicial" [(ngModel)]="form.fechaInicial" required />
            </label>

            <label>
              Frecuencia de pago
              <select name="frecuenciaPago" [(ngModel)]="form.frecuenciaPago">
                <option [ngValue]="7">Cada 7 días (1 semana)</option>
                <option [ngValue]="15">Cada 15 días</option>
                <option [ngValue]="30">Cada 30 días</option>
              </select>
            </label>

            <label>
              Valor producto
              <input type="number" min="0" name="valorProducto" [(ngModel)]="form.valorProducto" placeholder="0" />
            </label>

            <label>
              Valor intereses
              <div class="input-con-toggle">
                <input type="number" min="0" name="valorIntereses" [(ngModel)]="form.valorIntereses" placeholder="0" />
                <div class="toggle">
                  <button
                    type="button"
                    [class.activo]="form.tipoInteres === 'porcentaje'"
                    (click)="form.tipoInteres = 'porcentaje'"
                    title="Porcentaje"
                  >%</button>
                  <button
                    type="button"
                    [class.activo]="form.tipoInteres === 'fijo'"
                    (click)="form.tipoInteres = 'fijo'"
                    title="Valor fijo"
                  >$</button>
                </div>
              </div>
            </label>

            <label>
              Cantidad de cuotas
              <input type="number" min="0" name="cantidadCuotas" [(ngModel)]="form.cantidadCuotas" placeholder="0" />
            </label>

            <label>
              Cuotas restantes
              <input type="number" min="0" name="cuotasRestantes" [(ngModel)]="form.cuotasRestantes" placeholder="0" />
            </label>
          </div>

          <p class="nota">La fecha final, las fechas de pago y el valor de la cuota se calculan automáticamente a partir de la fecha inicial, la frecuencia y la cantidad de cuotas.</p>

          @if (errorForm()) {
            <p class="error">{{ errorForm() }}</p>
          }

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cerrarForm()">Cancelar</button>
            <button type="submit" class="btn-crear" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    }

    @if (mostrandoConfirm()) {
      <div class="overlay" (click)="cancelarEliminar()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <div class="modal-cabecera">
            <h3>Eliminar crédito</h3>
            <button type="button" class="cerrar" (click)="cancelarEliminar()">✕</button>
          </div>

          <p class="texto-confirm">
            Vas a eliminar de forma <b>permanente</b> a
            <b>{{ creditoAEliminar()?.nombre }}</b>. Esta acción no se puede deshacer.
          </p>

          <label class="campo-confirm">
            Escribe <b>confirmar</b> para continuar
            <input [(ngModel)]="textoConfirm" placeholder="confirmar" autocomplete="off" />
          </label>

          @if (errorEliminar()) {
            <p class="error">{{ errorEliminar() }}</p>
          }

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cancelarEliminar()">Cancelar</button>
            <button
              type="button"
              class="btn-eliminar"
              [disabled]="!puedeEliminar() || eliminando()"
              (click)="confirmarEliminar()"
            >
              {{ eliminando() ? 'Eliminando…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (mostrandoPago()) {
      <div class="overlay" (click)="cerrarPago()">
        <form class="modal modal-confirm" (click)="$event.stopPropagation()" (ngSubmit)="confirmarPago()">
          <div class="modal-cabecera">
            <h3>Registrar pago</h3>
            <button type="button" class="cerrar" (click)="cerrarPago()">✕</button>
          </div>

          <p class="texto-confirm">
            Vas a registrar el pago de una cuota de
            <b>{{ creditoPago()?.nombre }}</b>. Confirma la fecha en que se pagó.
          </p>

          <label class="campo-confirm">
            Fecha de pago
            <input type="date" name="fechaPagoInput" [(ngModel)]="fechaPagoInput" required />
          </label>

          @if (errorPago()) {
            <p class="error">{{ errorPago() }}</p>
          }

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cerrarPago()">Cancelar</button>
            <button type="submit" class="btn-pago" [disabled]="registrandoPago() || !fechaPagoInput">
              {{ registrandoPago() ? 'Registrando…' : 'Confirmar pago' }}
            </button>
          </div>
        </form>
      </div>
    }

    @if (mostrandoHistorial()) {
      <div class="overlay" (click)="cerrarHistorial()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <div class="modal-cabecera">
            <h3>Historial de pagos</h3>
            <button type="button" class="cerrar" (click)="cerrarHistorial()">✕</button>
          </div>

          <p class="texto-confirm">
            Pagos registrados de <b>{{ creditoHistorial()?.nombre }}</b>:
          </p>

          @if (historialActual().length === 0) {
            <p class="cargando">Aún no hay pagos registrados.</p>
          } @else {
            <ol class="lista-historial">
              @for (fecha of historialActual(); track $index) {
                <li>{{ formatoFecha(fecha) }}</li>
              }
            </ol>
          }

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cerrarHistorial()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .barra {
      background: linear-gradient(120deg, var(--brand-950) 0%, var(--brand-800) 100%);
      color: #fff;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }
    .barra-inner {
      max-width: var(--container);
      margin: 0 auto;
      padding: 0.9rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }
    .marca-logo {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(140deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-weight: 800;
      font-size: 0.92rem;
      letter-spacing: 0.02em;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
    }
    .marca-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .marca-text strong {
      font-size: 0.98rem;
      font-weight: 700;
    }
    .marca-text small {
      font-size: 0.74rem;
      color: #94a3b8;
    }
    .usuario {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.9rem;
    }
    .usuario-nombre {
      color: #cbd5e1;
    }
    .usuario-nombre b {
      color: #fff;
    }
    .usuario button {
      padding: 0.5rem 1rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .usuario button:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(148, 163, 184, 0.6);
    }
    .contenido {
      max-width: var(--container);
      margin: 0 auto;
      padding: 1.75rem 1.5rem 3rem;
    }
    .tarjeta {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      box-shadow: var(--shadow);
    }
    .tarjeta-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .tarjeta h2 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
      color: var(--text);
    }
    .ayuda {
      margin: 0;
      color: var(--text-subtle);
      font-size: 0.82rem;
    }
    .btn-crear {
      padding: 0.6rem 1.15rem;
      border: none;
      border-radius: var(--radius-sm);
      background: linear-gradient(140deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 2px 8px var(--primary-ring);
      transition: filter 0.15s, transform 0.05s;
    }
    .btn-crear:hover:not(:disabled) {
      filter: brightness(1.07);
    }
    .btn-crear:active:not(:disabled) {
      transform: translateY(1px);
    }
    .btn-crear:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .acciones-cabecera {
      display: flex;
      gap: 0.6rem;
    }
    .btn-imprimir {
      padding: 0.6rem 1.15rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: #334155;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-imprimir:hover {
      background: var(--surface-muted);
      border-color: var(--text-subtle);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    th, td {
      text-align: left;
      padding: 0.8rem 0.75rem;
    }
    thead th {
      background: var(--surface-muted);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border);
    }
    thead th:first-child { border-top-left-radius: var(--radius-sm); }
    thead th:last-child { border-top-right-radius: var(--radius-sm); }
    .col-num { width: 52px; color: var(--text-subtle); font-variant-numeric: tabular-nums; }
    .col-flecha { width: 40px; text-align: center; color: var(--text-subtle); }
    .fila {
      cursor: pointer;
      transition: background 0.12s;
    }
    .fila:hover {
      background: var(--primary-soft);
    }
    .fila td {
      border-bottom: 1px solid var(--border);
      font-weight: 500;
    }
    .detalle td {
      background: var(--surface-muted);
      border-bottom: 1px solid var(--border);
      padding: 0;
    }
    .detalle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      padding: 1.25rem 1.25rem 0.75rem;
    }
    .detalle-grid div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detalle-grid span {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .detalle-grid b {
      font-size: 1rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .detalle-acciones {
      display: flex;
      gap: 0.6rem;
      padding: 0.5rem 1.25rem 1.25rem;
    }
    .btn-pago {
      padding: 0.55rem 1.25rem;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--success);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, transform 0.05s;
    }
    .btn-pago:hover:not(:disabled) {
      background: var(--success-strong);
    }
    .btn-pago:active:not(:disabled) {
      transform: translateY(1px);
    }
    .btn-pago:disabled {
      background: var(--text-subtle);
      cursor: not-allowed;
    }
    .btn-eliminar {
      padding: 0.55rem 1.25rem;
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--danger);
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-eliminar:hover:not(:disabled) {
      background: var(--danger-soft);
    }
    .btn-eliminar:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-historial {
      padding: 0.55rem 1.25rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: #334155;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-historial:hover {
      background: var(--surface-muted);
    }
    .alerta-mora {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--danger-soft);
      border: 1px solid var(--danger-border);
      color: var(--danger-strong);
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      font-size: 0.88rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .badge-mora {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.14rem 0.55rem;
      border-radius: var(--radius-full);
      background: #fee2e2;
      color: var(--danger-strong);
      font-size: 0.68rem;
      font-weight: 700;
      vertical-align: middle;
    }
    .fila-mora {
      background: #fff7f7;
      box-shadow: inset 3px 0 0 #ef4444;
    }
    .fila-mora:hover {
      background: var(--danger-soft);
    }
    .lista-historial {
      margin: 0 0 0.5rem;
      padding-left: 1.4rem;
      color: var(--text);
      font-size: 0.95rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .lista-historial li {
      padding: 0.15rem 0;
    }
    .error {
      color: var(--danger-strong);
      background: var(--danger-soft);
      border: 1px solid var(--danger-border);
      padding: 0.6rem 0.85rem;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      margin: 0.75rem 0 0;
    }
    .cargando {
      color: var(--text-muted);
      padding: 0.5rem 0;
    }

    /* --- Modal / formulario --- */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 17, 32, 0.55);
      backdrop-filter: blur(2px);
      display: grid;
      place-items: center;
      padding: 1rem;
      z-index: 10;
      animation: fade 0.15s ease-out;
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      box-shadow: var(--shadow-lg);
      animation: pop 0.16s ease-out;
    }
    @keyframes pop { from { transform: translateY(8px) scale(0.99); opacity: 0; } to { transform: none; opacity: 1; } }
    .modal-confirm {
      max-width: 440px;
    }
    .modal-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-cabecera h3 {
      margin: 0;
      font-size: 1.2rem;
      color: var(--text);
    }
    .cerrar {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      font-size: 1rem;
      color: var(--text-subtle);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .cerrar:hover {
      background: var(--surface-muted);
      color: var(--text);
    }
    .campos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }
    .ancho-total {
      grid-column: 1 / -1;
    }
    .campos label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .campos input,
    .campos select {
      padding: 0.62rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      width: 100%;
      background: var(--surface);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .campos input:focus,
    .campos select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .input-con-toggle {
      display: flex;
      gap: 0.4rem;
      align-items: stretch;
    }
    .input-con-toggle input {
      flex: 1;
      min-width: 0;
    }
    .toggle {
      display: flex;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .toggle button {
      border: none;
      background: var(--surface);
      color: var(--text-muted);
      padding: 0 0.75rem;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.12s;
    }
    .toggle button + button {
      border-left: 1px solid var(--border-strong);
    }
    .toggle button.activo {
      background: var(--primary);
      color: #fff;
    }
    .nota {
      margin: 1rem 0 0;
      font-size: 0.78rem;
      color: var(--text-subtle);
      line-height: 1.5;
      background: var(--surface-muted);
      border-left: 3px solid var(--border-strong);
      padding: 0.6rem 0.8rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }
    .texto-confirm {
      margin: 0 0 1rem;
      color: #334155;
      font-size: 0.92rem;
      line-height: 1.55;
    }
    .campo-confirm {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.84rem;
      font-weight: 600;
      color: #334155;
    }
    .campo-confirm input {
      padding: 0.62rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .campo-confirm input:focus {
      border-color: var(--danger);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 1.5rem;
    }
    .btn-secundario {
      padding: 0.6rem 1.15rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: #334155;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-secundario:hover {
      background: var(--surface-muted);
    }

    /* --- Pestañas (tabs) --- */
    .tabs {
      display: flex;
      gap: 0.3rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .tabs button {
      border: none;
      background: transparent;
      padding: 0.65rem 1.15rem;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: inherit;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s;
    }
    .tabs button:hover {
      color: var(--primary-strong);
    }
    .tabs button.activo {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    /* --- Simulador --- */
    .sim-campos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
      margin: 1.25rem 0 1.5rem;
    }
    .sim-campos label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .sim-campos input,
    .sim-campos select {
      padding: 0.62rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      width: 100%;
      background: var(--surface);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .sim-campos input:focus,
    .sim-campos select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .sim-resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.8rem;
      margin-bottom: 1.5rem;
    }
    .sim-resumen div {
      background: linear-gradient(160deg, var(--surface-muted) 0%, #eef2f9 100%);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.9rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .sim-resumen span {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .sim-resumen b {
      font-size: 1.1rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .sim-resumen div:last-child b {
      color: var(--primary-strong);
    }
    .tabla-scroll {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .tabla-sim {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .tabla-sim th,
    .tabla-sim td {
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .tabla-sim tr:last-child td {
      border-bottom: none;
    }
    .tabla-sim td {
      font-variant-numeric: tabular-nums;
    }
    .tabla-sim th {
      background: var(--surface-muted);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.04em;
    }
    .sim-crear {
      margin-top: 1.25rem;
    }

    /* --- Responsivo --- */
    @media (max-width: 640px) {
      .barra-inner {
        padding: 0.75rem 1rem;
      }
      .contenido {
        padding: 1.25rem 1rem 2.5rem;
      }
      .tarjeta {
        padding: 1.25rem 1rem;
        border-radius: var(--radius);
      }
      .tarjeta-cabecera {
        flex-direction: column;
        align-items: stretch;
      }
      .acciones-cabecera {
        width: 100%;
      }
      .acciones-cabecera button {
        flex: 1;
      }
      .campos {
        grid-template-columns: 1fr;
      }
      .sim-campos {
        grid-template-columns: 1fr;
      }
      .detalle-acciones {
        flex-wrap: wrap;
      }
      .detalle-acciones button {
        flex: 1 1 auto;
      }
      .modal {
        padding: 1.35rem;
      }
      th, td {
        padding: 0.7rem 0.6rem;
      }
    }
    @media (max-width: 460px) {
      .usuario-nombre,
      .marca-text small {
        display: none;
      }
    }

    /* --- Impresión --- */
    .solo-impresion {
      display: none;
    }
    @media print {
      .barra,
      .tarjeta {
        display: none !important;
      }
      .contenido {
        padding: 0;
      }
      .solo-impresion {
        display: block;
      }
      .solo-impresion h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .tabla-impresion {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .tabla-impresion th,
      .tabla-impresion td {
        border: 1px solid #333;
        padding: 6px 8px;
        text-align: left;
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/creditos`;

  nombre = this.auth.nombre;
  creditos = signal<Credito[]>([]);
  error = signal('');
  private abiertos = signal(new Set<number>());

  // Formulario de creación
  mostrandoForm = signal(false);
  guardando = signal(false);
  errorForm = signal('');
  form: FormularioCredito = this.formVacio();

  // Confirmación de eliminación
  mostrandoConfirm = signal(false);
  eliminando = signal(false);
  errorEliminar = signal('');
  creditoAEliminar = signal<Credito | null>(null);
  textoConfirm = '';

  // Registrar pago (con fecha)
  mostrandoPago = signal(false);
  registrandoPago = signal(false);
  errorPago = signal('');
  creditoPago = signal<Credito | null>(null);
  fechaPagoInput = '';

  // Historial de pagos
  mostrandoHistorial = signal(false);
  creditoHistorial = signal<Credito | null>(null);

  // Vista activa (pestañas) y estado del simulador
  vista = signal<'creditos' | 'simulador'>('creditos');
  sim: {
    valorProducto: number | null;
    valorIntereses: number | null;
    tipoInteres: TipoInteres;
    cantidadCuotas: number | null;
    frecuenciaPago: number;
    fechaInicial: string;
  } = {
    valorProducto: null,
    valorIntereses: null,
    tipoInteres: 'porcentaje',
    cantidadCuotas: null,
    frecuenciaPago: 30,
    fechaInicial: '',
  };

  ngOnInit(): void {
    this.http.get<Credito[]>(this.apiUrl).subscribe({
      next: (data) => this.creditos.set(data),
      error: () => this.error.set('No se pudieron cargar los datos.'),
    });
  }

  alternar(id: number): void {
    const copia = new Set(this.abiertos());
    if (copia.has(id)) {
      copia.delete(id);
    } else {
      copia.add(id);
    }
    this.abiertos.set(copia);
  }

  estaAbierto(id: number): boolean {
    return this.abiertos().has(id);
  }

  // --- Crear ---
  abrirForm(): void {
    this.form = this.formVacio();
    this.errorForm.set('');
    this.mostrandoForm.set(true);
  }

  cerrarForm(): void {
    this.mostrandoForm.set(false);
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.fechaInicial) {
      this.errorForm.set('El nombre y la fecha inicial son obligatorios.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set('');

    this.http.post<Credito>(this.apiUrl, this.form).subscribe({
      next: (nuevo) => {
        this.creditos.update((lista) => [...lista, nuevo]);
        this.guardando.set(false);
        this.cerrarForm();
      },
      error: (err) => {
        this.errorForm.set(err?.error?.mensaje ?? 'No se pudo guardar el crédito.');
        this.guardando.set(false);
      },
    });
  }

  // --- Registrar pago (pide y confirma la fecha) ---
  abrirPago(c: Credito): void {
    if (c.cuotasRestantes === 0) return;
    this.creditoPago.set(c);
    this.fechaPagoInput = this.hoyISO();
    this.errorPago.set('');
    this.mostrandoPago.set(true);
  }

  cerrarPago(): void {
    this.mostrandoPago.set(false);
    this.creditoPago.set(null);
  }

  confirmarPago(): void {
    const c = this.creditoPago();
    if (!c || !this.fechaPagoInput) return;

    this.registrandoPago.set(true);
    this.errorPago.set('');

    this.http
      .post<Credito>(`${this.apiUrl}/${c.id}/pago`, { fecha: this.fechaPagoInput })
      .subscribe({
        next: (actualizado) => {
          this.creditos.update((lista) =>
            lista.map((x) => (x.id === actualizado.id ? actualizado : x))
          );
          this.registrandoPago.set(false);
          this.cerrarPago();
        },
        error: () => {
          this.errorPago.set('No se pudo registrar el pago.');
          this.registrandoPago.set(false);
        },
      });
  }

  // --- Historial de pagos ---
  abrirHistorial(c: Credito): void {
    this.creditoHistorial.set(c);
    this.mostrandoHistorial.set(true);
  }

  cerrarHistorial(): void {
    this.mostrandoHistorial.set(false);
    this.creditoHistorial.set(null);
  }

  historialActual(): string[] {
    return this.creditoHistorial()?.historialPagos ?? [];
  }

  // --- Mora: el próximo pago venció y aún quedan cuotas ---
  estaEnMora(c: Credito): boolean {
    return c.cuotasRestantes > 0 && !!c.fechaPago && c.fechaPago < this.hoyISO();
  }

  creditosEnMora(): Credito[] {
    return this.creditos().filter((c) => this.estaEnMora(c));
  }

  private hoyISO(): string {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  // --- Eliminar ---
  pedirEliminar(c: Credito): void {
    this.creditoAEliminar.set(c);
    this.textoConfirm = '';
    this.errorEliminar.set('');
    this.mostrandoConfirm.set(true);
  }

  cancelarEliminar(): void {
    this.mostrandoConfirm.set(false);
    this.creditoAEliminar.set(null);
  }

  puedeEliminar(): boolean {
    return this.textoConfirm.trim().toLowerCase() === 'confirmar';
  }

  confirmarEliminar(): void {
    const c = this.creditoAEliminar();
    if (!c || !this.puedeEliminar()) return;

    this.eliminando.set(true);
    this.errorEliminar.set('');

    this.http.delete(`${this.apiUrl}/${c.id}`).subscribe({
      next: () => {
        this.creditos.update((lista) => lista.filter((x) => x.id !== c.id));
        const copia = new Set(this.abiertos());
        copia.delete(c.id);
        this.abiertos.set(copia);
        this.eliminando.set(false);
        this.cancelarEliminar();
      },
      error: () => {
        this.errorEliminar.set('No se pudo eliminar.');
        this.eliminando.set(false);
      },
    });
  }

  // --- Simulador de crédito (cálculo en el navegador) ---
  simMontoIntereses(): number {
    const producto = Number(this.sim.valorProducto) || 0;
    const intereses = Number(this.sim.valorIntereses) || 0;
    return this.sim.tipoInteres === 'porcentaje'
      ? (producto * intereses) / 100
      : intereses;
  }

  simTotal(): number {
    return (Number(this.sim.valorProducto) || 0) + this.simMontoIntereses();
  }

  simValorCuota(): number {
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    return cuotas > 0 ? Math.round(this.simTotal() / cuotas) : 0;
  }

  simFechaFinal(): string {
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    if (!this.sim.fechaInicial || cuotas <= 0) return '';
    return this.sumarDias(this.sim.fechaInicial, this.sim.frecuenciaPago * cuotas);
  }

  simCuotas(): { numero: number; fecha: string; valor: number }[] {
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    if (!this.sim.fechaInicial || cuotas <= 0) return [];
    const valor = this.simValorCuota();
    const filas: { numero: number; fecha: string; valor: number }[] = [];
    for (let n = 1; n <= cuotas; n++) {
      filas.push({
        numero: n,
        fecha: this.sumarDias(this.sim.fechaInicial, this.sim.frecuenciaPago * n),
        valor,
      });
    }
    return filas;
  }

  crearDesdeSimulacion(): void {
    this.form = {
      nombre: '',
      fechaInicial: this.sim.fechaInicial,
      valorProducto: this.sim.valorProducto,
      valorIntereses: this.sim.valorIntereses,
      tipoInteres: this.sim.tipoInteres,
      frecuenciaPago: this.sim.frecuenciaPago,
      cantidadCuotas: this.sim.cantidadCuotas,
      cuotasRestantes: this.sim.cantidadCuotas,
    };
    this.errorForm.set('');
    this.vista.set('creditos');
    this.mostrandoForm.set(true);
  }

  private sumarDias(fechaISO: string, dias: number): string {
    const d = new Date(fechaISO + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + Number(dias));
    return d.toISOString().slice(0, 10);
  }

  // --- Formato / utilidades ---
  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  formatoInteres(c: Credito): string {
    return c.tipoInteres === 'porcentaje'
      ? `${c.valorIntereses}%`
      : this.formatoMoneda(c.valorIntereses);
  }

  formatoFecha(iso: string): string {
    if (!iso) return '—';
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  textoFrecuencia(dias: number): string {
    if (dias === 7) return 'Cada 7 días (semanal)';
    return `Cada ${dias} días`;
  }

  imprimir(): void {
    window.print();
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private formVacio(): FormularioCredito {
    return {
      nombre: '',
      fechaInicial: '',
      valorProducto: null,
      valorIntereses: null,
      tipoInteres: 'porcentaje',
      frecuenciaPago: 30,
      cantidadCuotas: null,
      cuotasRestantes: null,
    };
  }
}
