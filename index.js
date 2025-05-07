const axios = require("axios");
const io = require("socket.io-client");
const chalk = require("chalk").default;
const readline = require("readline");
const { send } = require("process");
const { format } = require("path");

const domain = "slchat.alwaysdata.net";
const commandDict = new Map();

function log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}
function errorLog(location, err) {
    console.error(chalk.red(`[ERROR - ${location}]`), err.stack || err);
}
function successLog(msg) {
    console.log(chalk.green(`[SUCCESS] ${msg}`));
}
function command(name, func) {
    if (!name || typeof func !== "function") {
        throw new Error("Invalid command registration: name and function required");
    }
    if (commandDict.has(name)) {
        log(chalk.yellow(`[WARN] Command '${name}' overwritten.`));
    }
    commandDict.set(name, func);
    successLog(`Registered bot command: ${name}`);
}
// Format message for display in the chat
function formatMessage(input) {
    if (!input || typeof input !== "string") return input;

    input = input.trim();

    // === Embed handlers ===
    const embedTypes = {
        "embed": { className: "embed", icon: "" },
        "embed:note": { className: "embed note", icon: "bx bx-note" },
        "embed:success": { className: "embed success", icon: "bx bx-check-circle" },
        "embed:info": { className: "embed info", icon: "bx bx-info-circle" },
        "embed:warn": { className: "embed warn", icon: "bx bx-error" },
        "embed:error": { className: "embed error", icon: "bx bx-x-circle" },
        "embed:clean": { className: "embed clean", icon: "" }
    };

    // Sort keys longest-first so embed:info matches before embed
    const sortedKeys = Object.keys(embedTypes).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (input.toLowerCase().startsWith(`${key}:`)) {
            const content = input.slice(key.length + 1).trim();
            const { className, icon } = embedTypes[key];
            const iconHTML = icon ? `<i class="${icon}"></i> ` : "";
            return `<div class="${className}">${iconHTML}${content}</div>`;
        }
    }

    // Special case: plain "embed:" without any subtype
    if (input.toLowerCase().startsWith("embed:")) {
        const content = input.slice(6).trim(); // 6 = length of "embed:"
        return `<div class="embed">${content}</div>`;
    }

    // === General formatting shortcuts ===
    const formatShortcuts = [
        { key: "strong", wrap: (val) => `<strong>${val}</strong>` },
        { key: "italic", wrap: (val) => `<em>${val}</em>` },
        { key: "strike", wrap: (val) => `<del>${val}</del>` },
        { key: "underline", wrap: (val) => `<u>${val}</u>` },
        { key: "code", wrap: (val) => `<code>${val}</code>` },
        { key: "codeblock", wrap: (val) => `<code class="multiline">${val}</code>` },
        { key: "spoiler", wrap: (val) => `<p class="spoiler">${val}</p>` },
        { key: "quote", wrap: (val) => `<blockquote>${val}</blockquote>` },
        { key: "h1", wrap: (val) => `<h1>${val}</h1>` },
        { key: "h2", wrap: (val) => `<h2>${val}</h2>` },
        { key: "h3", wrap: (val) => `<h3>${val}</h3>` },
        { key: "ul", wrap: (val) => `<ul><li>${val}</li></ul>` },
    ];

    for (const fmt of formatShortcuts) {
        if (input.startsWith(`${fmt.key}:`)) {
            return fmt.wrap(input.slice(fmt.key.length + 1).trim());
        }
    }

    // === Attachments ===
    if (input.startsWith("imgspoiler:")) {
        const url = input.slice(11).trim();
        return `<img class="attachment spoiler" src="${url}"></img>`;
    }

    if (input.startsWith("img:")) {
        const url = input.slice(4).trim();
        return `<img class="attachment" src="${url}"></img>`;
    }

    if (input.startsWith("audio:")) {
        const url = input.slice(6).trim();
        return `<audio controls src="${url}"></audio>`;
    }

    if (input.startsWith("video:")) {
        const url = input.slice(6).trim();
        return `<video class="attachment" controls width="320" height="240"><source src="${url}" type="video/"></video>`;
    }

    // No formatting detected, return raw
    return input;
}




