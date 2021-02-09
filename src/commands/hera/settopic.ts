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

export async function settopic(
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
          `Error: Invalid arguments\nUsage:\n${cmdHandler.getCmdPrefix()}settopic <topic>`
        );
      else if (user)
        user.send(
          `Error: Invalid arguments\nUsage:\n${cmdHandler}settopic <topic>`
        );
    } else {
      m.shift();
      const topic = m.join('-').substring(0, 32);
      if (topic.length > 0) {
        if (await supportHandler.updateTopic(topic, ticket)) {
          if (chan) chan.send(`Updated the topic to ${topic}`);
          else if (user) user.send(`Updated the topic to ${topic}`);
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
      } else {
        if (chan) chan.send(`Error: Invalid topic`);
        else if (user) user.send(`Error: Invalid topic`);
      }
    }
  } else {
    if (chan) chan.send(`Error: This is not a ticket channel`);
    else if (user) user.send(`Error: This is not a ticket channel`);
  }
}
