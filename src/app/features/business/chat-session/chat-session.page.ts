import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChatHistoryMessage } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

const POLL_INTERVAL_MS = 5000;
const TEXTAREA_MAX_HEIGHT = 120;

interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat-session-page',
  imports: [LucideIconComponent],
  templateUrl: './chat-session.page.html',
  styleUrl: './chat-session.page.css'
})
export class ChatSessionPageComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scrollAnchor') private readonly scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;

  readonly messages = signal<ChatBubble[]>([]);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly draft = signal('');
  readonly isSending = signal(false);
  readonly errorMessage = signal('');

  readonly canSend = computed(() => !this.isSending() && this.draft().trim().length > 0);

  private sessionId = '';
  private shouldScroll = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private readonly handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.visibilityState === 'visible') {
      this.resumePolling();
    } else {
      this.pausePolling();
    }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') ?? '';

    if (!this.sessionId || !this.sessionService.businessId()) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    void this.loadHistory();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      if (document.visibilityState === 'visible') {
        this.resumePolling();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  ngOnDestroy(): void {
    this.pausePolling();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  goBack(): void {
    void this.router.navigate(['/business/appointments']);
  }

  onDraftInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.draft.set(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendReply();
    }
  }

  formatMessage(content: string): string {
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const linked = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return linked.replace(/\*([^\n*]+)\*/g, '<strong>$1</strong>');
  }

  async sendReply(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const text = this.draft().trim();

    if (!text || this.isSending() || !businessId) {
      return;
    }

    this.draft.set('');
    this.errorMessage.set('');
    this.isSending.set(true);
    this.resetComposerHeight();

    try {
      const history = await firstValueFrom(this.apiService.replyToBusinessChatSession(businessId, this.sessionId, text));
      this.applyHistory(history);
    } catch {
      this.errorMessage.set('No se pudo enviar la respuesta. Intenta de nuevo.');
      this.draft.set(text);
    } finally {
      this.isSending.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    try {
      const history = await firstValueFrom(this.apiService.getBusinessChatSession(businessId, this.sessionId));
      this.applyHistory(history);
    } catch {
      this.notFound.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyHistory(history: ChatHistoryMessage[]): void {
    this.messages.set(history.map((message) => ({ role: this.normalizeRole(message.role), content: message.content })));
    this.queueScroll();
  }

  private normalizeRole(role: string): 'user' | 'assistant' {
    return role === 'user' || role === 'human' ? 'user' : 'assistant';
  }

  private resumePolling(): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => void this.pollForNewMessages(), POLL_INTERVAL_MS);
  }

  private pausePolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async pollForNewMessages(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId || this.isSending()) {
      return;
    }

    try {
      const history = await firstValueFrom(this.apiService.getBusinessChatSession(businessId, this.sessionId));

      if (history.length !== this.messages().length) {
        this.applyHistory(history);
      }
    } catch {
      // Un fallo de polling no debe interrumpir la vista; se reintenta en el siguiente ciclo.
    }
  }

  private resetComposerHeight(): void {
    const textarea = this.composerInput?.nativeElement;

    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  private queueScroll(): void {
    this.shouldScroll = true;
  }
}
