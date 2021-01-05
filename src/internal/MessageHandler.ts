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

import CommandHandler from './CommandHandler';

export default class MessageHandler {
  private commandHandler: CommandHandler;

  constructor(commandHandler: CommandHandler) {
    this.commandHandler = commandHandler;
  }

  public getCommandHandler(): CommandHandler {
    return this.commandHandler;
  }

  public handleMessage(msgObj: {
    channel: string;
    author: string;
    content: string;
  }) {
    let m = msgObj.content.split(' ');
    if (m.length > this.commandHandler.getCmdPrefix().length - 1) {
      if (this.commandHandler) {
        const command = this.commandHandler.getCommand(
          m[0]
            .toLowerCase()
            .substring(this.commandHandler.getCmdPrefix().length)
        );
        if (command) {
          if (command.isEnabled()) {
            command.execute(msgObj);
          }
        }
      }
    }
  }
}
