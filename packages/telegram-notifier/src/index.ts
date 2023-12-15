import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import { Webhook } from './endpoints/webhook.js';
import {
  ConsoleTransport,
  Logger,
  parseLogLevel,
  TimestampAppender,
} from '@troubots/tools';
import { TelegramBot } from './bot.js';
import { NotifyByGet, NotifyByPost } from './endpoints/notify.js';
import { Store } from './store.js';
import { Reset } from './endpoints/reset.js';
import { Context, Env, KV } from './types.js';

async function prepareObjects(
  _: Request,
  env: Env,
  ctx: Context,
): Promise<void> {
  const botToken = env.BOT_TOKEN as string;
  if (!botToken) {
    throw new Error('BOT_TOKEN is not set');
  }

  const logLevel = parseLogLevel((env.LOG_LEVEL as string) || 'INFO');
  const logger = new Logger({
    transformers: [new TimestampAppender()],
    transports: [new ConsoleTransport(logLevel)],
  });
  const bot = new TelegramBot(logger, botToken);

  const store = new Store(env['telegram-notifier'] as KV);

  ctx.bot = bot;
  ctx.logger = logger;
  ctx.store = store;
}

export const router = OpenAPIRouter({
  docs_url: '/docs',
  raiseUnknownParameters: false,
});

router.all('/*', prepareObjects);
router.get('/reset', Reset);
router.post('/webhook', Webhook);
router.get('/notify/:username/:message', NotifyByGet);
router.post('/notify/:username', NotifyByPost);

// 404 for everything else
router.all('*', () =>
  Response.json(
    {
      success: false,
      error: 'Route not found',
    },
    { status: 404 },
  ),
);

export default {
  fetch: router.handle,
};
