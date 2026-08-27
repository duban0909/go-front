import { Component, Input, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-chat-link-qr-card',
  imports: [LucideIconComponent, UiButtonComponent],
  templateUrl: './chat-link-qr-card.component.html',
  styleUrl: './chat-link-qr-card.component.css'
})
export class ChatLinkQrCardComponent {
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) chatLink!: string;
  @Input({ required: true }) businessName!: string;
  @Input({ required: true }) whatsapp!: string;

  readonly linkCopied = signal(false);
  readonly isGeneratingQr = signal(false);
  readonly qrError = signal('');
  readonly qrCardImage = signal('');

  async copyLink(): Promise<void> {
    if (!this.chatLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.chatLink);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles sin interaccion previa; se ignora en silencio.
    }
  }

  async generateQrCard(): Promise<void> {
    if (!this.chatLink || this.isGeneratingQr()) {
      return;
    }

    this.qrError.set('');
    this.isGeneratingQr.set(true);

    try {
      const qrCard = await firstValueFrom(
        this.apiService.generateQrCard({
          chat_link: this.chatLink,
          business_name: this.businessName,
          whatsapp: this.whatsapp
        })
      );

      const previousUrl = this.qrCardImage();
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      this.qrCardImage.set(URL.createObjectURL(qrCard));
    } catch {
      this.qrError.set('No se pudo generar el codigo QR.');
    } finally {
      this.isGeneratingQr.set(false);
    }
  }

  downloadQrCard(): void {
    const image = this.qrCardImage();

    if (!image) {
      return;
    }

    const name = this.businessName || 'negocio';
    const fileName = `qr-${name.trim().toLowerCase().replace(/\s+/g, '-')}.png`;

    const link = document.createElement('a');
    link.href = image;
    link.download = fileName;
    link.click();
  }
}
