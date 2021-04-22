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
 import { Channel, GuildChannel, TextChannel } from 'discord.js';
 import CommandHandler from '../../internal/CommandHandler';
 import SupportHandler from '../../SupportHandler';
 
 export default async function archive(
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
    if (chan instanceof GuildChannel) {
      await supportHandler.archiveSupportTicket(
        ticket.id,
        (chan as GuildChannel).guild
      );
    }
  }
}


