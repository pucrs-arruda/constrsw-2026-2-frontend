import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefusalBannerComponent } from './refusal-banner.component';

describe('RefusalBannerComponent', () => {
  let component: RefusalBannerComponent;
  let fixture: ComponentFixture<RefusalBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefusalBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RefusalBannerComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o RefusalBannerComponent', () => {
    component.message = 'Código de sala duplicado.';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve renderizar a mensagem e possuir role="alert"', () => {
    component.message = 'Código de sala duplicado.';
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.refusal-banner') as HTMLElement;
    expect(bannerEl.getAttribute('role')).toBe('alert');
    expect(bannerEl.getAttribute('aria-live')).toBe('polite');
    expect(bannerEl.textContent).toContain('Código de sala duplicado.');
  });
});