class Cache {
    constructor() {
        this.store = new Map();
    }
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    clear() {
        this.store.clear();
    }
}

class Bot {
    constructor({ prefix = "!", onError = console.error, onStart = () => {}, onMessage = () => {}, autoReconnect = true }) {
        this.prefix = prefix;
        this.onError = onError;
        this.onStart = onStart;
        this.onMessage = onMessage;
        this.autoReconnect = autoReconnect;

        this.token = "";
        this.botId = "";
        this.serverIds = [];
        this.sioInstances = new Map();
        this.requestsCache = new Cache();

        this._setupCLI();
    }

    _setupCLI() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on("line", (input) => {
            const [cmd, ...args] = input.trim().split(" ");
            switch (cmd.toLowerCase()) {
                case "status":
                    log(`Connected to: ${this.serverIds.length} servers`);
                    break;
                case "listservers":
                    console.log(this.serverIds.join("\n") || "(none)");
                    break;
                case "addserver":
                    if (!args[0]) return console.log("Usage: addServer <server_id>");
                    this.join(args[0]);
                    break;
                case "change":
                    if (!args[0] || !args[1]) return console.log("Usage: change <key> <value>");
                    this.change(args[0], args[1]);
                    break;
                case "exit":
                    console.log("Exiting bot...");
                    process.exit(0);
                    break;
                    case "say":
                        if (args.length < 2) {
                            console.log("Usage: say <all|server1,server2,...> <message>");
                            break;
                        }
                    
                        const target = args[0].toLowerCase();
                        const rawMessage = args.slice(1).join(" ");
                    
                        // Wrap formatting if user types shorthand (e.g. embed:info)
                        const formatWrappedMessage = formatMessage(rawMessage);
                    
                        let targets = [];
                    
                        if (target === "all") {
                            targets = this.serverIds;
                        } else {
                            targets = target.split(",").map(s => s.trim()).filter(Boolean);
                        }
                    
                        for (const sid of targets) {
                            if (!this.serverIds.includes(sid)) {
                                log(chalk.red(`[ERROR] Not connected to server [${sid}]`));
                                continue;
                            }
                            this.send(formatWrappedMessage, sid);
                            log(chalk.blue(`[CLI-SAY] Sent to ${sid}: ${formatWrappedMessage}`));
                        }
                        break;                                    
                default:
                    console.log("CLI Commands: status, listServers, addServer <id>, change <key> <value>, exit, say <all|server1,server2,...> <message>");
            }
        });
    }

    startCacheWiper() {
        setInterval(() => {
            this.requestsCache.clear();
            log(chalk.blue("[INFO] Cache cleared."));
        }, 60 * 60 * 1000);
    }

    async getJsonCache(url) {
        if (!this.requestsCache.get(url)) {
            try {
                const response = await axios.get(url);
                this.requestsCache.set(url, response.data);
            } catch (err) {
                this.onError(err, "getJsonCache");
                errorLog("getJsonCache", err);
                return null;
            }
        }
        return this.requestsCache.get(url);
    }

    async run(token, botId) {
        this.token = token;
        this.botId = botId;
        log(`Fetching bot user info: https://${domain}/api/user/${botId}/`);
        try {
            const res = await axios.get(`https://${domain}/api/user/${botId}/`);
            this.serverIds = (res.data.servers || []).map(String);
            successLog(`Connected to servers: ${this.serverIds.join(", ")}`);
        } catch (err) {
            errorLog("run:fetchUser", err);
            this.onError(err, "run:fetchUser");
            return;
        }

        for (const serverId of this.serverIds) this._connectSocket(serverId);
        this.onStart();
        this.startCacheWiper();
    }

    _connectSocket(serverId) {
        const socket = io(`https://${domain}`, {
            query: { server: serverId, user: this.botId },
            reconnection: this.autoReconnect
        });

        socket.on("connect", () => successLog(`Socket connected to server [${serverId}]`));
        socket.on("disconnect", reason => log(chalk.yellow(`Disconnected from [${serverId}]: ${reason}`)));
        socket.on("connect_error", err => errorLog(`Socket [${serverId}]`, err));
        socket.on("prompt", data => this.onSocketMessage(data));
        socket.on("message", data => this.onSocketMessage(data));

        this.sioInstances.set(serverId, socket);
    }

    async getUser(id) {
        return await this.getJsonCache(`https://${domain}/api/user/${id}/`);
    }

    async isBot(id) {
        const user = await this.getUser(id);
        return user?.label?.name === "BOT";
    }

    onSocketMessage(prompt) {
        this.checkNewCommand(prompt.message, prompt.server_id);
    }

    async checkNewCommand(message, serverId) {
        try {
            if (message.owner?.label?.name !== "BOT") {
                const ctx = new Context(message, serverId, this);
                this.onMessage(ctx);
                if (message.text.startsWith(this.prefix)) {
                    const parts = message.text.slice(1).split(" ");
                    const cmdName = parts[0];
                    const arg = parts.slice(1).join(" ");

                    if (commandDict.has(cmdName)) {
                        const cmdFunc = commandDict.get(cmdName);
                        cmdFunc.length > 1 ? cmdFunc(ctx, arg) : cmdFunc(ctx);
                        log(chalk.cyan(`[COMMAND] ${cmdName} -> ${ctx.owner.name}`));
                    } else {
                        this.onError(`Unknown command: ${cmdName}`, "checkNewCommand");
                        log(chalk.red(`Unknown command: ${cmdName}`));
                    }
                }
            }
        } catch (err) {
            this.onError(err, "checkNewCommand");
            errorLog("checkNewCommand", err);
        }
    }

    send(message, serverId) {
        if (!this.serverIds.includes(serverId)) {
            const err = `Bot is not in server [${serverId}]`;
            this.onError(err, "send");
            return log(chalk.red(err));
        }

        try {
            const payload = {
                text: message,
                server_id: serverId,
                token: this.token,
                op: this.botId
            };
            this.sioInstances.get(serverId).emit("message", payload);
            log(chalk.gray(`[SEND] "${message}" -> [${serverId}]`));
        } catch (err) {
            this.onError(err, "send");
            errorLog(`send to [${serverId}]`, err);
        }
    }

    async join(serverId) {
        if (this.serverIds.includes(serverId)) {
            const msg = `Bot is already in server [${serverId}]`;
            this.onError(msg, "join");
            return log(chalk.yellow(msg));
        }

        try {
            const payload = new URLSearchParams({ server_id: serverId });
            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `token=${this.token}; op=${this.botId}`
            };

            await axios.post(
                `https://${domain}/api/new_server`,
                payload.toString(),
                { headers, withCredentials: true }
            );

            this.serverIds.push(serverId);
            this._connectSocket(serverId);
            successLog(`Joined new server [${serverId}]`);

        } catch (err) {
            this.onError(err, "join");
            errorLog("join", err);
        }
    }

    async change(key, value) {
        try {
            const payload = new URLSearchParams({ change_key: key, change_value: value });
            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `token=${this.token}; op=${this.botId}`
            };

            await axios.post(`https://${domain}/api/change`, payload.toString(), {
                headers,
                withCredentials: true
            });

            successLog(`Changed key [${key}] to [${value}]`);
        } catch (err) {
            this.onError(err, "change");
            errorLog("change", err);
        }
    }
}

class Context {
    constructor(message, serverId, bot) {
        this.content = message.text;
        this.owner = message.owner || {};
        this.owner.name = this.owner.name || this.owner.username || this.owner.id || "Unknown";
        this.date = message.date;
        this.serverId = serverId;
        this.bot = bot;
        this.fullMessage = message;
    }

    send(msg) {
        const formatted = formatMessage(msg);
        this.bot.send(formatted, this.serverId);
    }
    
    reply(msg) {
        this.send(msg);
    }    

    log() {
        console.log(`[CTX] ${this.owner.name}: ${this.content}`);
    }
}


module.exports = { Bot, Context, command, log, errorLog, successLog, formatMessage };
