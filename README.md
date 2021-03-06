![GitHub release (latest by date)](https://img.shields.io/github/v/release/SeqSEE/Hera) [![GitHub license](https://img.shields.io/github/license/SeqSEE/Hera)](https://github.com/SeqSEE/Hera/blob/master/LICENSE.md) ![Node.js CI](https://github.com/SeqSEE/Hera/workflows/Node.js%20CI/badge.svg) ![CodeQL](https://github.com/SeqSEE/Hera/workflows/CodeQL/badge.svg) [![GitHub issues](https://img.shields.io/github/issues/SeqSEE/Hera)](https://github.com/SeqSEE/Hera/issues)

# Hera

![Hera](defaultIcon.png)  
Hera is the goddess of mothers, marriage and family – she is here to offer support.

### Prerequisites

- [NodeJS 14+](https://nodejs.org/en/download/)
- [TypeScript](https://www.typescriptlang.org/#installation)
- [Discord API Key](https://discord.com/developers/applications)
- [Discord Guild](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server-)

---

### Setup

- note your api key for the bot and invite the bot to your guild
- note the [guild and support category IDs](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)

- clone this repo

```
git clone https://github.com/SeqSEE/Hera
```

- install the dependencies

```
cd Hera
```

```
npm install
```

- build the project

```
npm run build
```

- start the bot

```
npm run start
```

- edit the `.env` configuration file with your configuration details for you `API_KEY`, `GUILD_ID`, `SUPPORT_CATEGORY`, and `SUPER_ADMIN`

```
DEBUG=1
AUTO_CLOSE_TICKET=1
ARCHIVE_ALL_TICKETS=0
BOT_NAME=Hera
CMD_PREFIX=^
API_KEY=somekey
ICON_URL=https://raw.githubusercontent.com/SeqSEE/Hera/master/defaultIcon.png
GUILD_ID=123456789
SUPER_ADMIN=412122437954830337
STALL_LIMIT=604800
```

---

### Commands

```md
^help - displays this text, or help for a specific command if an argument is provided

- usage: help (command)
  ^stop - stops the bot
- usage: stop
  ^enablecommand - enables a registered command
- usage: enablecommand <command>
  ^disablecommand - disables a registered command
- usage: disablecommand <commmand>
  ^admins - lists the admins
- usage: admins
  ^addadmin - adds an admin
- usage: addadmin <user>
  ^removeadmin - removes an admin
- usage: removeadmin <user>
  ^setowner - sets a user as the owner of a ticket
- usage: ^setowner <user>
  ^settopic - sets the name of a ticket channel
- usage: ^settopic <topic>
  ^support - open a support ticket when you are on another channel
- usage: support
  ^resolve - show a message that allows to close an already resolved ticket
- usage: resolve
   ^archive - archive an ticket
- usage: archive
```
