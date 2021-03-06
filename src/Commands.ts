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

import InternalCommands from './internal/InternalCommands';
import DiscordHandler from './internal/DiscordHandler';
import CommandHandler from './internal/CommandHandler';
import MessageHandler from './internal/MessageHandler';
import MessageObject from './interface/MessageObject';
import ping from './commands/example/ping';
import setowner from './commands/hera/setowner';
import SupportHandler from './SupportHandler';
import archive from './commands/hera/archive';
import settopic from './commands/hera/settopic';
import support from './commands/hera/support';
import resolve from './commands/hera/resolve';
import stall from './commands/hera/stall';

export default class Commands extends InternalCommands {
  private supportHandler: SupportHandler | undefined;
  constructor(
    discord: DiscordHandler,
    cmdHandler: CommandHandler,
    msgHandler: MessageHandler
  ) {
    super(discord, cmdHandler, msgHandler);
    this.supportHandler = undefined;
  }
  public async registerCommands(): Promise<void> {
    await super.registerCommands(); //register the internal commands first
    this.registerCommand(
      'ping',
      'ping',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: ping`);
        return ping(this.getDiscord(), messageObj);
      }
    );
    this.registerCommand(
      'setowner',
      'setowner <discord id or mention>',
      ['owner'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: setowner`
          );
        if (this.supportHandler != undefined) {
          return setowner(
            this.getDiscord(),
            this.getCommandHandler(),
            this.supportHandler,
            messageObj
          );
        }
      }
    );
    this.registerCommand(
      'settopic',
      'settopic <topic>',
      ['topic'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: settopic`
          );
        if (this.supportHandler != undefined) {
          return settopic(
            this.getDiscord(),
            this.getCommandHandler(),
            this.supportHandler,
            messageObj
          );
        }
      }
    );
    this.registerCommand(
      'support',
      'support',
      ['ticket'],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: support`
          );
        if (this.supportHandler != undefined) {
          return support(this.getDiscord(), this.supportHandler, messageObj);
        }
      }
    );
    this.registerCommand(
      'resolve',
      'resolve',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: resolve`
          );
        if (this.supportHandler != undefined) {
          return resolve(
            this.getDiscord(),
            this.getCommandHandler(),
            this.supportHandler,
            messageObj
          );
        }
      }
    );
    this.registerCommand(
      'archive',
      'archive',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(
            `${Date()} author: ${messageObj.author} command: archive`
          );
        if (this.supportHandler != undefined) {
          return archive(
            this.getDiscord(),
            this.getCommandHandler(),
            this.supportHandler,
            messageObj
          );
        }
      }
    );
    this.registerCommand(
      'stall',
      'stall',
      [],
      async (messageObj: MessageObject) => {
        if (Number(process.env.DEBUG) === 1)
          console.log(`${Date()} author: ${messageObj.author} command: stall`);
        if (this.supportHandler != undefined) {
          return stall(
            this.getDiscord(),
            this.getCommandHandler(),
            this.supportHandler,
            messageObj
          );
        }
      }
    );
  }
  public getSupportHandler(): SupportHandler | undefined {
    return this.supportHandler;
  }

  public setSupportHandler(supportHandler: SupportHandler) {
    this.supportHandler = supportHandler;
  }
}
