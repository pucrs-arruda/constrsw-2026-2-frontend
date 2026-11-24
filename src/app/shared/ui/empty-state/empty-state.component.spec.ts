import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o EmptyStateComponent', () => {
    component.message = 'Nenhuma sala cadastrada ainda.';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve exibir a mensagem e não renderizar botão quando actionLabel não for informado', () => {
    component.message = 'Nenhuma sala cadastrada ainda.';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-message')?.textContent).toContain(
      'Nenhuma sala cadastrada ainda.',
    );
    expect(compiled.querySelector('.empty-action')).toBeNull();
  });

  it('deve renderizar botão e emitir action quando actionLabel for informado', () => {
    component.message = 'Nenhuma sala cadastrada ainda.';
    component.actionLabel = 'Nova sala';
    fixture.detectChanges();

    const actionSpy = vi.spyOn(component.action, 'emit');
    const button = fixture.nativeElement.querySelector('.empty-action') as HTMLButtonElement;
    expect(button.textContent).toContain('Nova sala');

    button.click();
    expect(actionSpy).toHaveBeenCalled();
  });
});
