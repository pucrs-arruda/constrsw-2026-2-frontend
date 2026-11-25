import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let component: SkeletonComponent;
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o SkeletonComponent', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve renderizar a quantidade padrão de 5 linhas', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(5);
  });

  it('deve renderizar a quantidade customizada de linhas', () => {
    component.rows = 3;
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(3);
  });

  it('deve aplicar classe de variante de tabela', () => {
    component.variant = 'table';
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.skeleton-container');
    expect(container.classList.contains('skeleton-table')).toBe(true);
  });

  it('deve aplicar classe de variante de card', () => {
    component.variant = 'card';
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.skeleton-container');
    expect(container.classList.contains('skeleton-card')).toBe(true);
  });
});
