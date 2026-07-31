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
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 360px;
      background: #fff;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #0f172a;
    }
    .subtitulo {
      margin: -0.5rem 0 0.5rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    input {
      padding: 0.7rem 0.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 1rem;
      outline: none;
    }
    input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    button {
      margin-top: 0.5rem;
      padding: 0.75rem;
      border: none;
      border-radius: 10px;
      background: #6366f1;
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: #4f46e5;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .error {
      margin: 0;
      color: #dc2626;
      font-size: 0.85rem;
      background: #fef2f2;
      padding: 0.6rem 0.8rem;
      border-radius: 8px;
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
