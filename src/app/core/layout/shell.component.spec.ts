import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ShellComponent } from './shell.component';
import { AuthService } from '../auth/auth.service';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o ShellComponent', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir a marca Closed CRAS na app bar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.brand-title')?.textContent?.trim();
    expect(title).toBe('Closed CRAS');
  });

  it('deve exibir o e-mail do usuário autenticado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector('.user-email')?.textContent?.trim();
    expect(email).toBe('admin@pucrs.br');
  });

  it('deve chamar logout ao clicar no botão Sair', async () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector('.btn-logout') as HTMLButtonElement;
    logoutBtn.click();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('deve fechar drawer no Escape quando drawer estiver aberto e não expandido', () => {
    component.isExpanded.set(false);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.drawer, 'close');
    // simula drawer aberto
    Object.defineProperty(component.drawer, 'opened', { value: true, configurable: true });
    component.onEscape();
    expect(closeSpy).toHaveBeenCalled();
  });
});
