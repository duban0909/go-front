import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../core/services/goagenda-api.service';
import { LucideIconComponent } from '../../shared/components/lucide-icon/lucide-icon.component';

const SESSION_KEY_PREFIX = 'goagenda_chat_session_';
const SOUND_PREF_KEY = 'goagenda_chat_sound_enabled';
const TEXTAREA_MAX_HEIGHT = 120;

interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat-page',
  imports: [LucideIconComponent],
  templateUrl: './chat.page.html',
  styleUrl: './chat.page.css'
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollAnchor') private readonly scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;

  readonly businessName = signal('');
  readonly employeeName = signal('');
  readonly enabled = signal(true);
  readonly isLoadingConfig = signal(true);
  readonly notFound = signal(false);
  readonly messages = signal<ChatBubble[]>([]);
  readonly draft = signal('');
  readonly isSending = signal(false);
  readonly errorMessage = signal('');
  readonly soundEnabled = signal(localStorage.getItem(SOUND_PREF_KEY) !== 'false');

  readonly businessInitial = computed(() => (this.businessName().trim().charAt(0) || 'G').toUpperCase());
  readonly canSend = computed(() => this.enabled() && !this.isSending() && this.draft().trim().length > 0);

  private businessId = '';
  private employeeId = '';
  private sessionId = '';
  private shouldScroll = false;
  private audioContext?: AudioContext;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly apiService: GoagendaApiService
  ) {}

  ngOnInit(): void {
    this.businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') ?? '';

    if (!this.businessId) {
      this.notFound.set(true);
      this.isLoadingConfig.set(false);
      return;
    }

    void this.bootstrap();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
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
      void this.sendMessage();
    }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem(SOUND_PREF_KEY, String(next));
  }

  formatMessage(content: string): string {
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/\*([^\n*]+)\*/g, '<strong>$1</strong>');
  }

  async sendMessage(): Promise<void> {
    const text = this.draft().trim();

    if (!text || this.isSending() || !this.sessionId) {
      return;
    }

    this.messages.update((current) => [...current, { role: 'user', content: text }]);
    this.draft.set('');
    this.errorMessage.set('');
    this.isSending.set(true);
    this.resetComposerHeight();
    this.queueScroll();

    try {
      const respuesta = await firstValueFrom(
        this.apiService.sendChatMessage(this.businessId, this.sessionId, text, this.employeeId || undefined)
      );
      this.messages.update((current) => [...current, { role: 'assistant', content: respuesta }]);
      this.playNotificationSound();
    } catch {
      this.errorMessage.set('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      this.isSending.set(false);
      this.queueScroll();
    }
  }

  private async bootstrap(): Promise<void> {
    try {
      const config = await firstValueFrom(this.apiService.getChatConfig(this.businessId, this.employeeId || undefined));
      this.businessName.set(config.name);
      this.employeeName.set(config.employee_name ?? '');
      this.enabled.set(config.enabled);
    } catch {
      this.notFound.set(true);
      this.isLoadingConfig.set(false);
      return;
    }

    this.isLoadingConfig.set(false);
    await this.restoreOrCreateSession();
  }

  private async restoreOrCreateSession(): Promise<void> {
    const storageKey = SESSION_KEY_PREFIX + this.businessId + (this.employeeId ? `_${this.employeeId}` : '');
    const storedSessionId = localStorage.getItem(storageKey);

    if (storedSessionId) {
      try {
        const history = await firstValueFrom(
          this.apiService.getChatHistory(this.businessId, storedSessionId, this.employeeId || undefined)
        );
        this.sessionId = storedSessionId;
        this.messages.set(history.map((message) => ({ role: this.normalizeRole(message.role), content: message.content })));

        if (this.messages().length === 0) {
          this.pushGreeting();
        }

        this.queueScroll();
        return;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    try {
      const sessionId = await firstValueFrom(this.apiService.createChatSession(this.businessId, this.employeeId || undefined));
      this.sessionId = sessionId;
      localStorage.setItem(storageKey, sessionId);
      this.pushGreeting();
      this.queueScroll();
    } catch {
      this.errorMessage.set('No se pudo iniciar el chat. Intenta recargar la pagina.');
    }
  }

  private pushGreeting(): void {
    const name = this.businessName() || 'este negocio';
    this.messages.set([
      {
        role: 'assistant',
        content: `Hola, soy el asistente virtual de ${name}. Cuentame que servicio necesitas y te ayudo a agendar tu cita.`
      }
    ]);
  }

  private normalizeRole(role: string): 'user' | 'assistant' {
    return role === 'user' || role === 'human' ? 'user' : 'assistant';
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

  private playNotificationSound(): void {
    if (!this.soundEnabled()) {
      return;
    }

    try {
      this.audioContext ??= new AudioContext();
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.09);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch {
      // El navegador puede bloquear audio sin interaccion previa; se ignora en silencio.
    }
  }
}
