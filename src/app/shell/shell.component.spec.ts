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

  it('deve exibir o e-mail e o avatar do usuário autenticado em modo não compacto', () => {
    component.isCompact.set(false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector('.user-email')?.textContent?.trim();
    const avatar = compiled.querySelector('.user-avatar')?.textContent?.trim();
    expect(email).toBe('admin@pucrs.br');
    expect(avatar).toBe('AD');
  });

  it('deve ocultar caption e e-mail em modo compacto (375px), mantendo marca, avatar e Sair', () => {
    component.isCompact.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-caption')).toBeNull();
    expect(compiled.querySelector('.user-meta')).toBeNull();
    expect(compiled.querySelector('.brand-title')?.textContent?.trim()).toBe('Closed CRAS');
    expect(compiled.querySelector('.user-avatar')?.textContent?.trim()).toBe('AD');
    expect(compiled.querySelector('.btn-logout')).toBeTruthy();
  });

  it('deve chamar logout ao clicar no botão Sair', async () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector('.btn-logout') as HTMLButtonElement;
    logoutBtn.click();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('deve fechar drawer no Escape quando aberto e não expandido, restaurando o foco no botão de menu', async () => {
    component.isExpanded.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuBtn = compiled.querySelector('.menu-button') as HTMLButtonElement;
    const navLink = compiled.querySelector('.nav-link') as HTMLElement;

    const closeSpy = vi.spyOn(component.drawer, 'close').mockResolvedValue('close');
    Object.defineProperty(component.drawer, 'opened', { value: true, configurable: true });

    // Simula foco dentro do drawer antes do Escape
    navLink?.focus();

    component.onEscape(new KeyboardEvent('keydown', { key: 'Escape' }));
    await Promise.resolve();

    expect(closeSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(menuBtn);
  });

  it('deve refletir os estados responsivos para as larguras 360px (compact), 768px (medium) e 1280px (expanded)', () => {
    // 360px: compact = true, expanded (nav fixo) = false, medium = false, wideExpanded = false
    component.isCompact.set(true);
    component.isExpanded.set(false);
    component.isMedium.set(false);
    component.isWideExpanded.set(false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.menu-button')).toBeTruthy();
    expect(compiled.querySelector('.brand-caption')).toBeNull();
    expect(compiled.querySelector('.user-meta')).toBeNull();
    expect(compiled.querySelector('.user-avatar')?.textContent?.trim()).toBe('AD');
    expect(compiled.querySelector('.main-content')?.classList.contains('compact-padding')).toBe(true);

    // 768px: compact = false, expanded (nav fixo) = false, medium = true, wideExpanded = false
    component.isCompact.set(false);
    component.isExpanded.set(false);
    component.isMedium.set(true);
    component.isWideExpanded.set(false);
    fixture.detectChanges();
    expect(compiled.querySelector('.menu-button')).toBeTruthy();
    expect(compiled.querySelector('.brand-caption')?.textContent?.trim()).toBe('PUCRS · ConstrSW');
    expect(compiled.querySelector('.user-email')?.textContent?.trim()).toBe('admin@pucrs.br');
    expect(compiled.querySelector('.main-content')?.classList.contains('compact-padding')).toBe(false);

    // 1280px: compact = false, expanded (nav fixo) = true, medium = false, wideExpanded = true
    component.isCompact.set(false);
    component.isExpanded.set(true);
    component.isMedium.set(false);
    component.isWideExpanded.set(true);
    fixture.detectChanges();
    expect(compiled.querySelector('.menu-button')).toBeNull();
    expect(compiled.querySelector('.brand-caption')?.textContent?.trim()).toBe('PUCRS · ConstrSW');
    expect(compiled.querySelector('.user-email')?.textContent?.trim()).toBe('admin@pucrs.br');
    expect(component.drawer.mode).toBe('side');
    expect(component.drawer.opened).toBe(true);
  });
});


