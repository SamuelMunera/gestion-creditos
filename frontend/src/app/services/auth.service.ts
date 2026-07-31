import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRespuesta {
  token: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';

  login(usuario: string, clave: string): Observable<LoginRespuesta> {
    return this.http
      .post<LoginRespuesta>(`${this.apiUrl}/login`, { usuario, clave })
      .pipe(
        tap((resp) => {
          localStorage.setItem('token', resp.token);
          localStorage.setItem('nombre', resp.nombre);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  get nombre(): string | null {
    return localStorage.getItem('nombre');
  }

  get estaAutenticado(): boolean {
    return !!this.token;
  }
}
