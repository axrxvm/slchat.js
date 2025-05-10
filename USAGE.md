# Usage Guide for **slchat.js** - Lightweight Node.js Wrapper for slchat API

**Created by**: [Aarav Mehta](https://itzaarav.netlify.app/)
**Published on NPM**: [slchat.js](https://www.npmjs.com/package/slchat.js)
**GitHub Repository**: [axrxvm/slchat.js](https://github.com/axrxvm/slchat.js)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Bot Setup](#bot-setup)
4. [Command Registration](#command-registration)
5. [Message Formatting](#message-formatting)
6. [Command-Line Interface (CLI)](#command-line-interface-cli)
7. [Error Handling and Logging](#error-handling-and-logging)
8. [Cache Management](#cache-management)
9. [Contributing](#contributing)
10. [License](#license)

---

## Introduction

**slchat.js** is a lightweight and fast Node.js wrapper for interacting with the **slchat API**. It provides a simple interface for creating bots, sending and formatting messages, and interacting with chat servers.

With **slchat.js**, you can easily:

* Connect your bot to one or more chat servers.
* Handle messages and commands dynamically.
* Format messages with rich text and multimedia content.
* Send and receive messages across connected servers.
* Perform bot management tasks via a command-line interface.

---

## Installation

To install **slchat.js** via npm or yarn, run the following command in your project directory:

```bash
npm install slchat.js
```

or

```bash
yarn add slchat.js
```

Once installed, you can require it in your JavaScript code like this:

```javascript
const { Bot, command, log, errorLog, successLog } = require('slchat.js');
```

---

## Bot Setup

### Initializing the Bot

To initialize your bot, you need to create an instance of the `Bot` class. The `Bot` constructor accepts an options object where you can define several settings for the bot's behavior.

#### Example:

```javascript
const bot = new Bot({
  prefix: "!",  // Command prefix for the bot (default is '!')
  onError: (err) => errorLog("Bot Error", err), // Custom error handler
  onStart: () => successLog("Bot started successfully"), // Start handler
  onMessage: (ctx) => {
    // Handle incoming messages
    log(`Message from ${ctx.owner.name}: ${ctx.content}`);
  },
  autoReconnect: true // Enable auto-reconnection to servers
});
```

#### Parameters:

* `prefix`: The character or string that begins a command (default is `!`).
* `onError`: Custom error handler function.
* `onStart`: Callback function executed when the bot is started.
* `onMessage`: Callback function that processes incoming messages.
* `autoReconnect`: Boolean that determines if the bot should automatically reconnect if disconnected from a server.

#### Running the Bot:

To run the bot, use the `run()` method, passing in the bot's token and bot ID. You will need a valid token and bot ID that you can obtain via the slchat API.

```javascript
bot.run('YOUR_BOT_TOKEN', 'YOUR_BOT_ID');
```

---

## Command Registration

You can define custom commands for the bot to respond to using the `command()` function.

#### Example:

```javascript
command("hello", (ctx) => {
  ctx.reply("Hello, world!");
});

command("ping", (ctx) => {
  ctx.reply("Pong!");
});
```

#### Parameters:

* **name**: The name of the command (e.g., `"hello"`).
* **func**: A function that is executed when the command is invoked. It receives a `Context` object as an argument.

The `Context` object contains the message details and helper methods for sending messages back.

---

#### Parameters:

* `message`: The message you want to send (can be a plain string or formatted text).
* `serverId`: The ID of the server to which you want to send the message.

---

## Message Formatting

**slchat.js** supports various message formatting types to enhance the appearance of messages. You can apply formatting for text styles, embeds, and multimedia content.

### Text Formatting

* **Strong**: Wraps text in `<strong></strong>` (bold).

  * Usage: `strong:<message>`
* **Italic**: Wraps text in `<em></em>` (italic).

  * Usage: `italic:<message>`
* **Strike-through**: Wraps text in `<del></del>` (strikethrough).

  * Usage: `strike:<message>`
* **Underline**: Wraps text in `<u></u>` (underline).

  * Usage: `underline:<message>`
* **Code**: Wraps text in `<code></code>` (inline code).

  * Usage: `code:<message>`
* **Codeblock**: Wraps text in `<code class="multiline"></code>` (multiline code).

  * Usage: `codeblock:<message>`
* **Quote**: Wraps text in `<blockquote></blockquote>` (blockquote).

  * Usage: `quote:<message>`

### Embeds

You can use embeds to display styled messages with icons:

* **Embed Note**: Displays an embedded note.

  * Usage: `embed:note:<message>`

* **Embed Success**: Displays an embedded success message.

  * Usage: `embed:success:<message>`

* **Embed Info**: Displays an embedded info message.

  * Usage: `embed:info:<message>`

* **Embed Warning**: Displays an embedded warning message.

  * Usage: `embed:warn:<message>`

* **Embed Error**: Displays an embedded error message.

  * Usage: `embed:error:<message>`

* **Clean Embed**: Displays a simple embedded message without an icon.

  * Usage: `embed:clean:<message>`

### Attachments

You can attach images, audio, and video using the following shorthand notations:

* **Image**: Embeds an image.

  * Usage: `img:<url>`
* **Audio**: Embeds an audio file.

  * Usage: `audio:<url>`
* **Video**: Embeds a video file.

  * Usage: `video:<url>`
---

### Embed Builder
The `EmbedBuilder` class provides a fluent interface for generating clean, styled HTML-based embeds for bots using the SLChat platform. It supports fields, attachments, icons, code blocks, and customizable layout behavior.
### For detailed Information : [see EmbedBuilder.md](EmbedBuilder.md)

---

## Command-Line Interface (CLI)

**slchat.js** provides a simple CLI for interacting with the bot. The available commands are:

* **status**: Displays the current bot connection status.
* **listservers**: Lists all servers the bot is connected to.
* **addserver \<server\_id>**: Adds a new server to the bot's connection.
* **change <key> <value>**: Changes a bot configuration setting.
* **exit**: Exits the bot process.
* **say \<all|server1,server2,...> <message>**: Sends a message to the specified server(s).

### Example CLI Usage:

```bash
status             # View bot connection status
listservers        # List all connected servers
addserver server1  # Add a new server
change prefix !    # Change the command prefix to "!"
exit               # Exit the bot process
say all Hello!     # Send "Hello!" to all connected servers
```

---

## Error Handling and Logging

**slchat.js** provides custom logging and error-handling functionality for a smoother development experience.

* **log()**: Logs general information.
* **errorLog()**: Logs error messages with stack traces.
* **successLog()**: Logs successful operations.
* **onError**: A custom error handler function that you can define when initializing the bot. It is called whenever an error occurs.

### Example:

```javascript
const bot = new Bot({
  onError: (err) => errorLog("Bot Error", err),
  onStart: () => successLog("Bot has started successfully")
});
```

---

## Cache Management

**slchat.js** includes a built-in cache for optimizing network requests. Cached data (e.g., user or server information) is automatically stored and reused to reduce redundant API calls.

### Cache Behavior:

* Cache is cleared automatically every hour.
* You can access cached data using the `getJsonCache()` method.

---

## Contributing

If you want to contribute to the development of **slchat.js**, feel free to fork the repository, make your changes, and submit a pull request. You can also report bugs or request new features via GitHub issues.

### Steps to Contribute:

1. Fork the repository.
2. Clone your fork locally.
3. Create a new branch for your feature/bugfix.
4. Commit your changes.
5. Push to your fork and open a pull request.

---

## License

**slchat.js** is licensed under the MIT License. See the [LICENSE](https://github.com/axrxvm/slchat.js/blob/main/LICENSE) file for details.

---

## Contact

* **Aarav Mehta**

  * GitHub: [axrxvm](https://github.com/axrxvm)
  * NPM: [slchat.js](https://www.npmjs.com/package/slchat.js)
