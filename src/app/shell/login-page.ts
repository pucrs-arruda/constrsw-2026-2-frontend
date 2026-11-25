import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthSession } from './auth-session';
import { OauthRequestError } from './oauth-api';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly bannerMessage = signal<string | null>(null);
  readonly bannerKind = signal<'refusal' | 'identity' | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    this.bannerMessage.set(null);
    this.bannerKind.set(null);

    const username = this.form.controls.username.value.trim();
    const password = this.form.controls.password.value;
    if (!username || !password) {
      this.bannerMessage.set(
        'Não foi possível entrar. Verifique usuário e senha.',
      );
      this.bannerKind.set('refusal');
      return;
    }

    this.submitting.set(true);
    this.form.disable({ emitEvent: false });

    this.session
      .login(username, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.form.enable({ emitEvent: false });
          void this.router.navigateByUrl('/');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.form.enable({ emitEvent: false });
          this.showBanner(err);
        },
      });
  }

  private showBanner(err: unknown): void {
    if (err instanceof OauthRequestError) {
      if (err.kind === 'credentials_rejected') {
        this.bannerMessage.set(err.message);
        this.bannerKind.set('refusal');
        return;
      }
      this.bannerMessage.set('Identidade indisponível.');
      this.bannerKind.set('identity');
      return;
    }
    this.bannerMessage.set('Identidade indisponível.');
    this.bannerKind.set('identity');
  }
}
