import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';
import { Appointment, AppointmentPayload } from './models';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/eventos`;

  /** Lista ordenada por prioridade pelo backend: alertas, pendentes, concluídos. */
  list(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.base);
  }

  alerts(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/alertas`);
  }

  get(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.base}/${id}`);
  }

  create(payload: AppointmentPayload): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, payload);
  }

  update(id: string, payload: AppointmentPayload): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.base}/${id}`, payload);
  }

  /** confirmarForaDaData: obrigatório quando a conclusão é em dia diferente do agendado. */
  complete(id: string, confirmarForaDaData = false): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/${id}/concluir`, confirmarForaDaData ? { confirmarForaDaData } : {});
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
