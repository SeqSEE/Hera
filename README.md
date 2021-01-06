# Hera

![Hera](https://raw.githubusercontent.com/SeqSEE/Hera/master/defaultIcon.png)  
Hera is the goddess of mothers, marriage and family – she is here to offer support.

### Prerequisites

- [NodeJS 14+](https://nodejs.org/en/download/)
- [TypeScript](https://www.typescriptlang.org/#installation)
- [Discord API Key](https://discord.com/developers/applications)
- [Discord Guild](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server-)
- [Channel Category](https://support.discord.com/hc/en-us/articles/115001580171-Channel-Categories-101)

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

- edit the ``.env`` configuration file with your configuration details for you `API_KEY`, `GUILD_ID`, `SUPPORT_CATEGORY`, and `SUPER_ADMIN`

```
DEBUG=1
BOT_NAME=Hera
CMD_PREFIX=^
API_KEY=somekey
ICON_URL=https://raw.githubusercontent.com/SeqSEE/Hera/master/defaultIcon.png
GUILD_ID=123456789
SUPPORT_CATEGORY=123456789
SUPER_ADMIN=412122437954830337
```

### Commands

```md
^stop - stops the bot

- usage: stop
  ^help - displays this text, or help for a specific command if an argument is provided
- usage: help (command)
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
```
