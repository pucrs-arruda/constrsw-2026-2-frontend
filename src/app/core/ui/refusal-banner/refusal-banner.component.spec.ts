import { TestBed } from '@angular/core/testing';
import { RefusalBannerComponent } from './refusal-banner.component';

describe('RefusalBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefusalBannerComponent],
    }).compileComponents();
  });

  it('não deve exibir nada se a mensagem estiver vazia', () => {
    const fixture = TestBed.createComponent(RefusalBannerComponent);
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.refusal-banner')).toBeNull();
  });

  it('deve exibir banner com role="alert" quando houver mensagem', () => {
    const fixture = TestBed.createComponent(RefusalBannerComponent);
    fixture.componentRef.setInput('message', 'Código de sala já existente.');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const banner = el.querySelector('.refusal-banner');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.textContent).toContain('Código de sala já existente.');
  });
});
