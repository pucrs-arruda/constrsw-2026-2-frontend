import { Location } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subscription, expand, finalize, reduce } from 'rxjs';
import { RoomsAccess } from '../data/rooms-access.service';
import type { ApiError } from '../data/api-error';
import {
  AlertBanner,
  openConfirmDialog,
  EmptyState,
  SkeletonBlock,
} from '../../../shared/ui';
import { RoomsApiService } from '../data/rooms-api.service';
import type { AccessibilityFeature, Room, RoomView } from '../data/rooms.models';
import { capacityLabel, floorLabel, currentTermLabel } from '../data/rooms.utils';
import { RoomFormDialog } from '../list/room-form.dialog';
import { FeatureFormDialog } from './feature-form.dialog';
import { RoomClassesComponent } from './room-classes.component';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-room-detail',
  imports: [
    RouterLink,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    RoomClassesComponent,
    AlertBanner,
    EmptyState,
    SkeletonBlock,
  ],
  templateUrl: './room-detail.page.html',
  styleUrl: './room-detail.page.scss',
})
export class RoomDetailPage implements OnInit {
  protected readonly access = inject(RoomsAccess);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(RoomsApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private roomRequest?: Subscription;
  private featuresRequest?: Subscription;
  private id = '';

  protected readonly room = signal<RoomView | null>(null);
  protected readonly features = signal<AccessibilityFeature[]>([]);
  protected readonly roomError = signal<ApiError | null>(null);
  protected readonly featuresError = signal<ApiError | null>(null);
  protected readonly notFound = signal(false);
  protected readonly loadingFeatures = signal(false);
  protected readonly busy = signal(false);
  protected readonly floorLabel = floorLabel;
  protected readonly listParams = signal<Params | undefined>(undefined);
  protected readonly term = computed(() => currentTermLabel(this.room()?.classes ?? []));
  protected readonly capacityLabel = capacityLabel;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id = params.get('id')?.toLowerCase() ?? '';
      const state = this.location.getState() as { queryParams?: Params } | null;
      const previous = this.router.currentNavigation()?.previousNavigation?.finalUrl;
      const fromList = previous && this.router.serializeUrl(previous).split(/[?#]/)[0] === '/salas';
      this.listParams.set(state?.queryParams ?? (fromList ? previous.queryParams : undefined));
      this.load();
      queueMicrotask(() => {
        if (!this.destroyRef.destroyed) this.heading().nativeElement.focus();
      });
    });
  }

