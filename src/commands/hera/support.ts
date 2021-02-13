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

import { Guild, TextChannel } from 'discord.js';
import MessageObject from '../../interface/MessageObject';
import SupportTicket from '../../interface/SupportTicket';
import SupportHandler from '../../SupportHandler';
import DiscordHandler from '../../internal/DiscordHandler';

export async function support(
  discord: DiscordHandler,
  supportHandler: SupportHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(messageObj.author);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  const ticket: SupportTicket | undefined = supportHandler.getTicketByUserId(
    messageObj.author
  );
  if (ticket === undefined) {
    const guild: Guild | undefined = discord
      .getClient()
      .guilds.cache.get(process.env.GUILD_ID as string);
    if (guild == undefined) {
      if (chan)
        await chan.send(
          `<@${messageObj.author}> your ticket could not be created`
        );
      else if (user)
        await user.send(
          `<@${messageObj.author}> your ticket could not be created`
        );
    } else {
      await supportHandler.createSupportTicket(guild, user);
    }
  } else {
    if (chan)
      await chan.send(
        `<@${messageObj.author}> you already have an open ticket`
      );
    else if (user)
      await user.send(
        `<@${messageObj.author}> you already have an open ticket`
      );
  }
}
