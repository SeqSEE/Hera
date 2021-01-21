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

import DiscordHandler from '../../internal/DiscordHandler';
import MessageObject from '../../interface/MessageObject';
import { TextChannel, User } from 'discord.js';
import CommandHandler from '../../internal/CommandHandler';
import SupportHandler from '../../SupportHandler';

export async function setowner(
  discord: DiscordHandler,
  cmdHandler: CommandHandler,
  supportHandler: SupportHandler,
  messageObj: MessageObject
): Promise<void> {
  let user = await discord.getClient().users.fetch(messageObj.author);
  let c = await discord.getClient().channels.fetch(messageObj.channel);
  let chan: TextChannel | null =
    c instanceof TextChannel ? (c as TextChannel) : null;
  if (
    messageObj.author !== process.env.SUPER_ADMIN &&
    !cmdHandler.isAdmin(messageObj.author)
  ) {
    if (chan) chan.send('Error: Permission Denied');
    else if (user) user.send('Error: Permission Denied');
    return;
  }
  const ticket = supportHandler.getTicketByChannel(messageObj.channel);
  if (ticket) {
    let m = messageObj.content.split(/\s+/);
    if (m.length < 2) {
      if (chan)
        chan.send(
          `Error: Invalid arguments\nUsage:\n${cmdHandler.getCmdPrefix()}setowner <mention or id>`
        );
      else if (user)
        user.send(
          `Error: Invalid arguments\nUsage:\n${cmdHandler}setowner <mention or id>`
        );
    } else {
      let mention = m[1];
      if (mention.match(discord.util.regexMention)) {
        if (mention.startsWith('<@') && mention.endsWith('>')) {
          mention = mention.slice(2, -1);

          if (mention.startsWith('!')) {
            mention = mention.slice(1);
          }
        }
      }
      let u: User | undefined = await discord.util.parseUser(mention);
      if (!u) {
        if (chan) chan.send(`Error: Invalid user ${m[1]}`);
        else if (user) user.send(`Error: Invalid user ${m[1]}`);
      } else {
        if (await supportHandler.updateOwner(u, ticket)) {
          if (chan) chan.send(`Updated the user to ${m[1]}`);
          else if (user) user.send(`Updated the user to ${m[1]}`);
        } else {
          if (chan)
            chan.send(
              `Failed to update the user to ${m[1]}. They may have a ticket open already.`
            );
          else if (user)
            user.send(
              `Failed to update the user to ${m[1]}. They may have a ticket open already.`
            );
        }
      }
    }
  } else {
    if (chan) chan.send(`Error: This is not a ticket channel`);
    else if (user) user.send(`Error: This is not a ticket channel`);
  }
}
