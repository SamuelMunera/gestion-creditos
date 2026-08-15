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
  nombreProducto: string;
  cedula: string;
  telefono: string;
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
  cuotaRegalada: boolean;
}

interface FormularioCredito {
  nombre: string;
  nombreProducto: string;
  cedula: string;
  telefono: string;
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
          <button [class.activo]="vista() === 'finanzas'" (click)="vista.set('finanzas')">Finanzas</button>
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
                    @if (c.cuotaRegalada) {
                      <span class="badge-regalo">🎁 Cuota regalada</span>
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
                          <span>Nombre del producto</span>
                          <b>{{ c.nombreProducto || '—' }}</b>
                        </div>
                        <div>
                          <span>Cédula</span>
                          <b>{{ c.cedula || '—' }}</b>
                        </div>
                        <div>
                          <span>Teléfono</span>
                          <b>{{ c.telefono || '—' }}</b>
                        </div>
                        <div>
                          <span>Valor producto</span>
                          <b>{{ formatoMoneda(c.valorProducto) }}</b>
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
                        <button
                          class="btn-regalo"
                          (click)="pedirRegalar(c)"
                          [disabled]="c.cuotasRestantes !== 1"
                          [title]="c.cuotasRestantes === 1 ? 'Regalar la última cuota como incentivo' : 'Solo disponible cuando queda 1 cuota'"
                        >
                          🎁 Regalar cuota
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
        } @else if (vista() === 'finanzas') {
          <div class="fin">
            <div class="tarjeta-cabecera">
              <div>
                <h2>Finanzas del negocio</h2>
                <p class="ayuda">Resumen calculado con todos los créditos registrados.</p>
              </div>
              <button class="btn-imprimir" (click)="imprimir()">🖨 Imprimir</button>
            </div>

            <div class="fin-grid">
              <div class="fin-card">
                <span>Capital prestado</span>
                <b>{{ formatoMoneda(finCapital()) }}</b>
                <small>En {{ finActivos() }} crédito(s) activo(s)</small>
              </div>
              <div class="fin-card fin-card-ok">
                <span>Total recaudado</span>
                <b>{{ formatoMoneda(finRecaudado()) }}</b>
                <small>{{ finPagosTotales() }} cuota(s) pagada(s)</small>
              </div>
              <div class="fin-card fin-card-warn">
                <span>Por cobrar</span>
                <b>{{ formatoMoneda(finPorCobrar()) }}</b>
                <small>{{ finCuotasPorCobrar() }} cuota(s) pendiente(s)</small>
              </div>
              <div class="fin-card fin-card-profit">
                <span>Ganancia por intereses</span>
                <b>{{ formatoMoneda(finInteres()) }}</b>
                <small>Proyectada sobre la cartera</small>
              </div>
              <div class="fin-card">
                <span>Recaudado este mes</span>
                <b>{{ formatoMoneda(finRecaudoMes()) }}</b>
                <small>{{ nombreMesActual() }}</small>
              </div>
              <div class="fin-card fin-card-profit">
                <span>Esperado esta semana</span>
                <b>{{ formatoMoneda(esperadoSemanaActual()) }}</b>
                <small>Cuotas programadas</small>
              </div>
              <div class="fin-card fin-card-ok">
                <span>Recaudado esta semana</span>
                <b>{{ formatoMoneda(recaudoSemanaActual()) }}</b>
                <small>Pagos recibidos</small>
              </div>
              <div class="fin-card" [class.fin-card-danger]="finMora().length > 0">
                <span>En mora</span>
                <b>{{ finMora().length }}</b>
                <small>{{ formatoMoneda(finMontoMora()) }} por cobrar</small>
              </div>
              <div class="fin-card">
                <span>Créditos saldados</span>
                <b>{{ finSaldados() }}</b>
                <small>de {{ creditos().length }} en total</small>
              </div>
              <div class="fin-card fin-card-gift">
                <span>Cuotas regaladas</span>
                <b>{{ finRegaladas() }}</b>
                <small>{{ formatoMoneda(finMontoRegalado()) }} en incentivos</small>
              </div>
            </div>

            @if (semanas().length > 0) {
              <h3 class="fin-subtitulo">Recaudo por semana</h3>
              <div class="tabla-scroll">
                <table class="tabla-sim">
                  <thead>
                    <tr>
                      <th>Semana</th>
                      <th>Esperado</th>
                      <th>Recaudado real</th>
                      <th>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of semanas(); track s.inicio) {
                      <tr [class.fila-semana-actual]="s.actual">
                        <td>
                          {{ formatoFechaCorta(s.inicio) }} – {{ formatoFechaCorta(s.fin) }}
                          <small class="anio-semana">{{ s.inicio.slice(0, 4) }}</small>
                          @if (s.actual) {
                            <span class="badge-semana">Esta semana</span>
                          }
                        </td>
                        <td>{{ formatoMoneda(s.esperado) }}</td>
                        <td>{{ formatoMoneda(s.real) }}</td>
                        <td
                          [class.dif-neg]="s.real - s.esperado < 0"
                          [class.dif-pos]="s.real - s.esperado > 0"
                        >
                          {{ formatoMoneda(s.real - s.esperado) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (creditos().length === 0) {
              <p class="cargando">No hay créditos registrados todavía.</p>
            } @else {
              <h3 class="fin-subtitulo">Detalle por crédito</h3>
              <div class="tabla-scroll">
                <table class="tabla-sim">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Capital</th>
                      <th>Intereses</th>
                      <th>Recaudado</th>
                      <th>Por cobrar</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of creditos(); track c.id) {
                      <tr>
                        <td>{{ c.nombre }}</td>
                        <td>{{ formatoMoneda(c.valorProducto) }}</td>
                        <td>{{ formatoMoneda(montoInteres(c)) }}</td>
                        <td>{{ formatoMoneda(recaudadoCredito(c)) }}</td>
                        <td>{{ formatoMoneda(porCobrarCredito(c)) }}</td>
                        <td>
                          @if (c.cuotaRegalada) {
                            <span class="badge-regalo">🎁 Regalada</span>
                          } @else if (estaEnMora(c)) {
                            <span class="badge-mora">⚠ En mora</span>
                          } @else if (c.cuotasRestantes === 0) {
                            <span class="badge-ok">✓ Saldado</span>
                          } @else {
                            {{ c.cuotasRestantes }}/{{ c.cantidadCuotas }} cuotas
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
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
                      <tr [class.fila-regalo]="cuota.regalo">
                        <td>
                          {{ cuota.numero }}
                          @if (cuota.regalo) {
                            <span class="badge-regalo">🎁 Regalable</span>
                          }
                        </td>
                        <td>{{ formatoFecha(cuota.fecha) }}</td>
                        <td>{{ formatoMoneda(cuota.valor) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="nota">
                La cuota se calcula sobre {{ (sim.cantidadCuotas || 0) - 1 }} cuotas (una menos):
                con las primeras se recupera el total. La última (🎁) se puede cobrar como
                ganancia extra o regalar al cliente como incentivo de pago.
              </p>
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

            <label class="ancho-total">
              Nombre del producto
              <input name="nombreProducto" [(ngModel)]="form.nombreProducto" placeholder="Ej. Nevera, moto, etc." />
            </label>

            <label>
              Cédula
              <input name="cedula" inputmode="numeric" [(ngModel)]="form.cedula" placeholder="Número de cédula" />
            </label>

            <label>
              Número telefónico
              <input type="tel" name="telefono" inputmode="tel" [(ngModel)]="form.telefono" placeholder="Número de contacto" />
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

    @if (mostrandoRegalo()) {
      <div class="overlay" (click)="cerrarRegalo()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <div class="modal-cabecera">
            <h3>Regalar última cuota</h3>
            <button type="button" class="cerrar" (click)="cerrarRegalo()">✕</button>
          </div>

          <p class="texto-confirm">
            Vas a regalar la última cuota de
            <b>{{ creditoRegalo()?.nombre }}</b> como incentivo. El crédito quedará
            <b>saldado</b> y no se cobrará esta cuota.
          </p>

          @if (errorRegalo()) {
            <p class="error">{{ errorRegalo() }}</p>
          }

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cerrarRegalo()">Cancelar</button>
            <button
              type="button"
              class="btn-regalo"
              [disabled]="regalandoCuota()"
              (click)="confirmarRegalar()"
            >
              {{ regalandoCuota() ? 'Regalando…' : '🎁 Regalar cuota' }}
            </button>
          </div>
        </div>
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
    .btn-regalo {
      padding: 0.55rem 1.25rem;
      border: 1px solid #c4b5fd;
      border-radius: var(--radius-sm);
      background: #f5f3ff;
      color: #6d28d9;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-regalo:hover:not(:disabled) {
      background: #ede9fe;
    }
    .btn-regalo:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
    .badge-regalo {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.14rem 0.55rem;
      border-radius: var(--radius-full);
      background: #ede9fe;
      color: #6d28d9;
      font-size: 0.68rem;
      font-weight: 700;
      vertical-align: middle;
    }
    .fila-regalo td {
      background: #faf5ff;
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

    /* --- Finanzas --- */
    .fin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.9rem;
      margin: 1.25rem 0 1.75rem;
    }
    .fin-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 4px solid var(--border-strong);
      border-radius: var(--radius);
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      box-shadow: var(--shadow);
    }
    .fin-card span {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .fin-card b {
      font-size: 1.4rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
    }
    .fin-card small {
      font-size: 0.72rem;
      color: var(--text-subtle);
    }
    .fin-card-ok { border-left-color: var(--success); }
    .fin-card-warn { border-left-color: #f59e0b; }
    .fin-card-profit { border-left-color: var(--primary); }
    .fin-card-profit b { color: var(--primary-strong); }
    .fin-card-danger { border-left-color: #ef4444; }
    .fin-card-danger b { color: var(--danger-strong); }
    .fin-card-gift { border-left-color: #8b5cf6; }
    .fin-card-gift b { color: #6d28d9; }
    .fin-subtitulo {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      color: var(--text);
    }
    .badge-ok {
      display: inline-block;
      padding: 0.14rem 0.55rem;
      border-radius: var(--radius-full);
      background: #dcfce7;
      color: #15803d;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .anio-semana {
      color: var(--text-subtle);
      font-size: 0.72rem;
      margin-left: 0.15rem;
    }
    .badge-semana {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.14rem 0.55rem;
      border-radius: var(--radius-full);
      background: var(--primary-soft);
      color: var(--primary-strong);
      font-size: 0.68rem;
      font-weight: 700;
    }
    .fila-semana-actual td {
      background: var(--primary-soft);
      font-weight: 600;
    }
    .dif-neg { color: var(--danger-strong); font-weight: 600; }
    .dif-pos { color: #15803d; font-weight: 600; }

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

  // Regalar última cuota
  mostrandoRegalo = signal(false);
  regalandoCuota = signal(false);
  errorRegalo = signal('');
  creditoRegalo = signal<Credito | null>(null);

  // Vista activa (pestañas) y estado del simulador
  vista = signal<'creditos' | 'simulador' | 'finanzas'>('creditos');
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

  // --- Regalar última cuota (incentivo) ---
  pedirRegalar(c: Credito): void {
    if (c.cuotasRestantes !== 1) return;
    this.creditoRegalo.set(c);
    this.errorRegalo.set('');
    this.mostrandoRegalo.set(true);
  }

  cerrarRegalo(): void {
    this.mostrandoRegalo.set(false);
    this.creditoRegalo.set(null);
  }

  confirmarRegalar(): void {
    const c = this.creditoRegalo();
    if (!c) return;

    this.regalandoCuota.set(true);
    this.errorRegalo.set('');

    this.http.post<Credito>(`${this.apiUrl}/${c.id}/regalar`, {}).subscribe({
      next: (actualizado) => {
        this.creditos.update((lista) =>
          lista.map((x) => (x.id === actualizado.id ? actualizado : x))
        );
        this.regalandoCuota.set(false);
        this.cerrarRegalo();
      },
      error: (err) => {
        this.errorRegalo.set(err?.error?.mensaje ?? 'No se pudo regalar la cuota.');
        this.regalandoCuota.set(false);
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

  // --- Finanzas (todo se calcula a partir de los créditos cargados) ---
  // Monto de intereses de un crédito (porcentaje sobre el producto o valor fijo).
  montoInteres(c: Credito): number {
    return c.tipoInteres === 'porcentaje'
      ? (c.valorProducto * c.valorIntereses) / 100
      : c.valorIntereses;
  }

  // Cuotas ya pagadas: las que ya no están pendientes. Se calcula a partir de
  // cantidad y restantes (no del historial), para contar también las cuotas que
  // el cliente ya había pagado ANTES de registrar el crédito en la app. La cuota
  // regalada no cuenta como pagada porque no se cobró.
  cuotasPagadas(c: Credito): number {
    const pagadas =
      (c.cantidadCuotas || 0) -
      (c.cuotasRestantes || 0) -
      (c.cuotaRegalada ? 1 : 0);
    return pagadas > 0 ? pagadas : 0;
  }

  // Dinero ya recibido: cada cuota pagada equivale a una cuota.
  recaudadoCredito(c: Credito): number {
    return this.cuotasPagadas(c) * c.valorCuota;
  }

  // Dinero pendiente: cuotas que faltan por pagar.
  porCobrarCredito(c: Credito): number {
    return c.cuotasRestantes * c.valorCuota;
  }

  private sumar(fn: (c: Credito) => number): number {
    return this.creditos().reduce((total, c) => total + fn(c), 0);
  }

  finCapital(): number {
    return this.sumar((c) => c.valorProducto || 0);
  }

  finRecaudado(): number {
    return this.sumar((c) => this.recaudadoCredito(c));
  }

  finPorCobrar(): number {
    return this.sumar((c) => this.porCobrarCredito(c));
  }

  finInteres(): number {
    return this.sumar((c) => this.montoInteres(c));
  }

  finPagosTotales(): number {
    return this.sumar((c) => this.cuotasPagadas(c));
  }

  finCuotasPorCobrar(): number {
    return this.sumar((c) => c.cuotasRestantes);
  }

  finActivos(): number {
    return this.creditos().filter((c) => c.cuotasRestantes > 0).length;
  }

  finSaldados(): number {
    return this.creditos().filter((c) => c.cuotasRestantes === 0).length;
  }

  finMora(): Credito[] {
    return this.creditosEnMora();
  }

  finMontoMora(): number {
    return this.creditosEnMora().reduce(
      (total, c) => total + this.porCobrarCredito(c),
      0
    );
  }

  finRegaladas(): number {
    return this.creditos().filter((c) => c.cuotaRegalada).length;
  }

  finMontoRegalado(): number {
    return this.creditos()
      .filter((c) => c.cuotaRegalada)
      .reduce((total, c) => total + c.valorCuota, 0);
  }

  // Recaudado en el mes actual: pagos cuya fecha cae en el mes en curso.
  finRecaudoMes(): number {
    const mes = this.hoyISO().slice(0, 7); // YYYY-MM
    return this.sumar(
      (c) =>
        c.historialPagos.filter((f) => f.startsWith(mes)).length * c.valorCuota
    );
  }

  nombreMesActual(): string {
    return new Date().toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
  }

  // El lunes de la semana (YYYY-MM-DD) a la que pertenece una fecha.
  private lunesDeSemana(iso: string): string {
    const d = new Date(iso + 'T00:00:00Z');
    const dia = d.getUTCDay(); // 0=domingo … 6=sábado
    const desplazamiento = dia === 0 ? -6 : 1 - dia; // llevar al lunes
    d.setUTCDate(d.getUTCDate() + desplazamiento);
    return d.toISOString().slice(0, 10);
  }

  // Recaudo por semana: esperado (cronograma completo de cuotas) vs real (pagos
  // efectivos). Cada cuota/pago se ubica en la semana de su fecha.
  semanas(): { inicio: string; fin: string; esperado: number; real: number; actual: boolean }[] {
    const mapa = new Map<string, { esperado: number; real: number }>();
    const acumular = (iso: string, campo: 'esperado' | 'real', monto: number) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      const clave = this.lunesDeSemana(iso);
      const entrada = mapa.get(clave) ?? { esperado: 0, real: 0 };
      entrada[campo] += monto;
      mapa.set(clave, entrada);
    };

    for (const c of this.creditos()) {
      // Esperado: fecha inicial + frecuencia * n, para cada cuota programada.
      for (let n = 1; n <= c.cantidadCuotas; n++) {
        acumular(this.sumarDias(c.fechaInicial, c.frecuenciaPago * n), 'esperado', c.valorCuota);
      }
      // Real: cada pago registrado equivale a una cuota.
      for (const fecha of c.historialPagos) {
        acumular(fecha, 'real', c.valorCuota);
      }
    }

    const semanaActual = this.lunesDeSemana(this.hoyISO());
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([inicio, v]) => ({
        inicio,
        fin: this.sumarDias(inicio, 6),
        esperado: v.esperado,
        real: v.real,
        actual: inicio === semanaActual,
      }));
  }

  esperadoSemanaActual(): number {
    return this.semanas().find((s) => s.actual)?.esperado ?? 0;
  }

  recaudoSemanaActual(): number {
    return this.semanas().find((s) => s.actual)?.real ?? 0;
  }

  formatoFechaCorta(iso: string): string {
    const [, mes, dia] = iso.split('-');
    return `${dia}/${mes}`;
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
    // La cuota se calcula sobre una cuota menos: con 12 cuotas, se divide entre 11
    // (la 12 es la que se puede regalar como incentivo).
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    const divisor = cuotas > 1 ? cuotas - 1 : cuotas;
    return divisor > 0 ? Math.round(this.simTotal() / divisor) : 0;
  }

  simFechaFinal(): string {
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    if (!this.sim.fechaInicial || cuotas <= 0) return '';
    return this.sumarDias(this.sim.fechaInicial, this.sim.frecuenciaPago * cuotas);
  }

  simCuotas(): { numero: number; fecha: string; valor: number; regalo: boolean }[] {
    const cuotas = Number(this.sim.cantidadCuotas) || 0;
    if (!this.sim.fechaInicial || cuotas <= 0) return [];
    const valor = this.simValorCuota();
    const filas: { numero: number; fecha: string; valor: number; regalo: boolean }[] = [];
    for (let n = 1; n <= cuotas; n++) {
      filas.push({
        numero: n,
        fecha: this.sumarDias(this.sim.fechaInicial, this.sim.frecuenciaPago * n),
        valor,
        // La última cuota es la que se puede regalar como incentivo.
        regalo: cuotas > 1 && n === cuotas,
      });
    }
    return filas;
  }

  crearDesdeSimulacion(): void {
    this.form = {
      nombre: '',
      nombreProducto: '',
      cedula: '',
      telefono: '',
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
      nombreProducto: '',
      cedula: '',
      telefono: '',
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
