# slchat.js - Lightweight Fast Node.js Wrapper for slchat API

**Created by**: Aarav Mehta
**Published on NPM**: [slchat.js](https://www.npmjs.com/package/slchat.js)
**GitHub Repository**: [axrxvm/slchat.js](https://github.com/axrxvm/slchat.js)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Installation](#installation)
4. [Bot Setup](#bot-setup)
5. [Command Registration](#command-registration)
6. [Sending Messages](#sending-messages)
7. [Message Formatting](#message-formatting)
8. [Embed Building](#embed)
8. [Command-Line Interface (CLI)](#command-line-interface-cli)
9. [Error Handling and Logging](#error-handling-and-logging)
10. [Cache Management](#cache-management)
11. [Contributing](#contributing)
12. [License](#license)

---

## Introduction

**slchat.js** is a lightweight and fast Node.js wrapper for interacting with the **slchat API**. This package simplifies the process of creating bots for the **slchat** messaging platform by providing an easy-to-use interface to interact with servers, send and format messages, and manage bot commands.

With **slchat.js**, developers can quickly set up and deploy bots with the following key features:

* Easy-to-use API for interacting with the slchat platform.
* Flexible command registration system to handle custom commands.
* Rich message formatting options (embeds, codeblocks, images, etc.).
* A command-line interface for managing bot configurations.
* Simple error handling and logging.

---

## Features

* **Fast and Lightweight**: Optimized for performance and low memory usage.
* **Message Formatting**: Support for rich text, embeds, and multimedia attachments.
* **Bot Management**: Configure the bot's behavior with ease using the Bot class.
* **Command Handling**: Register custom commands and handle user input dynamically.
* **Error Handling**: Built-in error management and logging to make debugging easier.
* **CLI Interface**: Simple CLI to manage bot configurations and send messages.
* **Cache Management**: Reduce redundant API calls by caching data like users and servers.

---

## Installation

To install **slchat.js**, you need to use **npm** or **yarn**. Run the following command to install it as a dependency in your project:

### Using npm:

```bash
npm install slchat.js
```

### Using yarn:

```bash
yarn add slchat.js
```

After installation, you can require it in your Node.js application:

```javascript
const { Bot, command, log, errorLog, successLog } = require('slchat.js');
```

---

## Bot Setup

To set up your bot, you need to create a new `Bot` instance. The `Bot` class allows you to define various configurations for your bot, such as command prefix, message handling, and error handling.

### Basic Example

```javascript
const bot = new Bot({
  prefix: "!",  // Define the prefix for commands (default is '!')
  onStart: () => successLog("Bot has successfully started!"),
  onError: (error) => errorLog("Error:", error),
  onMessage: (ctx) => {
    log(`Received message: ${ctx.content}`);
  },
  autoReconnect: true // Auto reconnect when disconnected
});

// Start the bot
bot.run('YOUR_BOT_TOKEN', 'YOUR_BOT_ID');
```

#### Bot Configuration Options

* **prefix**: The prefix used for commands (default: `!`).
* **onStart**: Function that is called when the bot starts successfully.
* **onError**: Function that is called in case of an error.
* **onMessage**: Function that is triggered when a message is received.
* **autoReconnect**: Boolean value to enable auto-reconnection if the bot gets disconnected.

Once the bot is configured, you can run it by calling the `run()` method with your bot's token and ID.

---

## Command Registration

Custom commands can be registered using the `command()` function. You can define how the bot should respond to specific commands or messages.

### Basic Command Registration

```javascript
command("hello", (ctx) => {
  ctx.reply("Hello, World!");
});

command("ping", (ctx) => {
  ctx.reply("Pong!");
});
```

### Parameters

* **name**: The name of the command that the bot will respond to (e.g., `"hello"`).
* **func**: A callback function that is executed when the command is invoked. The `ctx` object contains message details and methods for replying.

#### Example: Using Command Arguments

```javascript
command("greet", (ctx) => {
  const name = ctx.args[0] || "User";
  ctx.reply(`Hello, ${name}!`);
});
```

In this example, the bot replies with "Hello, User!" unless a name is passed as an argument when the command is called.

---

## Sending Messages

To send messages to specific servers or groups, use the `say` CLI Command or call the `ctx.reply` or `bot.send` function

### Message Formatting

Messages can be formatted using markdown-like syntax, or you can send rich messages such as embeds or multimedia attachments.

---

## Message Formatting

**slchat.js** supports various message formatting types to enhance the appearance of your messages.

### Text Formatting

* **Bold**: `strong:<message>`
* **Italic**: `italic:<message>`
* **Strikethrough**: `strike:<message>`
* **Underline**: `underline:<message>`
* **Code**: `code:<message>`
* **Codeblock**: `codeblock:<message>`
* **Quote**: `quote:<message>`

### Embeds

The bot can send embedded messages that include titles, descriptions, and other metadata.

* **Embed Note**: `embed:note:<message>`
* **Embed Success**: `embed:success:<message>`
* **Embed Info**: `embed:info:<message>`
* **Embed Warning**: `embed:warn:<message>`
* **Embed Error**: `embed:error:<message>`
* **Embed Clean**: `embed:clean:<message>`

### Attachments

* **Image**: `img:<url>`
* **Audio**: `audio:<url>`
* **Video**: `video:<url>`

These allow you to send multimedia content as part of your message.

---

### Embed Builder
The `EmbedBuilder` class provides a fluent interface for generating clean, styled HTML-based embeds for bots using the SLChat platform. It supports fields, attachments, icons, code blocks, and customizable layout behavior.
### For detailed Information : [see EmbedBuilder.md](EmbedBuilder.md)

---

## Command-Line Interface (CLI)

**slchat.js** includes a basic CLI to manage and configure your bot. The available commands include:

* **status**: Displays the bot's connection status.
* **listservers**: Lists all servers the bot is currently connected to.
* **addserver \<server\_id>**: Adds a server to the bot's connection.
* **change <key> <value>**: Modifies a bot configuration setting.
* **exit**: Exits the bot process.
* **say \<server|all> <message>**: Sends a message to a specific server or all connected servers.

### CLI Example

```bash
status            # View bot connection status
listservers       # View all connected servers
addserver server1 # Add a server
change prefix !   # Change command prefix
exit              # Exit bot
say all Hello!    # Send message to all servers
```

---

## Error Handling and Logging

**slchat.js** includes built-in logging and error-handling capabilities. You can log messages at various stages of the bot’s lifecycle.

* **log()**: General information logging.
* **errorLog()**: Logs error messages with stack traces.
* **successLog()**: Logs successful actions.

#### Example

```javascript
const bot = new Bot({
  onError: (error) => errorLog("Error in Bot:", error),
  onStart: () => successLog("Bot has started!"),
  onMessage: (ctx) => log(`Received message: ${ctx.content}`),
});
```

---

## Cache Management

The bot uses an internal cache to store data such as users and servers, which reduces the number of API calls required. This is particularly useful for improving performance in larger bots.

### Cache Behavior:

* Cached data is automatically cleared every hour.
* You can access the cache using the `getJsonCache()` method to get previously fetched data.

---

## Contributing

We welcome contributions to **slchat.js**! If you'd like to contribute, follow the steps below:

1. Fork the repository on GitHub.
2. Clone the repository to your local machine.
3. Create a new branch for your feature or bugfix.
4. Make your changes and commit them.
5. Push your changes to your fork.
6. Open a pull request with a detailed explanation of your changes.

For bug reports, feature requests, or questions, feel free to open an issue in the GitHub repository.

---

## License

**slchat.js** is licensed under the MIT License. See the [LICENSE](https://github.com/axrxvm/slchat.js/blob/main/LICENSE) file for more details.

---

## Contact

* **Aarav Mehta**

  * GitHub: [axrxvm](https://github.com/axrxvm)
  * NPM: [slchat.js](https://www.npmjs.com/package/slchat.js)
