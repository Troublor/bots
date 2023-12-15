import { OpenAPIRoute } from '@cloudflare/itty-router-openapi';
import { Context, Env } from '../types.js';

export class Reset extends OpenAPIRoute {
  static schema = {
    tags: ['Reset'],
    summary: 'Reset the bot',
    parameters: {},
    responses: {
      '200': {
        description: 'Reset the bot',
        schema: {
          success: Boolean,
        },
      },
    },
  };
  async handle(_: Request, env: Env, ctx: Context) {
    ctx.logger.info('Resetting the bot');

    const webhookUrl = env.WEBHOOK_URL as string;
    if (!webhookUrl) {
      throw new Error('WEBHOOK_URL is not set');
    }
    ctx.logger.info('Setting webhook', { url: webhookUrl });
    await ctx.bot.setWebHook(webhookUrl);

    const commands = [
      {
        command: 'status',
        description: 'Show the username linked to current chat.',
      },
      {
        command: 'help',
        description: 'Show help',
      },
      {
        command: 'link',
        description:
          'Link current chat to a username. This command takes one argument as username.',
      },
      {
        command: 'unlink',
        description: 'Unlink current chat from username.',
      },
    ];
    ctx.logger.info('Setting commands', { commands });
    await ctx.bot.setMyCommands(commands);

    return {
      success: true,
    };
  }
}
