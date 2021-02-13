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
  Guild,
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
    description: `**My objective is to resolve any issues you have as quickly as possible.\nMake sure your ticket is as detailed as possible and a human helper will assist you.**`,
    fields: [
      {
        name: `**Information when creating a support ticket**`,
        value: `- Include detailed description of your issue(s)\n- Any relevant transaction ID\n- Your relevant username or email address\n- Any other information that may be relevant\n`,
        inline: false,
      },
      {
        name: `**Communication is key**`,
        value: `Failure to communicate within the ticket channel will result in your issue being closed after 24 hours of non-communication.`,
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
  private client: Client;
  private cmdHandler: CommandHandler;
  private tickets: string[];
  private users: string[];
  private channels: string[];
  private ticketsMap: Map<string, SupportTicket>;
  private supportCategory: CategoryChannel | undefined;
  private supportChannel: TextChannel | undefined;
  private loggingChannel: TextChannel | undefined;
  private supportMessage: Message | undefined;
  private lastTicket: number;
  constructor(client: Client, cmdHandler: CommandHandler) {
    this.client = client;
    this.cmdHandler = cmdHandler;
    this.tickets = [];
    this.users = [];
    this.channels = [];
    this.ticketsMap = new Map<string, SupportTicket>();
    this.lastTicket = 0;
    this.setup();
  }

  public getTicketByChannel(id: string): SupportTicket | undefined {
    if (this.channels.indexOf(id) === -1) return undefined;
    for (let t of this.tickets) {
      const ticket = this.ticketsMap.get(t);
      if (ticket) {
        if (ticket.channel === id) {
          return ticket;
        }
      }
    }
    return undefined;
  }

  public async updateTopic(
    topic: string,
    ticket: SupportTicket
  ): Promise<boolean> {
    const chan = this.supportChannel?.guild.channels.cache.get(ticket.channel);
    if (chan) {
      await chan.setName(topic);
      return true;
    }
    return false;
  }

  public async updateOwner(
    user: User,
    ticket: SupportTicket
  ): Promise<boolean> {
    try {
      const member = await this.supportChannel?.guild.members.fetch(user);
      const oldMember = await this.supportChannel?.guild.members.fetch(
        ticket.user
      );
      const userIndex = this.users.indexOf(user.id);
      if (userIndex === -1) {
        const ticketUser = this.users.indexOf(ticket.user);
        this.users.splice(ticketUser, 1);
        ticket.user = user.id;
        this.ticketsMap.set(ticket.id, ticket);
        const supportRole:
          | Role
          | undefined = this.supportChannel?.guild.roles.cache.find(
          (role) => role.name === `support-ticket-${ticket.id}`
        );

        if (supportRole != undefined) {
          if (oldMember != undefined)
            await oldMember.roles.remove(
              supportRole,
              'Remvoved user as the owner of a ticket'
            );

          if (member != undefined)
            await member.roles.add(
              supportRole,
              'Assigned user the owner of a support ticket'
            );
        }
        await this.save();
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.log(e);
      return false;
    }
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
          this.supportMessage = await this.supportChannel?.send(supportEmbed);
          await this.supportMessage?.react('❓');
          await this.save();
        }
      }
    );
    this.client.on(
      'channelDelete',
      async (channel: Channel | PartialDMChannel) => {
        await this.closeSupportTicket(
          channel,
          `SYSTEM - closed support-ticket-%id%`
        );
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
        await this.handleReaction(u, reaction);
      }
    );
    const guild: Guild | undefined = this.client.guilds.cache.get(
      process.env.GUILD_ID as string
    );
    await this.load(guild);
    if (!this.supportMessage) {
      this.supportMessage = await this.supportChannel?.send(supportEmbed);
      await this.supportMessage?.react('❓');
      await this.save();
    }
    await this.startGC();
  }

  private async handleReaction(user: User, reaction: MessageReaction) {
    if (user === this.client.user) return;
    if (!reaction.message.guild) return;
    if (this.supportMessage != undefined) {
      if (reaction.message.id === this.supportMessage.id) {
        if (reaction.emoji.toString() === '❓') {
          try {
            reaction.users.remove(user);
            if (this.users.indexOf(user.id) === -1) {
              await this.createSupportTicket(reaction.message.guild, user);
            } else {
              const ticket: SupportTicket | undefined = this.getTicketByUserId(
                user.id
              );
              if (ticket) {
                const chan = reaction.message.guild.channels.cache.get(
                  ticket.channel
                );
                if (chan instanceof TextChannel) {
                  (chan as TextChannel).send(
                    `<@${user.id}> you already have a ticket open here.`
                  );
                }
              }
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
        const ticket: SupportTicket | undefined = this.getTicketByMessageId(
          reaction.message.id
        );
        if (ticket) {
          if (reaction.emoji.toString() === '❌') {
            await reaction.message.channel.delete('A user closed ticket');
            await this.loggingChannel?.send(
              `<@${user.id}> (${user.username}#${user.discriminator}) ${user.id} - closed support-ticket-${ticket.id}`
            );
          } else if (reaction.emoji.toString() === '📁') {
            if (
              this.cmdHandler.isAdmin(user.id) ||
              user.id === (process.env.SUPER_ADMIN as string)
            ) {
              await this.archiveSupportTicket(
                ticket.id,
                reaction.message.guild
              );
            } else {
              reaction.users.remove(user);
            }
          } else {
            reaction.users.remove(user);
          }
        }
      }
    }
  }

  private getTicketById(id: string): SupportTicket | undefined {
    let ticket: SupportTicket | undefined = undefined;
    for (let t of this.tickets) {
      const tick: SupportTicket | undefined = this.ticketsMap.get(t);
      if (tick && tick.id === id) {
        ticket = tick;
      }
    }
    return ticket;
  }

  public getTicketByUserId(id: string): SupportTicket | undefined {
    let ticket: SupportTicket | undefined = undefined;
    for (let t of this.tickets) {
      const tick: SupportTicket | undefined = this.ticketsMap.get(t);
      if (tick && tick.user === id) {
        ticket = tick;
      }
    }
    return ticket;
  }

  private getTicketByChannelId(id: string): SupportTicket | undefined {
    let ticket: SupportTicket | undefined = undefined;
    for (let t of this.tickets) {
      const tick: SupportTicket | undefined = this.ticketsMap.get(t);
      if (tick && tick.channel === id) {
        ticket = tick;
      }
    }
    return ticket;
  }

  private getTicketByMessageId(id: string): SupportTicket | undefined {
    let ticket: SupportTicket | undefined = undefined;
    for (let t of this.tickets) {
      const tick: SupportTicket | undefined = this.ticketsMap.get(t);
      if (tick && tick.controlMessage === id) {
        ticket = tick;
      }
    }
    return ticket;
  }

  public async resolveSupportTicket(ticket: SupportTicket) {
    const guild = this.client.guilds.cache.get(process.env.GUILD_ID as string);
    if (guild) {
      const chan = guild.channels.cache.get(ticket.channel);
      if (chan instanceof TextChannel) {
        let resolveEmbed = {
          embed: {
            color: 8359053,
            author: {
              name: process.env.BOT_NAME as string,
              icon_url: process.env.ICON_URL as string,
            },
            title: `**Issue has been marked as resolved**`,
            url: '',
            description: `**Your issue has been marked as resolved.\nTo close this ticket react with ❌**`,
            fields: [],
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

        const resolveMessage = await (chan as TextChannel).send(resolveEmbed);
        await resolveMessage.react('❌');
        this.ticketsMap.set(ticket.id, {
          id: ticket.id,
          user: ticket.user,
          channel: ticket.channel,
          controlMessage: resolveMessage.id,
          lastUpdate: Math.round(new Date().getTime() / 1000),
        });
        await this.save();
      }
    }
  }

  private async closeSupportTicket(
    channel: Channel | PartialDMChannel,
    message: string
  ) {
    let chan: TextChannel = channel as TextChannel;
    let role = chan.guild.roles.cache.find((role) => role.name === chan.name);
    if (role) await role.delete('Support ticket closed');
    const ticket: SupportTicket | undefined = this.getTicketByChannelId(
      chan.id
    );
    if (ticket) {
      const ticketIndex = this.tickets.indexOf(ticket.id);
      if (ticketIndex > -1) {
        this.tickets.splice(ticketIndex, 1);
      }
      const userIndex = this.users.indexOf(ticket.user as string);
      if (userIndex > -1) {
        this.users.splice(userIndex, 1);
      }
      const channelIndex = this.channels.indexOf(ticket.channel as string);
      if (channelIndex > -1) {
        this.channels.splice(channelIndex, 1);
      }
      await this.loggingChannel?.send(message.replace('%id%', `${ticket.id}`));
      this.ticketsMap.delete(ticket.id);
      await this.save();
    }
  }

  public async createSupportTicket(guild: Guild, user: User) {
    const tick = ++this.lastTicket;
    this.users.push(user.id);
    let supportChannel = await guild.channels.create(`support-ticket-${tick}`);

    if (this.supportCategory != undefined)
      supportChannel.setParent(this.supportCategory as CategoryChannel);
    if (this.channels.indexOf(supportChannel.id) === -1)
      this.channels.push(supportChannel.id);
    if (this.tickets.indexOf(`${tick}`) === -1) this.tickets.push(`${tick}`);

    let supportRole: Role | undefined = guild.roles.cache.find(
      (role) => role.name === `support-ticket-${tick}`
    );

    if (!supportRole) {
      let roleData: RoleData = {
        name: `support-ticket-${tick}`,
        mentionable: false,
      };
      supportRole = await guild.roles.create({
        data: roleData,
        reason: 'Created by Hera for a support ticket',
      });
    }
    let helperRole = await this.getOrCreateHelperRole(guild);
    let target = await guild.members.fetch(user.id);
    if (target) await target.roles.add(supportRole as Role);
    let everyone = guild.roles.everyone;
    let hera = await guild.members.fetch(this.client.user as User);
    this.cmdHandler.getAdmins().forEach(async (admin) => {
      let target = await guild.members.fetch(admin);
      if (target) await target.roles.add(helperRole as Role);
    });
    let super_admin = await guild.members.fetch(
      process.env.SUPER_ADMIN as string
    );
    if (super_admin) await super_admin.roles.add(helperRole as Role);
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
    await supportChannel.updateOverwrite(helperRole as Role, {
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
        description: `**Welcome <@${user.id}>, my objective is to resolve any issues you have as quickly as possible.\nMake sure your ticket is as detailed as possible and a human helper will assist you shortly.**`,
        fields: [
          {
            name: `** **`,
            value: `<@&${helperRole?.id}>`,
            inline: false,
          },
          {
            name: `**Information to provide when creating a support ticket**`,
            value: `- Include detailed description of your issue(s)\n- Any relevant transaction ID\n- Your relevant username or email address\n- Any other information that may be relevant\n`,
            inline: false,
          },
          {
            name: `**Communication is key**`,
            value: `Failure to communicate within the ticket channel will result in your issue being closed after 24 hours of non-communication.`,
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
    await introMessage.react('📁');
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
  }

  public async getOrCreateHelperRole(guild: Guild): Promise<Role | undefined> {
    let helperRole: Role | undefined = guild.roles.cache.find(
      (role) => role.name === `heras-helper`
    );

    if (!helperRole) {
      let roleData: RoleData = {
        name: `heras-helper`,
        mentionable: true,
      };
      helperRole = await guild.roles.create({
        data: roleData,
        reason: 'Created by Hera for her helpers',
      });
    }
    return helperRole;
  }

  public async getOrCreateLogsRole(guild: Guild): Promise<Role | undefined> {
    let logsRole: Role | undefined = guild.roles.cache.find(
      (role) => role.name === `support-ticket-logs`
    );

    if (!logsRole) {
      let roleData: RoleData = {
        name: `support-ticket-logs`,
        mentionable: false,
      };
      logsRole = await guild.roles.create({
        data: roleData,
        reason: 'Created by Hera for a support ticket',
      });
    }
    return logsRole;
  }

  public async archiveSupportTicket(id: string, guild: Guild) {
    const ticket: SupportTicket | undefined = this.getTicketById(id);
    if (ticket) {
      const chan = guild.channels.cache.get(ticket.channel);
      if (chan) {
        await this.closeSupportTicket(chan, `Archived %id%`);
        await chan.setName(`archive-${chan.name}`);
      }
    }
  }

  private async createLoggingChannel(guild: Guild) {
    this.loggingChannel = await guild.channels.create('ticket-logs');
    this.loggingChannel.setParent(this.supportCategory as CategoryChannel);
    let logsRole: Role | undefined = await this.getOrCreateLogsRole(guild);

    let everyone = guild.roles.everyone;
    let hera = await guild.members.fetch(this.client.user as User);
    this.cmdHandler.getAdmins().forEach(async (admin) => {
      let target = await guild.members.fetch(admin);
      if (target) await target.roles.add(logsRole as Role);
    });
    let super_admin = await guild?.members.fetch(
      process.env.SUPER_ADMIN as string
    );
    if (super_admin) await super_admin.roles.add(logsRole as Role);
    await this.loggingChannel.updateOverwrite(hera.roles.highest as Role, {
      READ_MESSAGE_HISTORY: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      ADD_REACTIONS: true,
    });
    await this.loggingChannel.updateOverwrite(logsRole as Role, {
      READ_MESSAGE_HISTORY: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      ADD_REACTIONS: true,
    });
    await this.loggingChannel.updateOverwrite(everyone as Role, {
      READ_MESSAGE_HISTORY: false,
      VIEW_CHANNEL: false,
      SEND_MESSAGES: false,
      ADD_REACTIONS: false,
    });
  }

  private async createSupportChannel(guild: Guild) {
    this.supportChannel = await guild.channels.create('support');
    this.supportChannel.setParent(this.supportCategory as CategoryChannel);

    let helperRole: Role | undefined = await this.getOrCreateHelperRole(guild);
    let everyone = guild.roles.everyone;
    let hera = await guild.members.fetch(this.client.user as User);
    this.cmdHandler.getAdmins().forEach(async (admin) => {
      let target = await guild.members.fetch(admin);
      if (target) await target.roles.add(helperRole as Role);
    });
    let super_admin = await guild?.members.fetch(
      process.env.SUPER_ADMIN as string
    );
    if (super_admin) await super_admin.roles.add(helperRole as Role);
    await this.supportChannel.updateOverwrite(hera.roles.highest as Role, {
      READ_MESSAGE_HISTORY: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      ADD_REACTIONS: true,
    });
    await this.supportChannel.updateOverwrite(helperRole as Role, {
      READ_MESSAGE_HISTORY: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      ADD_REACTIONS: true,
    });
    await this.supportChannel.updateOverwrite(everyone as Role, {
      READ_MESSAGE_HISTORY: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: false,
      ADD_REACTIONS: true,
    });
  }

  public async handleMessage(messageObj: { channel: string; author: string }) {
    if (messageObj.author === this.client.user?.id) return;
    for (let id of this.tickets) {
      const ticket: SupportTicket | undefined = this.ticketsMap.get(id);
      if (ticket?.channel === messageObj.channel) {
        ticket.lastUpdate = Math.round(new Date().getTime() / 1000);
        this.ticketsMap.set(id, ticket);
        await this.save();
      }
    }
  }

  private async startGC() {
    let collector = async () => {
      if (Number(process.env.AUTO_CLOSE_TICKET as string) === 1) {
        for (let id of this.tickets) {
          const ticket: SupportTicket | undefined = this.getTicketById(id);
          if (
            ticket &&
            Math.round(new Date().getTime() / 1000) - ticket.lastUpdate > 86400
          ) {
            const chan:
              | GuildChannel
              | undefined = this.supportChannel?.guild.channels.cache.get(
              ticket.channel
            );
            if (chan) await chan.delete('Ticket closed due to inactivity');
          }
        }
      }
    };
    await collector();
    setInterval(async () => await collector(), 900000);
  }

  private async load(guild: Guild | undefined) {
    if (guild) {
      let cat = guild.channels.cache.get(
        process.env.SUPPORT_CATEGORY as string
      );
      this.supportCategory =
        cat instanceof CategoryChannel ? (cat as CategoryChannel) : undefined;
      if (!this.supportCategory) {
        console.log(`ERROR: Could not find the support category.`);
        process.exit(1);
      }
      if (fs.existsSync(supportDataFile)) {
        let data = JSON.parse(
          fs.readFileSync(supportDataFile).toString('utf8')
        );

        if (data.supportChannel) {
          let chan = guild.channels.cache.get(data.supportChannel);
          this.supportChannel =
            chan instanceof TextChannel ? (chan as TextChannel) : undefined;
          if (!this.supportChannel) {
            await this.createSupportChannel(guild);
          }
        }
        if (data.supportMessage) {
          this.supportMessage = await this.supportChannel?.messages.fetch(
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
        } else {
          await this.createSupportChannel(guild as Guild);
        }
        if (data.loggingChannel) {
          this.loggingChannel =
            guild.channels.cache.get(data.loggingChannel) === undefined
              ? undefined
              : (guild.channels.cache.get(data.loggingChannel) as TextChannel);
          if (!this.loggingChannel) {
            await this.createLoggingChannel(guild as Guild);
          }
        } else {
          await this.createLoggingChannel(guild as Guild);
        }
        let lastTicketNum = 0;
        if (data.openTickets) {
          for (let ticketId of Object.keys(data.openTickets)) {
            const ticket: SupportTicket = data.openTickets[ticketId];
            const existing: SupportTicket | undefined = this.getTicketById(
              ticketId
            );
            if (!existing) {
              if (this.channels.indexOf(ticket.channel) === -1) {
                let chan: GuildChannel | undefined = guild.channels.cache.find(
                  (target) => target.id === ticket.channel
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
                } else {
                  let role = guild.roles.cache.find(
                    (role) => role.name === `support-ticket-${ticket.id}`
                  );
                  if (role) await role.delete('Channel Deleted');
                }
              }
            }
          }
        }
      }
    } else {
      console.log(`ERROR: Could not find the guild.`);
      process.exit(1);
    }
  }

  public async save() {
    let openTickets: any = {};
    for (let ticket of this.tickets) {
      openTickets[ticket] = this.ticketsMap.get(ticket);
    }
    fs.writeFile(
      supportDataFile,
      JSON.stringify(
        {
          loggingChannel: this.loggingChannel?.id,
          supportChannel: this.supportChannel?.id,
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
