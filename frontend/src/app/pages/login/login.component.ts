import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <form class="card" (ngSubmit)="entrar()">
        <div class="marca">
          <span class="marca-logo">GC</span>
          <div class="marca-text">
            <strong>Gestión de Créditos</strong>
            <small>Panel administrativo</small>
          </div>
        </div>

        <h1>Iniciar sesión</h1>
        <p class="subtitulo">Ingresa tus credenciales para continuar</p>

        <label>
          Usuario
          <input
            name="usuario"
            [(ngModel)]="usuario"
            autocomplete="username"
            placeholder="Usuario"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            name="clave"
            type="password"
            [(ngModel)]="clave"
            autocomplete="current-password"
            placeholder="••••"
            required
          />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(900px 500px at 100% 0%, rgba(37, 99, 235, 0.28), transparent 60%),
        radial-gradient(800px 500px at 0% 100%, rgba(59, 130, 246, 0.16), transparent 55%),
        linear-gradient(155deg, var(--brand-950) 0%, var(--brand-800) 100%);
    }
    .card {
      width: 100%;
      max-width: 380px;
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: var(--radius-lg);
      padding: 2.25rem;
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .marca-logo {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(140deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      box-shadow: 0 6px 16px var(--primary-ring);
    }
    .marca-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .marca-text strong {
      font-size: 0.98rem;
      color: var(--text);
    }
    .marca-text small {
      font-size: 0.76rem;
      color: var(--text-subtle);
    }
    h1 {
      margin: 0.25rem 0 0;
      font-size: 1.5rem;
      color: var(--text);
    }
    .subtitulo {
      margin: -0.4rem 0 0.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }
    input {
      padding: 0.72rem 0.85rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      font-size: 1rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    button {
      margin-top: 0.6rem;
      padding: 0.8rem;
      border: none;
      border-radius: var(--radius);
      background: linear-gradient(140deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: filter 0.15s, transform 0.05s;
    }
    button:hover:not(:disabled) {
      filter: brightness(1.06);
    }
    button:active:not(:disabled) {
      transform: translateY(1px);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .error {
      margin: 0;
      color: var(--danger-strong);
      font-size: 0.85rem;
      background: var(--danger-soft);
      border: 1px solid var(--danger-border);
      padding: 0.6rem 0.8rem;
      border-radius: var(--radius-sm);
    }
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = '';
  clave = '';
  error = signal('');
  cargando = signal(false);

  entrar(): void {
    this.error.set('');
    this.cargando.set(true);

    this.auth.login(this.usuario, this.clave).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(err?.error?.mensaje ?? 'No se pudo iniciar sesión');
        this.cargando.set(false);
      },
    });
  }
}
