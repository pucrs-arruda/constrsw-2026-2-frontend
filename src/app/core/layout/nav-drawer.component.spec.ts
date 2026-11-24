import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavDrawerComponent } from './nav-drawer.component';
import { NAV_ITEMS } from './nav-items';

describe('NavDrawerComponent', () => {
  let component: NavDrawerComponent;
  let fixture: ComponentFixture<NavDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavDrawerComponent],
      providers: [provideRouter([{ path: '**', component: NavDrawerComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o NavDrawerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar exatamente os 10 itens na ordem certa', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.nav-link');
    expect(links.length).toBe(10);

    const labels = Array.from(links).map((l) => l.querySelector('.nav-label')?.textContent?.trim());
    expect(labels).toEqual(NAV_ITEMS.map((item) => item.label));
    expect(labels[3]).toBe('Salas de Aula');
  });

  it('deve emitir itemClicked ao clicar em um link', async () => {
    const emitSpy = vi.spyOn(component.itemClicked, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const firstLink = compiled.querySelector('.nav-link') as HTMLElement;
    firstLink.click();
    await fixture.whenStable();
    expect(emitSpy).toHaveBeenCalled();
  });
});
