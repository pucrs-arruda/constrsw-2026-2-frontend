import { Component, computed, input } from '@angular/core';
import {
  BFF_BANNER_MESSAGES,
  type AlertBannerKind,
} from '../http/bff-error';

export type { AlertBannerKind };

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  templateUrl: './alert-banner.html',
  styleUrl: './alert-banner.scss',
})
export class AlertBanner {
  /** Banner variant; identity/composition use locked institutional copy. */
  readonly kind = input.required<AlertBannerKind>();

  /**
   * Message for `refusal` only. Ignored for identity/composition
   * (locked defaults apply).
   */
  readonly message = input<string>('');

  readonly displayMessage = computed(() => {
    const kind = this.kind();
    if (kind === 'identity') {
      return BFF_BANNER_MESSAGES.identity;
    }
    if (kind === 'composition') {
      return BFF_BANNER_MESSAGES.composition;
    }
    return this.message().trim() || BFF_BANNER_MESSAGES.refusal;
  });
}
