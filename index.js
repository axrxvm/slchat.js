const axios = require("axios");
const { io } = require("socket.io-client");
const { EventEmitter } = require("events");
const readline = require("readline");
const { URLSearchParams } = require("url");

const BASE_URL = "https://slchat.alwaysdata.net";

class Logger {
  static info(...args) { console.log("[INFO]", ...args); }
  static warn(...args) { console.warn("[WARN]", ...args); }
  static error(...args) { console.error("[ERROR]", ...args); }
}

class Cache {
  constructor() {
    this.store = new Map();
    setInterval(() => this.store.clear(), 60 * 60 * 1000);
  }

  async fetch(url) {
    if (!this.store.has(url)) {
      Logger.info("Caching API call:", url);
      this.store.set(url, axios.get(url).then(res => res.data).catch(() => null));
    }
    return this.store.get(url);
  }
}

class SLTChatAPI {
  constructor(token, botId) {
    this.token = token;
    this.botId = botId;
    this.cache = new Cache();
  }

  getUser(id) {
    return this.cache.fetch(`${BASE_URL}/api/user/${id}/`);
  }

  async change(key, value) {
    const form = new URLSearchParams({ change_key: key, change_value: value });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const cookies = { headers: { Cookie: `token=${this.token}; op=${this.botId}` } };
    await axios.post(`${BASE_URL}/api/change`, form.toString(), { ...headers, ...cookies });
    Logger.info(`Changed key [${key}] -> [${value}]`);
  }

  async joinServer(serverId) {
    const form = new URLSearchParams({ server_id: serverId });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const cookies = { headers: { Cookie: `token=${this.token}; op=${this.botId}` } };
    await axios.post(`${BASE_URL}/api/new_server`, form.toString(), { ...headers, ...cookies });
    Logger.info(`Joined server [${serverId}]`);
  }
}

class Context {
  constructor(message, serverId, bot) {
    this.content = message.text;
    this.owner = message.owner;
    this.date = message.date;
    this.serverId = serverId;
    this.bot = bot;
  }

  reply(text) {
    return this.bot.send(text, this.serverId);
  }
}

class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  register(name, fn) {
    if (this.commands.has(name)) throw new Error(`Command ${name} exists`);
    this.commands.set(name, fn);
  }

  async execute(name, ctx, args) {
    const command = this.commands.get(name);
    if (!command) throw new Error(`Unknown command: ${name}`);
    const start = Date.now();
    await command(ctx, args);
    const duration = Date.now() - start;
    Logger.info(`Command '${name}' executed in ${duration}ms`);
  }

  has(name) {
    return this.commands.has(name);
  }
}

class Bot extends EventEmitter {
  constructor(prefix = "!") {
    super();
    this.prefix = prefix;
    this.token = "";
    this.botId = "";
    this.serverIds = [];
    this.sockets = {};
    this.commands = new CommandRegistry();
  }

  command(name, fn) {
    this.commands.register(name, fn);
  }

  async run(token, botId) {
    this.token = token;
    this.botId = botId;
    this.api = new SLTChatAPI(token, botId);

    const user = await this.api.getUser(botId);
    if (!user?.servers?.length) throw new Error("Bot user not found or no servers assigned");

    this.serverIds = user.servers;
    Logger.info("Connecting to servers:", this.serverIds);

    this.serverIds.forEach(id => this.connectSocket(id));

    this.startConsole();
    this.emit("ready", this.serverIds);
  }

  connectSocket(serverId) {
    const socket = io(BASE_URL, {
      transports: ["websocket"],
      query: { server: serverId, user: this.botId }
    });

    socket.on("connect", () => Logger.info(`Connected to server [${serverId}]`));
    socket.on("disconnect", () => Logger.warn(`Disconnected from server [${serverId}]`));
    socket.on("connect_error", err => Logger.error("Socket error:", err.message));
    socket.on("message", msg => this.handleMessage(msg, serverId));
    socket.on("prompt", msg => this.handleMessage(msg, serverId));

    this.sockets[serverId] = socket;
  }

  async handleMessage(msg, serverId) {
    const realMsg = msg.message || msg; // Unwrap message if needed
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

  async send(text, serverId) {
    const socket = this.sockets[serverId];
    if (!socket?.connected) throw new Error("Socket not connected");
    socket.emit("message", {
      text,
      server_id: serverId,
      token: this.token,
      op: this.botId
    });
  }

  async join(serverId) {
    if (this.serverIds.includes(serverId)) throw new Error("Already joined");
    await this.api.joinServer(serverId);
    this.serverIds.push(serverId);
    this.connectSocket(serverId);
  }

  async change(key, value) {
    await this.api.change(key, value);
  }

  async isBot(id) {
    const user = await this.api.getUser(id);
    return user?.label?.name === "BOT";
  }

  startConsole() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
    const helpText = `
  Available commands:
  - addserver <server_id>  : Adds a server to the bot.
  - set <key> <value>      : Changes bot settings.
  - servers                : Lists all connected servers.
  - poweroff               : Shuts down the bot gracefully.
  - disconnect             : Disconnects from all active servers.
  - status                 : Displays the bot's connection status.
  - help                   : Shows this help message.
    `;
  
    rl.on("line", async (input) => {
      const [cmd, ...args] = input.trim().split(" ");
      try {
        switch (cmd) {
          case "addserver":
            await this.join(args[0]);
            break;
          case "set":
            await this.change(args[0], args.slice(1).join(" "));
            break;
          case "servers":
            Logger.info("Connected servers:", this.serverIds);
            break;
          case "poweroff":
            Logger.info("Shutting down the bot...");
            this.emit("shutdown");
            this.serverIds.forEach(id => {
              const socket = this.sockets[id];
              if (socket?.connected) {
                socket.disconnect();
                Logger.info(`Disconnected from server [${id}]`);
              }
            });
            process.exit(0); // Graceful shutdown
          case "disconnect":
            this.serverIds.forEach(id => {
              const socket = this.sockets[id];
              if (socket?.connected) {
                socket.disconnect();
                Logger.info(`Disconnected from server [${id}]`);
              }
            });
            break;
          case "status":
            Logger.info("Bot status:");
            Logger.info(`- Token: ${this.token}`);
            Logger.info(`- Bot ID: ${this.botId}`);
            Logger.info(`- Connected servers: ${this.serverIds.length}`);
            break;
          case "help":
            Logger.info(helpText);
            break;
          default:
            Logger.warn("Unknown CLI command:", cmd);
        }
      } catch (err) {
        Logger.error("CLI error:", err.message);
      }
    });
  }
}  

module.exports = { Bot, Context };