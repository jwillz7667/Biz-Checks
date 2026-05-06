import { buildApp } from './app.js';
import { loadConfig } from './shared/config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  const close = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      app.log.error({ err: e }, 'shutdown failed');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void close('SIGTERM'));
  process.on('SIGINT', () => void close('SIGINT'));

  await app.listen({ port: config.port, host: config.host });
  app.log.info({ port: config.port, host: config.host }, 'api listening');
}

void main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
