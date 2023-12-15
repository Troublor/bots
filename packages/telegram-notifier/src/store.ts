import { KV } from './types.js';

export class Store {
  constructor(protected readonly kv: KV) {}

  async linkChat(username: string, chatId: number): Promise<void> {
    await this.kv.put(`username:${username}`, `${chatId}`);
    await this.kv.put(`chatId:${chatId}`, username);
  }

  async unlinkChat(chatId: number): Promise<void> {
    const username = this.kv.get(`chatId:${chatId}`);
    if (username) {
      await this.kv.delete(`username:${username}`);
    }
    await this.kv.delete(`chatId:${chatId}`);
  }

  async getChatId(username: string): Promise<number | undefined> {
    const chatId = await this.kv.get(`username:${username}`);
    if (chatId) {
      return parseInt(chatId);
    }
    return undefined;
  }

  async getUsername(chatId: number): Promise<string | undefined> {
    const username = await this.kv.get(`chatId:${chatId}`);
    if (username) {
      return username;
    }
    return undefined;
  }
}
