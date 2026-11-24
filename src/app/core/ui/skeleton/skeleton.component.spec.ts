import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();
  });

  it('deve renderizar a quantidade de linhas configurada', () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('rows', 3);
    fixture.componentRef.setInput('variant', 'table');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(3);
  });

  it('deve ter aria-busy="true"', () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skeleton-container')?.getAttribute('aria-busy')).toBe('true');
  });
});
