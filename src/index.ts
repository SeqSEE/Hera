/*
 * Copyright 2020-2021 Cryptech Services
 *
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import init from './internal/init';
import { Client, PresenceData, Message } from 'discord.js';
import DiscordHandler from './internal/DiscordHandler';
import CommandHandler from './internal/CommandHandler';
import MessageHandler from './internal/MessageHandler';
import Commands from './Commands';
import SupportHandler from './SupportHandler';

let start = async (disabled: string[], admins: string[]) => {
  const client: Client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  });
  let supportHandler: SupportHandler;

  const discord: DiscordHandler = new DiscordHandler(client);
  const cmdHandler: CommandHandler = new CommandHandler(
    <string>process.env.CMD_PREFIX,
    admins
  );
  const msgHandler: MessageHandler = new MessageHandler(cmdHandler);
  const commands = new Commands(discord, cmdHandler, msgHandler);
  await commands.registerCommands();
  Object.values(disabled).forEach((d) => {
    let cmd = cmdHandler.getCommandsMap().get(`${d as string}`);
    if (cmd) {
      cmd.setEnabled(false);
      if (Number(process.env.DEBUG as unknown) === 1)
        console.log(`${Date()} Disabled ${cmd.getName()}`);
    }
  });
  client.on('message', (msg: Message) => {
    if (msg.author.bot) return;
    if (supportHandler) {
      supportHandler.handleMessage({
        channel: msg.channel.id,
        author: msg.author.id,
      });
    }
    msgHandler.handleMessage({
      channel: msg.channel.id,
      author: msg.author.id,
      content: msg.content,
    });
  });

  client.on('ready', async () => {
    if (((process.env.DEBUG as unknown) as number) === 1)
      console.log(`${Date()} Logged in as ${client.user!.tag}!`);

    supportHandler = new SupportHandler(client, cmdHandler);

    client
      .user!.setStatus('online')
      .catch(console.log)
      .then(() => {
        if (((process.env.DEBUG as unknown) as number) === 1) console.log;
        discord.util.setStatus({
          status: 'online',
          activity: {
            name: 'I am here to Support',
            type: 'PLAYING',
          },
          afk: true,
        } as PresenceData);
      });
  });

  try {
    await client.login(process.env.API_KEY);
  } catch (e) {
    console.log(JSON.stringify(e));
    process.exit(1);
  }
};

init(start);
