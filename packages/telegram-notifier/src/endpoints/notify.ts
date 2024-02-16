import { OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi';
import { Context, Env } from '../types.js';

export class NotifyByGet extends OpenAPIRoute {
  static schema = {
    tags: ['Notify'],
    summary: 'Send Notification by GET Method',
    parameters: {
      username: Path(String, {
        description: 'Notifier username',
      }),
      message: Path(String, {
        description: 'Notification message',
      }),
    },
    responses: {
      '200': {
        description: 'Notification sent successfully',
        schema: {
          success: Boolean,
        },
      },
      '400': {
        description: 'Notification failed to send',
        schema: {
          success: Boolean,
          description: String,
        },
      },
    },
  };

  async handle(
    _: Request,
    __: Env,
    ctx: Context,
    data: { params: { username: string; message: string } },
  ) {
    ctx.logger.info('Sending notification', {
      username: data.params.username,
      msg: data.params.message,
    });
    const chatId = await ctx.store.getChatId(data.params.username);
    if (!chatId) {
      return {
        success: false,
        description: `Username ${data.params.username} not linked to any telegram chat.`,
      };
    } else {
      await ctx.bot.sendMessage(chatId, data.params.message);
      return {
        success: true,
      };
    }
  }
}

export class NotifyByPost extends OpenAPIRoute {
  static schema = {
    tags: ['Notify'],
    summary: 'Send Notification by GET Method',
    parameters: {
      username: Path(String, {
        description: 'Notifier username',
      }),
    },
    responses: {
      '200': {
        description: 'Notification sent successfully',
        schema: {
          success: Boolean,
        },
      },
      '400': {
        description: 'Notification failed to send',
        schema: {
          success: Boolean,
          description: String,
        },
      },
    },
  };

  async handle(
    req: Request,
    __: Env,
    ctx: Context,
    data: { params: { username: string } },
  ) {
    const contentType = req.headers.get('content-type');
    let msg;
    if (contentType === 'application/json') {
      msg = JSON.parse(await req.text()).message;
    } else {
      msg = await req.text();
    }
    ctx.logger.info('Sending notification', {
      username: data.params.username,
      msg,
    });
    const chatId = await ctx.store.getChatId(data.params.username);
    if (!chatId) {
      return {
        success: false,
        description: `Username ${data.params.username} not linked to any telegram chat.`,
      };
    } else {
      await ctx.bot.sendMessage(chatId, msg);
      return {
        success: true,
      };
    }
  }
}
