import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import type { ClassSummary } from '../data/rooms.models';

@Component({
  selector: 'app-room-classes',
  imports: [DatePipe],
  template: `
    <h2>Turmas no semestre {{ term() }}</h2>
    @if (!seesAllClasses()) {
      <p>Você vê apenas as turmas vinculadas a você.</p>
    }
    @if (classes().length) {
      <ul aria-label="Turmas da sala">
        @for (item of classes(); track item.id) {
          <li>
            <strong
              ><code>{{ item.code }}</code> · {{ item.label }}</strong
            >
            <dl>
              <div>
                <dt>Situação</dt>
                <dd>{{ statuses[item.status] ?? item.status }}</dd>
              </div>
              <div>
                <dt>Modalidade</dt>
                <dd>{{ item.modality || 'Não informada' }}</dd>
              </div>
              <div>
                <dt>Período</dt>
                <dd>
                  {{ item.startDate | date: 'dd/MM/yyyy' }} –
                  {{ item.endDate | date: 'dd/MM/yyyy' }}
                </dd>
              </div>
              <div>
                <dt>Vagas</dt>
                <dd>{{ item.seats }}</dd>
              </div>
            </dl>
          </li>
        }
      </ul>
    } @else {
      <p>Nenhuma turma sediada nesta sala em {{ term() }}.</p>
    }
  `,
  styles: `
    h2 {
      margin-top: 0;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding: 12px 0;
      overflow-wrap: anywhere;
    }
    dl {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 24px;
      margin: 8px 0 0;
    }
    dt {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }
    dd {
      margin: 0;
    }
    code {
      font-family: 'Source Code Pro', ui-monospace, monospace;
    }
  `,
})
export class RoomClassesComponent {
  readonly classes = input.required<ClassSummary[]>();
  readonly term = input.required<string>();
  readonly seesAllClasses = input.required<boolean>();
  protected readonly statuses: Record<string, string> = { active: 'Ativa', closed: 'Encerrada' };
}
