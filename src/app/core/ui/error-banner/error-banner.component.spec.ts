import { TestBed } from '@angular/core/testing';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    }).compileComponents();
  });

  it('deve exibir mensagem e emitir evento retry ao clicar no botão', () => {
    const fixture = TestBed.createComponent(ErrorBannerComponent);
    fixture.componentRef.setInput('message', 'Serviço de composição indisponível.');
    fixture.detectChanges();

    let retried = false;
    fixture.componentInstance.retry.subscribe(() => {
      retried = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-banner')?.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('Serviço de composição indisponível.');

    const button = el.querySelector('button');
    expect(button?.textContent).toContain('Tentar novamente');
    button?.click();
    expect(retried).toBe(true);
  });
});
