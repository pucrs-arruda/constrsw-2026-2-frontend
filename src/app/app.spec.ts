import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render blank shell brand on Material toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar.shell__brand')).toBeTruthy();
    expect(compiled.querySelector('.shell__mark')).toBeTruthy();
    expect(compiled.querySelector('.shell__mark-diamond')).toBeTruthy();
    expect(compiled.querySelector('.shell__stripe')).toBeTruthy();
    expect(compiled.querySelector('.shell__name')?.textContent).toContain('Closed CRAS');
    expect(compiled.querySelector('.shell__caption')?.textContent).toContain('PUCRS · ConstrSW');
  });
});
