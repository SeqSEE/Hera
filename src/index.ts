/*
 * Copyright 2020 Cryptech Services
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
import dotenv from 'dotenv';
import { Client, TextChannel, PresenceData, Message } from 'discord.js';
import DiscordHandler from './internal/DiscordHandler';
import CommandHandler from './internal/CommandHandler';
import MessageHandler from './internal/MessageHandler';
import Commands from './Commands';

let start = async (disabled: string[], admins: string[]) => {
  const envConf = dotenv.config();
  const client: Client = new Client();
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
        console.log(`Disabled ${cmd.getName}`);
    }
  });
  client.on('ready', async () => {
    if (((process.env.DEBUG as unknown) as number) === 1)
      console.log(`Logged in as ${client.user!.tag}!`);
    let chan: TextChannel | null =
      (await client.channels.fetch(
        process.env.DEFAULT_CHAN as string
      )) instanceof TextChannel
        ? ((await client.channels.fetch(
            process.env.DEFAULT_CHAN as string
          )) as TextChannel)
        : null;
    let supportEmbed = {
      embed: {
        color: 8359053,
        author: {
          name: process.env.BOT_NAME as string,
          icon_url: process.env.ICON_URL as string,
        },
        title: `**Welcome to the Support Channel**`,
        url: '',
        description: `**My objective is to resolve any issues you have as quickly as possible. Make sure your ticket is as detailed as possible and a human helper will assist you.**`,
        fields: [
          {
            name: `**Information when creating a support ticket**`,
            value: `- Include detailed description of your issue(s)\n- Any relevant transaction ID\n- Your relevant username or email address\n- Any other information that may be relevant\n`,
            inline: false,
          },
          {
            name: `**Communication is key**`,
            value: `Failure to communicate within the ticket channel will result in your issue being automatically closed after 24 hours of non-communication.`,
            inline: false,
          },
          {
            name: `**Create a support ticket**`,
            value: `To create a ticket react with :question:`,
            inline: false,
          },
        ],
        timestamp: new Date(),
        image: {
          url: '',
        },
        footer: {
          iconURL: process.env.ICON_URL as string,
          text: process.env.BOT_NAME as string,
        },
      },
    };
    if (chan) await (await chan.send(supportEmbed)).react('❓');

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
  client.on('message', (msg: Message) => {
    if (msg.author.bot) return;
    msgHandler.handleMessage({
      channel: msg.channel.id,
      author: msg.author.id,
      content: msg.content,
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
