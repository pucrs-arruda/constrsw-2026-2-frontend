import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  let component: ErrorBannerComponent;
  let fixture: ComponentFixture<ErrorBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorBannerComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o ErrorBannerComponent', () => {
    component.message = 'Serviço de composição indisponível.';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve possuir role="alert" e aria-live="assertive"', () => {
    component.message = 'Serviço de composição indisponível.';
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.error-banner') as HTMLElement;
    expect(bannerEl.getAttribute('role')).toBe('alert');
    expect(bannerEl.getAttribute('aria-live')).toBe('assertive');
    expect(bannerEl.textContent).toContain('Serviço de composição indisponível.');
  });

  it('deve emitir retry ao clicar no botão', () => {
    component.message = 'Erro de rede.';
    fixture.detectChanges();

    const retrySpy = vi.spyOn(component.retry, 'emit');
    const button = fixture.nativeElement.querySelector('.btn-retry') as HTMLButtonElement;
    button.click();
    expect(retrySpy).toHaveBeenCalled();
  });
});
