import {
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../auth/auth.service';
import { UNAVAILABLE_MESSAGE } from '../../auth/auth-session';
import { RefusalBannerComponent } from '../../shared/ui/refusal-banner/refusal-banner.component';

export function loginDestination(router: Router, returnUrl: string | null): UrlTree {
  const fallback = router.createUrlTree(['/salas']);
  if (!returnUrl || !returnUrl.startsWith('/') || /^\/[/%]/.test(returnUrl)) return fallback;

  const path = returnUrl.split(/[?#]/)[0];
  if (/[\\\s]/.test(path) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) return fallback;

  const target = router.parseUrl(returnUrl);
  const primary = target.root.children[PRIMARY_OUTLET];
  return primary?.segments.length && primary.segments[0].path !== 'login' ? target : fallback;
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RefusalBannerComponent,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly banner = viewChild('banner', { read: ElementRef });
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal(
    this.router.currentNavigation()?.extras.state?.['authError'] === UNAVAILABLE_MESSAGE
      ? UNAVAILABLE_MESSAGE
      : '',
  );

  constructor() {
    afterNextRender(() => {
      if (this.auth.isAuthenticated()) {
        void this.router.navigate(['/salas'], { replaceUrl: true });
      } else if (!this.error()) {
        this.heading().nativeElement.focus();
      }
    });
    afterRenderEffect(() => this.banner()?.nativeElement.focus());
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { email, password } = this.form.getRawValue();
    this.error.set('');
    this.busy.set(true);
    try {
      await this.auth.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(loginDestination(this.router, returnUrl), {
        replaceUrl: true,
      });
    } catch (error) {
      this.error.set(
        error &&
          typeof error === 'object' &&
          'kind' in error &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : UNAVAILABLE_MESSAGE,
      );
    } finally {
      this.busy.set(false);
    }
  }
}
