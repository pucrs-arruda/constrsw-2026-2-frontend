import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
  });

  it('deve exibir mensagem e botão de ação opcional', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'Nenhuma sala cadastrada ainda.');
    fixture.componentRef.setInput('actionLabel', 'Nova sala');
    fixture.detectChanges();

    let actionTriggered = false;
    fixture.componentInstance.action.subscribe(() => {
      actionTriggered = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state-message')?.textContent).toContain('Nenhuma sala cadastrada ainda.');

    const button = el.querySelector('button');
    expect(button?.textContent).toContain('Nova sala');
    button?.click();
    expect(actionTriggered).toBe(true);
  });
});
