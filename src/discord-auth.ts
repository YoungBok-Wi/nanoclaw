/**
 * Discord Bot Authentication Script
 *
 * Run this during setup to authenticate with Discord.
 * Guides you through creating a Discord bot and saving the token.
 *
 * Usage: npx tsx src/discord-auth.ts
 */
import fs from 'fs';
import path from 'path';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import readline from 'readline';

const ENV_FILE = '.env';

interface Env {
  DISCORD_BOT_TOKEN?: string;
  CLAUDE_CODE_OAUTH_TOKEN?: string;
}

function loadEnv(): Env {
  if (!fs.existsSync(ENV_FILE)) {
    return {};
  }
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  const env: Env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const key = match[1] as keyof Env;
      env[key] = match[2];
    }
  }
  return env;
}

function saveEnv(env: Env): void {
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n');
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function authenticate(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Discord Bot Setup for NanoClaw');
  console.log('='.repeat(70));
  console.log();

  const env = loadEnv();

  if (env.DISCORD_BOT_TOKEN) {
    console.log('✓ Discord bot token already configured');
    console.log('  To re-configure, remove DISCORD_BOT_TOKEN from .env and run again.');
    console.log();
    process.exit(0);
  }

  console.log('To create a Discord bot, follow these steps:\n');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Click "New Application" and give it a name (e.g., "NanoClaw")');
  console.log('3. Go to the "Bot" tab on the left sidebar');
  console.log('4. Click "Reset Token" and copy the bot token');
  console.log('5. Under "Privileged Gateway Intents", enable:');
  console.log('   • SERVER MEMBERS INTENT');
  console.log('   • MESSAGE CONTENT INTENT');
  console.log('6. Go to OAuth2 → URL Generator:');
  console.log('   • Scopes: bot');
  console.log('   • Bot Permissions: Send Messages, Read Messages, Read Message History');
  console.log('7. Copy the generated URL and open it to invite the bot to your server');
  console.log();

  const token = await prompt('Enter your Discord bot token: ');

  if (!token) {
    console.log('\n✗ No token provided. Exiting.');
    process.exit(1);
  }

  console.log('\nTesting bot token...\n');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      client.once(Events.ClientReady, (c) => {
        clearTimeout(timeout);
        console.log(`✓ Successfully authenticated as ${c.user.tag}!`);
        console.log(`  Bot is in ${c.guilds.cache.size} server(s)`);
        console.log();
        resolve();
      });

      client.once(Events.Error, (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.login(token).catch(reject);
    });

    // Save token to .env
    env.DISCORD_BOT_TOKEN = token;
    saveEnv(env);

    console.log('✓ Bot token saved to .env');
    console.log('  You can now start the NanoClaw service.\n');

    await client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Authentication failed:', (err as Error).message);
    console.log('\nPlease check:');
    console.log('  • The bot token is correct');
    console.log('  • You have enabled the required intents in Discord Developer Portal');
    console.log('  • Your internet connection is stable\n');
    process.exit(1);
  }
}

authenticate().catch((err) => {
  console.error('Authentication failed:', err.message);
  process.exit(1);
});
