# Detailed Usage Guide for `slchat.js`

Welcome to the detailed usage guide for `slchat.js` – the powerful Node.js wrapper for the SLChat API. This document provides a comprehensive guide on how to set up, configure, and use the bot framework, including command registration, message handling, and CLI interaction.

## Table of Contents

- [Installation](#installation)
- [Setting Up the Bot](#setting-up-the-bot)
  - [Create a Bot Instance](#create-a-bot-instance)
  - [Registering Commands](#registering-commands)
  - [Handling Messages](#handling-messages)
- [CLI Commands](#cli-commands)
  - [Available CLI Commands](#available-cli-commands)
  - [Example CLI Usage](#example-cli-usage)
- [API Methods](#api-methods)
  - [run](#run)
  - [command](#command)
  - [send](#send)
  - [join](#join)
  - [change](#change)
  - [isBot](#isBot)
- [Bot Shutdown](#bot-shutdown)
- [Example Projects](#example-projects)
- [Contributing](#contributing)

---

## Installation

To install `slchat.js` in your Node.js project, use npm:

```bash
npm install slchat.js
```

Once installed, you can import it into your JavaScript files and start building your bot.

---

## Setting Up the Bot

### Create a Bot Instance

To begin using `slchat.js`, first instantiate the `Bot` class. You will need your bot's token and bot ID to get started.

```javascript
const { Bot } = require('slchat.js');

// Create a new bot instance
const bot = new Bot();

// Replace with your bot's token and bot ID
const token = 'YOUR_BOT_TOKEN';
const botId = 'YOUR_BOT_ID';

// Run the bot
bot.run(token, botId).then(() => {
  console.log('Bot is now running!');
}).catch(err => {
  console.error('Error starting bot:', err);
});
```

### Registering Commands

`slchat.js` allows you to register custom commands that your bot can respond to. Commands can be invoked by the bot users via chat, and the bot will process them accordingly.

#### Example: Register a Simple Command

Here’s how to register a simple command:

```javascript
bot.command('hello', (ctx, args) => {
  ctx.reply('Hello, world!');
});
```

In this example, whenever a user sends a message that starts with `!hello`, the bot will reply with "Hello, world!".

#### Example: Command with Arguments

You can also pass arguments to your commands. Here's an example of a command that greets a user by name:

```javascript
bot.command('greet', (ctx, args) => {
  const name = args.length > 0 ? args[0] : 'stranger';
  ctx.reply(`Hello, ${name}!`);
});
```

When a user sends `!greet John`, the bot will reply with `Hello, John!`.

---

## Handling Messages

The bot listens for incoming messages that start with the configured prefix (default `!`). When a message is received, it checks if the message matches a registered command. If so, it executes the corresponding command function.

Here’s a detailed breakdown of the message handling process:

```javascript
async handleMessage(msg, serverId) {
  const realMsg = msg.message || msg;  // Unwrap message if needed
  if (!realMsg?.owner?.id || !realMsg?.text || realMsg.owner.label?.name === "BOT") return;

  const ctx = new Context(realMsg, serverId, this);
  this.emit("message", ctx);

  if (!realMsg.text.startsWith(this.prefix)) return;

  const [cmd, ...rest] = realMsg.text.slice(this.prefix.length).trim().split(/\s+/);
  const args = rest.join(" ");
  try {
    await this.commands.execute(cmd, ctx, args);
  } catch (err) {
    this.emit("error", err);
    ctx.reply(`Error: ${err.message}`);
  }
}
```

This method processes incoming messages by:
- Checking if the message has a valid structure (`text` and `owner`).
- Ignoring messages from other bots.
- If the message starts with the configured prefix (e.g., `!`), it extracts the command name and arguments.
- It then attempts to execute the corresponding registered command.

---

## CLI Commands

`slchat.js` comes with several built-in CLI commands for managing your bot. The CLI is interactive, allowing you to control the bot directly from the terminal.

### Available CLI Commands

1. **`addserver <server_id>`**  
   Adds a server to the bot.

2. **`set <key> <value>`**  
   Changes bot settings or parameters.

3. **`servers`**  
   Lists all connected servers.

4. **`poweroff`**  
   Shuts down the bot gracefully.

5. **`disconnect`**  
   Disconnects from all active servers.

6. **`status`**  
   Displays the bot's connection status.

7. **`help`**  
   Shows available CLI commands.

### Example CLI Usage

1. **Adding a server:**

```bash
> addserver 12345
```

This command will add the server with ID `12345` to your bot.

2. **Listing connected servers:**

```bash
> servers
Connected servers: [12345, 67890]
```

3. **Changing a bot setting:**

```bash
> set nickname BotBOTBOT
```

This command will set the nickname to `BotBOTBOT`.

4. **Shutting down the bot:**

```bash
> poweroff
Shutting down the bot...
```

This will gracefully stop the bot.

5. **Checking the bot's status:**

```bash
> status
Bot status:
- Token: YOUR_BOT_TOKEN
- Bot ID: YOUR_BOT_ID
- Connected servers: 2
```

---

## API Methods

### `run(token, botId)`

- **Arguments**:
  - `token`: The bot's authentication token.
  - `botId`: The bot's unique ID.
- **Description**: Initializes the bot and connects it to the SLChat servers.

### `command(name, fn)`

- **Arguments**:
  - `name`: The name of the command.
  - `fn`: The function to execute when the command is triggered.
- **Description**: Registers a custom command.

### `send(text, serverId)`

- **Arguments**:
  - `text`: The message to send.
  - `serverId`: The server ID to send the message to.
- **Description**: Sends a message to the specified server.

### `join(serverId)`

- **Arguments**:
  - `serverId`: The server ID to join.
- **Description**: Adds the bot to a specified server.

### `change(key, value)`

- **Arguments**:
  - `key`: The configuration key to change.
  - `value`: The new value for the key.
- **Description**: Changes a bot setting.

### `isBot(id)`

- **Arguments**:
  - `id`: The user ID to check.
- **Description**: Checks if the user is a bot.

---

## Bot Shutdown

To gracefully shut down the bot, use the `poweroff` CLI command. This will ensure that all active connections are closed before the bot stops:

```bash
> poweroff
Shutting down the bot...
```

Alternatively, you can call `process.exit(0)` programmatically to stop the bot, but it’s better to handle it gracefully via the CLI.

## Contributing

We welcome contributions to `slchat.js`! If you want to add features or fix bugs, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or fix.
3. Make your changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request for review.

---

## License

`slchat.js` is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Feel free to open issues if you encounter any bugs or have questions about using `slchat.js`. Enjoy building your bots!

