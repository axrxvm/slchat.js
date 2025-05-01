# slchat.js - Powerful Flexible Node.js Wrapper for the SLChat API

`slchat.js` is a powerful and flexible Node.js wrapper for the SLChat API, designed to help you create and manage bots for SLChat with ease. With support for real-time communication, command registration, and the ability to manage server interactions, `slchat.js` makes it easy to integrate and automate your SLChat experience.

## Features

- **Bot Authentication**: Easy token-based authentication and bot setup.
- **Real-time Communication**: Handles WebSocket connections to SLChat servers.
- **Command Handling**: Register and execute bot commands.
- **API Integration**: Fetch user data, join servers, and change bot settings.
- **Cache Management**: Efficient caching of API responses.
- **CLI Support**: Built-in command-line interface for managing the bot (e.g., add/remove servers, status, shutdown).
- **Graceful Shutdown**: Command to gracefully stop the bot.

## Installation

You can install `slchat.js` via npm:

```bash
npm install slchat.js
```

## Usage

### Create a Bot Instance

To create a new bot instance and interact with the SLChat API, you first need to instantiate the `Bot` class and run it with your token and bot ID.

```javascript
const { Bot } = require('slchat.js');

const bot = new Bot(); // Create a new bot instance
const token = 'YOUR_BOT_TOKEN'; // Replace with your bot's token
const botId = 'YOUR_BOT_ID'; // Replace with your bot's ID

bot.run(token, botId).then(() => {
  console.log('Bot is now running!');
});
```

### Registering Commands

You can register custom commands that your bot can respond to. Here's an example of how to register a command:

```javascript
bot.command('hello', (ctx, args) => {
  ctx.reply('Hello, world!');
});
```

### Handling Messages

The bot will listen for messages that start with the configured prefix (default is `!`), and if the message matches a registered command, it will execute the corresponding function.

### CLI Commands

The bot includes the following commands available in the command line interface:

- `addserver <server_id>`: Adds a server to the bot.
- `set <key> <value>`: Changes bot settings.
- `servers`: Lists all connected servers.
- `poweroff`: Shuts down the bot gracefully.
- `disconnect`: Disconnects from all active servers.
- `status`: Displays the bot's connection status.
- `help`: Shows available CLI commands.

### Example CLI Interaction

```bash
$ node bot.js
> addserver 12345
> servers
Connected servers: [12345]
> poweroff
Shutting down the bot...
```

### Bot Shutdown

You can gracefully stop the bot using the `poweroff` command in the CLI. This command ensures that all connections are closed properly before shutting down the process.

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
- **Description**: Registers a custom command that the bot will respond to.

### `send(text, serverId)`

- **Arguments**:
  - `text`: The message text to send.
  - `serverId`: The server to send the message to.
- **Description**: Sends a message to the specified server.

### `join(serverId)`

- **Arguments**:
  - `serverId`: The server ID to join.
- **Description**: Adds the bot to a specified server.

### `change(key, value)`

- **Arguments**:
  - `key`: The configuration key to change.
  - `value`: The new value for the key.
- **Description**: Changes a setting on the bot (e.g., server settings).

### `isBot(id)`

- **Arguments**:
  - `id`: The user ID to check.
- **Description**: Checks if the user is a bot.

## Contributing

We welcome contributions to improve `slchat.js`. If you have an idea for a new feature or a bug fix, feel free to submit a pull request.

### Steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request.

## License

Copyright (c) 2025 - Aarav Mehta
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Feel free to open issues or contact us if you have any questions!
