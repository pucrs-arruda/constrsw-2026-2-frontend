import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ShellComponent } from './shell.component';
import { NAV_ITEMS } from './nav-items';
import { AuthService } from '../auth/auth.service';

describe('ShellComponent', () => {
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
  });

  it('deve criar o ShellComponent', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir os 10 itens de navegação na ordem combinada', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const navLabels = Array.from(el.querySelectorAll('.nav-label')).map(
      (node) => node.textContent?.trim()
    );

    expect(navLabels.length).toBe(10);
    expect(navLabels).toEqual(NAV_ITEMS.map((item) => item.label));
    expect(navLabels[3]).toBe('Salas de Aula');
  });

  it('deve renderizar o título Closed CRAS e nome do usuário na app bar', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand-title')?.textContent).toContain('Closed CRAS');
    expect(el.querySelector('.user-email')?.textContent).toContain('admin@pucrs.br');
  });

  it('deve chamar logout do AuthService ao clicar em Sair', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const logoutSpy = vi.spyOn(authService, 'logout');
    const logoutBtn = fixture.nativeElement.querySelector('.logout-button') as HTMLButtonElement;
    logoutBtn.click();

    expect(logoutSpy).toHaveBeenCalled();
  });
});