  protected load(keepRoom = false): void {
    this.roomRequest?.unsubscribe();
    this.featuresRequest?.unsubscribe();
    if (!keepRoom) this.room.set(null);
    this.roomError.set(null);
    const id = this.id;
    this.notFound.set(!UUID.test(id));
    if (this.notFound()) return;

    this.roomRequest = this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (room) => this.room.set(room),
        error: (error: ApiError) => {
          if (error.kind === 'not-found') this.notFound.set(true);
          else this.roomError.set(error);
        },
      });
    this.loadFeatures();
  }

  protected loadFeatures(): void {
    this.featuresRequest?.unsubscribe();
    this.loadingFeatures.set(true);
    this.featuresError.set(null);
    const id = this.id;
    const size = 20;
    this.featuresRequest = this.api
      .listFeatures(id, { page: 0, size })
      .pipe(
        expand(({ items, total }, index) =>
          items.length && (index + 1) * size < total
            ? this.api.listFeatures(id, { page: index + 1, size })
            : EMPTY,
        ),
        reduce((features, page) => features.concat(page.items), [] as AccessibilityFeature[]),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingFeatures.set(false)),
      )
      .subscribe({
        next: (features) => this.features.set(features),
        error: (error: ApiError) => this.featuresError.set(error),
      });
  }

  protected async copy(resourceId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(resourceId);
      this.notify('Identificador copiado.');
    } catch {
      this.notify('Não foi possível copiar o identificador.');
    }
  }

  protected editRoom(room: Room, trigger?: MatMenuTrigger): void {
    if (!this.access.canWrite() || this.busy()) return;
    RoomFormDialog.open(this.dialogs, { mode: 'edit', room })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        trigger?.focus();
        if (saved && this.id === room.id) {
          this.notify('Sala ' + saved.code + ' atualizada.');
          this.load(true);
        }
      });
  }

  protected deleteRoom(room: Room, trigger?: MatMenuTrigger): void {
    if (!this.access.canWrite() || this.busy()) return;
    openConfirmDialog(this.dialogs, {
      title: 'Excluir sala ' + room.code + '?',
      message:
      'A sala ' +
      room.code +
      ' (' +
      room.name +
      ') deixará de aparecer nas listas e os recursos vinculados a ela serão liberados. Esta ação não pode ser desfeita pela interface.',
      confirmLabel: 'Excluir sala',
    }, this.breakpoints)
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        trigger?.focus();
        if (!confirmed || this.id !== room.id || !this.access.canWrite() || this.busy()) return;
        this.mutate(
          this.api.remove(room.id),
          () => this.returnToList(room.id, 'Sala ' + room.code + ' excluída.'),
          (error) => {
            if (error.kind === 'not-found')
              this.returnToList(room.id, 'A sala já havia sido excluída.');
            else this.notify(error.message || 'Não foi possível excluir a sala.');
          },
        );
      });
  }

  protected editFeature(feature?: AccessibilityFeature, trigger?: MatMenuTrigger): void {
    if (!this.access.canWrite() || this.busy()) return;
    const roomId = this.id;
    this.dialogs
      .open(FeatureFormDialog, {
        ...this.formSize(),
        disableClose: true,
        data: { roomId, feature },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        trigger?.focus();
        if (!saved || this.id !== roomId) return;
        this.features.update((items) =>
          feature
            ? items.map((item) => (item.id === feature.id ? saved : item))
            : [...items, saved],
        );
        this.notify(feature ? 'Recurso atualizado.' : 'Recurso adicionado.');
      });
  }

  protected deleteFeature(feature: AccessibilityFeature, trigger?: MatMenuTrigger): void {
    if (!this.access.canWrite() || this.busy()) return;
    const roomId = this.id;
    openConfirmDialog(this.dialogs, {
      title: 'Excluir recurso ' + feature.code + '?',
      message: 'O recurso ' + feature.code + ' deixará de aparecer nesta sala.',
      confirmLabel: 'Excluir recurso',
    }, this.breakpoints)
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        trigger?.focus();
        if (!confirmed || this.id !== roomId || !this.access.canWrite() || this.busy()) return;
        this.mutate(
          this.api.removeFeature(roomId, feature.id),
          () => {
            if (this.id !== roomId) return;
            this.features.update((items) => items.filter((item) => item.id !== feature.id));
            this.notify('Recurso excluído.');
          },
          (error) => this.notify(error.message || 'Não foi possível excluir o recurso.'),
        );
      });
  }

  protected toggleFeature(feature: AccessibilityFeature, event: MatSlideToggleChange): void {
    if (!this.access.canWrite() || this.busy()) return;
    const roomId = this.id;
    const present = event.checked;
    this.replaceFeature({ ...feature, present });
    this.mutate(
      this.api.patchFeature(roomId, feature.id, { present }),
      (saved) => {
        if (this.id === roomId) this.replaceFeature(saved);
      },
      (error) => {
        if (this.id === roomId) {
          this.replaceFeature(feature);
          event.source.checked = feature.present;
        }
        this.notify(error.message || 'Não foi possível alterar a presença do recurso.');
      },
    );
  }

  private replaceFeature(feature: AccessibilityFeature): void {
    this.features.update((items) => items.map((item) => (item.id === feature.id ? feature : item)));
  }

  private formSize() {
    return this.breakpoints.isMatched('(max-width: 599px)')
      ? { width: '100vw', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh' }
      : { width: '560px', maxWidth: 'calc(100vw - 32px)' };
  }

  private mutate<T>(
    request: Observable<T>,
    next: (value: T) => void,
    error: (error: ApiError) => void,
  ): void {
    this.busy.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({ next, error });
  }

  private returnToList(roomId: string, message: string): void {
    if (this.id !== roomId) return;
    this.notify(message);
    void this.router.navigate(['/salas'], { queryParams: this.listParams() });
  }

  private notify(message: string): void {
    this.snackbar.open(message, 'Fechar', { duration: 4500, politeness: 'polite' });
  }
}
