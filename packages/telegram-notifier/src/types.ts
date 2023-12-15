import { TelegramBot } from './bot.js';
import { Logger } from '@troubots/tools';
import { Store } from './store.js';

export interface Env {
  BOT_TOKEN?: string;
  WEBHOOK_URL?: string;
  LOG_LEVEL?: string;
  'telegram-notifier': KV;
}

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface Context {
  bot: TelegramBot;
  logger: Logger;
  store: Store;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface Update {
  update_id: number;
  message: Message;
  edited_message: Message;
  // ...
}

export interface Message {
  message_id: number;
  message_thread_id: number;
  from: User;
  sender_chat: Chat;
  // ...
}

export interface Chat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  // ...
}

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: true;
  added_to_attachment_menu?: true;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}
