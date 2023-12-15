import {
  OpenAPIRoute,
  OpenAPIRouteSchema,
  RouteOptions,
} from '@cloudflare/itty-router-openapi';
import { Context, Env } from '../types.js';

export class Webhook extends OpenAPIRoute {
  constructor(params: RouteOptions) {
    super({ ...params, raiseUnknownParameters: false });
  }

  static schema: OpenAPIRouteSchema = {
    tags: ['Webhook'],
    summary: 'Telegram Bot Webhook',
    parameters: {},
    requestBody: {
      update_id: Number,
      message: {
        message_id: Number,
        chat: { id: Number },
        text: String,
        entities: [
          {
            type: String,
            offset: Number,
            length: Number,
          },
        ],
      },
    },
    responses: {
      '200': {
        description: 'Returns a list of tasks',
        schema: {
          success: Boolean,
        },
      },
    },
  };
  async handle(
    request: Request,
    env: Env,
    ctx: Context,
    data: {
      body: {
        message: {
          chat: { id: number };
          text: string;
          entities: { type: string; offset: number; length: number }[];
        };
      };
    },
  ) {
    ctx.logger.trace('Got webhook request', { req: request, data });
    const chatId = data.body.message.chat.id;
    const text = data.body.message.text;
    const entities = data.body.message.entities;
    if (!entities || !entities.length) {
      await this.displayHelp(env, ctx, chatId);
      return { success: false };
    }

    const command = text.substring(entities[0].offset, entities[0].length);
    switch (command) {
      case '/link':
        return await this.handleLinkCommand(env, ctx, data.body);
      case '/unlink':
        return await this.handleUnlinkCommand(env, ctx, data.body);
      case '/status':
        return await this.handleStatusCommand(env, ctx, data.body);
      case '/help':
        return await this.displayHelp(env, ctx, chatId);
      default:
        await this.displayHelp(env, ctx, chatId);
        return { success: false };
    }
  }

  async handleLinkCommand(
    env: Env,
    ctx: Context,
    data: {
      message: {
        chat: { id: number };
        text: string;
      };
    },
  ): Promise<{ success: boolean }> {
    const chatId = data.message.chat.id;
    const username = data.message.text
      .split(' ')
      .filter((s) => s.length > 0)[1];
    ctx.logger.info('Linking chat to username', { chatId, username });
    if (!username) {
      await ctx.bot.sendMessage(
        chatId,
        'Please provide a username, e.g., /link myId',
      );
      return { success: false };
    }
    await ctx.store.linkChat(username, chatId);
    await ctx.bot.sendMessage(
      chatId,
      `Linked your chat to username ${username}.`,
    );
    return { success: true };
  }

  async handleUnlinkCommand(
    _: Env,
    ctx: Context,
    data: {
      message: {
        chat: { id: number };
      };
    },
  ): Promise<{ success: boolean }> {
    const chatId = data.message.chat.id;
    const username = await ctx.store.getUsername(chatId);
    ctx.logger.info('Unlinking chat from username', { chatId, username });
    if (!username) {
      await ctx.bot.sendMessage(
        chatId,
        'Your chat is not linked to any username.',
      );
      return { success: false };
    }
    await ctx.store.unlinkChat(chatId);
    await ctx.bot.sendMessage(
      chatId,
      `Unlinked your chat from username ${username}.`,
    );
    return { success: true };
  }

  async handleStatusCommand(
    _: Env,
    ctx: Context,
    data: {
      message: {
        chat: { id: number };
      };
    },
  ): Promise<{ success: boolean }> {
    const chatId = data.message.chat.id;
    const username = await ctx.store.getUsername(chatId);
    ctx.logger.info('Getting the username linked to chat', {
      chatId,
      username,
    });
    if (!username) {
      await ctx.bot.sendMessage(
        chatId,
        'Your chat is not linked to any username.',
      );
      return { success: false };
    }
    await ctx.bot.sendMessage(
      chatId,
      `Your chat is linked to username ${username}.`,
    );
    return { success: true };
  }

  async displayHelp(
    env: Env,
    ctx: Context,
    chatId: number,
  ): Promise<{ success: boolean }> {
    const webhookUrl = env.WEBHOOK_URL as string;
    const url = new URL(webhookUrl);
    const serverDomain = url.protocol + '//' + url.hostname;
    const helpText = `Telegram Notification Service.
    Making it possible to programmably send telegram notifications programmatically.
Usage:
    /link current chat to a specific username. You can use any string.
    In your program running on servers, send HTTP request to the RESTful API below with the username.
    You will get notifications with the message sent from your program here!
Availability:
    The service is deployed on ${serverDomain}.
RESTful API:
    GET Method
      curl -X 'GET' ${serverDomain}/notify/<username>/<message>
    POST Method
      curl -X 'POST' ${serverDomain}/notify/<username> -H 'Content-Type: text/plain' -d '<message>'
Commands:
    /link <username> [<password>] - link current chat to a specific username.
                     The password is not needed if your user has not configured a password.
                     Then, you can use the RESTful API to send notification programmatically.
                     E.g., /link myId myPass
                           In any program, call the restful API, you will get notification here on Telegram.
    /status - show the username that current chat is linked to.
    /unlink - unlink current chat from username. You will not receive notification anymore.
    /help - show this usage.`;
    ctx.logger.info('Sending help message', { helpText });
    await ctx.bot.sendMessage(chatId, helpText);
    return { success: true };
  }
}
