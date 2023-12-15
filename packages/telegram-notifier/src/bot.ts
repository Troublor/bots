import { Logger } from '@troubots/tools';
import { Message, Update, WebhookInfo } from './types.js';

export interface TelegramAPIResp<T> {
  ok: boolean;
  description?: string;
  result: T;
}

export class TelegramBot {
  protected webhook_secret: string = 'telegram-notifier-webhook-secret';

  constructor(
    protected readonly logger: Logger,
    protected readonly token: string,
  ) {}

  protected async makeRequest<T>(
    method: string,
    data: Record<string, unknown> = {},
  ): Promise<TelegramAPIResp<T>> {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
    this.logger.trace('Sent Telegram API request', { url, payload });
    const response = await fetch(url, payload);
    const resp = await response.json<TelegramAPIResp<T>>();
    this.logger.trace('Got Telegram API response', { resp });
    if (!resp.ok) {
      throw new Error(resp.description);
    }
    return resp;
  }

  async setWebHook(url: string) {
    const { result } = await this.makeRequest<boolean>('setWebhook', {
      url,
      secret_token: this.webhook_secret,
      allowed_updates: [], // empty list to accept all updates
    });
    this.logger.debug('Set Telegram webhook', { success: result, url });
    return result;
  }

  async getWebhookInfo(): Promise<WebhookInfo> {
    const { result } = await this.makeRequest<WebhookInfo>('getWebhookInfo');
    this.logger.debug('Got Telegram webhook info', { result });
    return result;
  }

  async getUpdates(): Promise<Update[]> {
    const { result } = await this.makeRequest<Update[]>('getUpdates');
    this.logger.debug('Got Telegram updates', { result });
    return result;
  }

  async sendMessage(chat_id: number, text: string): Promise<Message> {
    const { result } = await this.makeRequest<Message>('sendMessage', {
      chat_id,
      text,
    });
    this.logger.debug('Sent Telegram message', { result });
    return result;
  }

  async setMyCommands(commands: { command: string; description: string }[]) {
    const { result } = await this.makeRequest<boolean>('setMyCommands', {
      commands,
    });
    this.logger.debug('Set Telegram commands', { result });
    return result;
  }

  async getMyCommands() {
    const { result } =
      await this.makeRequest<{ command: string; description: string }[]>(
        'getMyCommands',
      );
    this.logger.debug('Got Telegram commands', { result });
    return result;
  }
}
