/*
 * Copyright 2021 Cryptech Services
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

import fs from 'fs';
import {
  CategoryChannel,
  Channel,
  Client,
  GuildChannel,
  Message,
  MessageReaction,
  PartialDMChannel,
  PartialMessage,
  PartialUser,
  Role,
  RoleData,
  TextChannel,
  User,
} from 'discord.js';
import SupportTicket from './interface/SupportTicket';
import CommandHandler from './internal/CommandHandler';
const supportDataFile = './data/supportdata.json';

const supportEmbed = {
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

export default class SupportHandler {
  private tickets: string[];
  private users: string[];
  private channels: string[];
  private ticketsMap: Map<string, SupportTicket>;
  private lastTicket: number;
  private client: Client;
  private cmdHandler: CommandHandler;
  private supportMessage: Message | undefined;
  private channel: TextChannel | null;
  private loggingChannel: TextChannel | null;
  private ticketCategory: CategoryChannel | undefined;
  constructor(
    client: Client,
    channel: TextChannel | null,
    loggingChannel: TextChannel | null,
    cmdHandler: CommandHandler
  ) {
    this.tickets = [];
    this.users = [];
    this.channels = [];
    this.ticketsMap = new Map<string, SupportTicket>();
    this.lastTicket = 0;
    this.client = client;
    this.channel = channel;
    this.loggingChannel = loggingChannel;
    this.cmdHandler = cmdHandler;
    this.setup();
  }

  private async setup() {
    this.client.on(
      'messageDelete',
      async (message: Message | PartialMessage) => {
        if (message.partial) {
          try {
            await message.fetch();
          } catch (error) {
            console.error(
              'Something went wrong when fetching the message: ',
              error
            );
            return;
          }
        }
        if (message.id === this.supportMessage?.id) {
          this.supportMessage = await this.channel?.send(supportEmbed);
          await this.supportMessage?.react('❓');
          await this.save();
        }
      }
    );
    this.client.on(
      'channelDelete',
      async (channel: Channel | PartialDMChannel) => {
        let chan: TextChannel = channel as TextChannel;
        let role = chan.guild.roles.cache.find(
          (role) => role.name === chan.name
        );
        if (role) await role.delete('Channel Deleted');
        this.tickets.map(async (ticket) => {
          if (this.ticketsMap.get(ticket)?.channel === chan.id) {
            const ticketIndex = this.tickets.indexOf(ticket);
            if (ticketIndex > -1) {
              this.tickets.splice(ticketIndex, 1);
            }
            const userIndex = this.users.indexOf(
              this.ticketsMap.get(ticket)?.user as string
            );
            if (userIndex > -1) {
              this.users.splice(userIndex, 1);
            }
            const channelIndex = this.channels.indexOf(
              this.ticketsMap.get(ticket)?.channel as string
            );
            if (channelIndex > -1) {
              this.channels.splice(channelIndex, 1);
            }
            await this.loggingChannel?.send(
              `SYSTEM - closed support-ticket-${
                this.ticketsMap.get(ticket)?.id
              }`
            );
            this.ticketsMap.delete(ticket);
          }
        });
        await this.save();
      }
    );
    this.client.on(
      'messageReactionAdd',
      async (reaction: MessageReaction, user: User | PartialUser) => {
        if (reaction.partial) {
          try {
            await reaction.fetch();
          } catch (error) {
            console.error(
              'Something went wrong when fetching the reaction: ',
              error
            );
            return;
          }
        }
        let u: User = user.partial ? await user.fetch() : user;
        this.handleReaction(u, reaction);
      }
    );
    let cat = this.channel?.guild.channels.cache.get(
      process.env.TICKET_CATEGORY as string
    );
    if (cat) this.ticketCategory = cat as CategoryChannel;
    await this.load();
    if (!this.supportMessage) {
      this.supportMessage = await this.channel?.send(supportEmbed);
      await this.supportMessage?.react('❓');
      await this.save();
    }
  }

  private async handleReaction(user: User, reaction: MessageReaction) {
    if (user === this.client.user) return;
    if (!reaction.message.guild) return;
    if (this.supportMessage != undefined) {
      if (reaction.message.id === this.supportMessage.id) {
        const tick = ++this.lastTicket;
        if (reaction.emoji.toString() === '❓') {
          try {
            reaction.users.remove(user);
            if (this.users.indexOf(user.id) === -1) {
              this.users.push(user.id);
              let supportChannel = await reaction.message.guild.channels.create(
                `support-ticket-${tick}`
              );

              if (this.ticketCategory != undefined)
                supportChannel.setParent(this.ticketCategory);
              if (this.channels.indexOf(supportChannel.id) === -1)
                this.channels.push(supportChannel.id);
              if (this.tickets.indexOf(`${tick}`) === -1)
                this.tickets.push(`${tick}`);

              let supportRole:
                | Role
                | undefined = reaction.message.guild.roles.cache.find(
                (role) => role.name === `support-ticket-${tick}`
              );

              if (!supportRole) {
                let roleData: RoleData = {
                  name: `support-ticket-${tick}`,
                  mentionable: true,
                };
                supportRole = await reaction.message.guild.roles.create({
                  data: roleData,
                  reason: 'Created by Hera for a support ticket',
                });
              }
              let target = await reaction.message.guild.members.fetch(user.id);
              if (target) await target.roles.add(supportRole as Role);
              let everyone = reaction.message.guild.roles.everyone;
              let hera = await reaction.message.guild.members.fetch(
                this.client.user as User
              );
              this.cmdHandler.getAdmins().forEach(async (admin) => {
                let target = await reaction.message.guild?.members.fetch(admin);
                if (target) await target.roles.add(supportRole as Role);
              });
              let super_admin = await reaction.message.guild?.members.fetch(
                process.env.SUPER_ADMIN as string
              );
              if (super_admin) await target.roles.add(supportRole as Role);
              await supportChannel.updateOverwrite(hera.roles.highest as Role, {
                READ_MESSAGE_HISTORY: true,
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                ADD_REACTIONS: true,
              });
              await supportChannel.updateOverwrite(supportRole as Role, {
                READ_MESSAGE_HISTORY: true,
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                ADD_REACTIONS: true,
              });
              await supportChannel.updateOverwrite(everyone as Role, {
                READ_MESSAGE_HISTORY: false,
                VIEW_CHANNEL: false,
                SEND_MESSAGES: false,
                ADD_REACTIONS: false,
              });
              let channelEmbed = {
                embed: {
                  color: 8359053,
                  author: {
                    name: process.env.BOT_NAME as string,
                    icon_url: process.env.ICON_URL as string,
                  },
                  title: `** **`,
                  url: '',
                  description: `**Welcome <@${user.id}>, my objective is to resolve any issues you have as quickly as possible.\nMake sure your ticket is as detailed as possible and a human helper will assist you.**`,
                  fields: [
                    {
                      name: `** **`,
                      value: `<@&${supportRole.id}>`,
                      inline: false,
                    },
                    {
                      name: `**Information to provide when creating a support ticket**`,
                      value: `- Include detailed description of your issue(s)\n- Any relevant transaction ID\n- Your relevant username or email address\n- Any other information that may be relevant\n`,
                      inline: false,
                    },
                    {
                      name: `**Communication is key**`,
                      value: `Failure to communicate within the ticket channel will result in your issue being automatically closed after 24 hours of non-communication.`,
                      inline: false,
                    },
                    {
                      name: `**Closing a ticket**`,
                      value: `To close the ticket react with ❌`,
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
              let introMessage = await supportChannel.send(channelEmbed);
              await introMessage.react('❌');
              this.ticketsMap.set(`${tick}`, {
                id: `${tick}`,
                user: user.id,
                channel: supportChannel.id,
                controlMessage: introMessage.id,
                lastUpdate: Math.round(new Date().getTime() / 1000),
              });
              await this.loggingChannel?.send(
                `<@${user.id}> (${user.username}#${user.discriminator}) ${user.id} - Opened support-ticket-${tick}`
              );
              await this.save();
            } else {
              //TODO: ping the user in the open support channel because they have a ticket open already
            }
          } catch (error) {
            console.error(
              'Something went wrong when fetching the message: ',
              error
            );
            return;
          }
        } else {
          reaction.users.remove(user);
        }
      } else {
        this.tickets.forEach(async (ticket) => {
          if (
            reaction.message.id === this.ticketsMap.get(ticket)?.controlMessage
          ) {
            if (reaction.emoji.toString() === '❌') {
              await reaction.message.channel.delete('A user closed ticket');
              await this.loggingChannel?.send(
                `<@${user.id}> (${user.username}#${user.discriminator}) ${
                  user.id
                } - closed support-ticket-${this.ticketsMap.get(ticket)?.id}`
              );
            } else {
              reaction.users.remove(user);
            }
          }
        });
      }
    }
  }

  private async load() {
    if (fs.existsSync(supportDataFile)) {
      let data = JSON.parse(fs.readFileSync(supportDataFile).toString('utf8'));
      let lastTicketNum = 0;
      if (data.openTickets) {
        Object.keys(data.openTickets).forEach(async (ticketId) => {
          const ticket: SupportTicket = data.openTickets[ticketId];
          if (this.channels.indexOf(ticket.channel) === -1) {
            let chan:
              | GuildChannel
              | undefined = this.channel?.guild.channels.cache.find(
              (target) => target.id === ticket.id
            );
            if (chan) {
              this.channels.push(ticket.channel);
              this.ticketsMap.set(ticket.id, ticket);
              if (this.tickets.indexOf(ticket.id) === -1) {
                this.tickets.push(ticket.id);
              }
              if (this.users.indexOf(ticket.user) === -1) {
                this.users.push(ticket.user);
              }
              if (this.channels.indexOf(ticket.channel) === -1) {
                this.channels.push(ticket.channel);
              }
              if (parseInt(ticket.id) > lastTicketNum) {
                this.lastTicket = parseInt(ticket.id);
                lastTicketNum = parseInt(ticket.id);
              }
              let role = chan.guild.roles.cache.find(
                (role) => role.name === `support-ticket-${ticket.id}`
              );
              if (role) await role.delete('Channel Deleted');
            } else {
              let role = this.channel?.guild.roles.cache.find(
                (role) => role.name === `support-ticket-${ticket.id}`
              );
              if (role) await role.delete('Channel Deleted');
            }
          }
        });
      }

      if (data.supportMessage) {
        this.supportMessage = await this.channel?.messages.fetch(
          data.supportMessage
        );
        if (this.supportMessage) {
          let reacts:
            | MessageReaction
            | undefined = this.supportMessage.reactions.cache.find(
            (reaction) => reaction.emoji.toString() === '❓'
          );
          if (reacts) {
            let users = await reacts.users.fetch();
            let it = users.keys();
            let result = it.next();
            while (!result.done) {
              if (result.value != this.client.user?.id) {
                let user: User | undefined = users.get(result.value);
                if (user) {
                  let u: User = user.partial ? await user.fetch() : user;
                  await this.handleReaction(u, reacts);
                }
              }
              result = it.next();
            }
          }
        }
      }
    }
  }

  public async save() {
    let openTickets: any = {};
    this.tickets.map((ticket) => {
      openTickets[ticket] = this.ticketsMap.get(ticket);
    });
    fs.writeFile(
      supportDataFile,
      JSON.stringify(
        {
          supportMessage: this.supportMessage?.id,
          openTickets,
        },
        null,
        2
      ),
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  }
}
