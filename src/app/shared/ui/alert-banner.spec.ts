import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AlertBanner } from './alert-banner';

@Component({
  standalone: true,
  imports: [AlertBanner],
  template: `<app-alert-banner [kind]="kind" [message]="message" />`,
})
class Host {
  kind: 'refusal' | 'identity' | 'composition' = 'refusal';
  message = '';
}

describe('AlertBanner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
  });

  function create(kind: Host['kind'], message = '') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.kind = kind;
    fixture.componentInstance.message = message;
    fixture.detectChanges();
    return fixture;
  }

  it('always exposes role="alert"', () => {
    const fixture = create('refusal', 'Não foi possível entrar.');
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert).not.toBeNull();
  });

  it('renders refusal message from input', () => {
    const fixture = create(
      'refusal',
      'Não foi possível entrar. Verifique usuário e senha.',
    );
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent?.trim()).toBe(
      'Não foi possível entrar. Verifique usuário e senha.',
    );
  });

  it('falls back to locked refusal copy when message is empty', () => {
    const fixture = create('refusal', '   ');
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent?.trim()).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    );
  });

  it('locks identity copy regardless of message input', () => {
    const fixture = create('identity', 'ignored');
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent?.trim()).toBe('Identidade indisponível.');
  });

  it('locks composition copy regardless of message input', () => {
    const fixture = create('composition', 'ignored');
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent?.trim()).toBe(
      'Serviço de composição indisponível.',
    );
  });
});
