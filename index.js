/* eslint-disable no-case-declarations */
const axios = require("axios");
const io = require("socket.io-client");
const chalk = require('chalk');
const readline = require("readline");
const EventEmitter = require("events");
const sanitizeHtml = require("sanitize-html");

/** @type {Map<string, Function>} */
const commandDict = new Map();

/** @constant {string} */
const DOMAIN = "slchat.alwaysdata.net";
/** @constant {number} */
const RATE_LIMIT_MS = 1000;
/** @constant {number} */
const CACHE_TTL_MS = 30 * 60 * 1000;

// Configuration Validation
const defaultConfig = {
    prefix: "!",
    onError: console.error,
    onStart: () => {},
    onMessage: () => {},
    autoReconnect: true,
    maxMessageLength: 2000,
    reconnectAttempts: 5,
    reconnectBaseDelay: 1000
};

/**
 * @param {Object} config
 * @returns {Object}
 */
function validateConfig(config) {
    const validated = { ...defaultConfig, ...config };
    if (typeof validated.prefix !== "string" || !validated.prefix) {
        validated.prefix = defaultConfig.prefix;
    }
    if (typeof validated.maxMessageLength !== "number" || validated.maxMessageLength < 100) {
        validated.maxMessageLength = defaultConfig.maxMessageLength;
    }
    return validated;
}

// Logging Utilities
/**
 * @param {...any} args
 */
function log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

/**
 * @param {string} location
 * @param {Error|string} err
 */
function errorLog(location, err) {
    console.error(chalk.red(`[ERROR - ${location}]`), err.stack || err);
}

/**
 * @param {string} msg
 */
function successLog(msg) {
    console.log(chalk.green(`[SUCCESS] ${msg}`));
}

function infoLog(msg) {
    console.log(chalk.blue(`[INFO] ${msg}`));
}   

/**
 * @param {string} name
 * @param {Function} func
 */
function command(name, func) {
    if (!name || typeof name !== "string" || typeof func !== "function") {
        throw new Error("Invalid command: name must be a non-empty string and func must be a function");
    }
    if (commandDict.has(name)) {
        log(chalk.yellow(`[WARN] Overwriting command '${name}'`));
    }
    commandDict.set(name, func);
    successLog(`Registered command: ${name}`);
}

// Message Formatting
/** @type {Object<string, {className: string, icon: string}>} */
const EMBED_TYPES = {
    "embed": { className: "embed", icon: "" },
    "embed:note": { className: "embed note", icon: "bx bx-note" },
    "embed:success": { className: "embed success", icon: "bx bx-check-circle" },
    "embed:info": { className: "embed info", icon: "bx bx-info-circle" },
    "embed:warn": { className: "embed warn", icon: "bx bx-error" },
    "embed:error": { className: "embed error", icon: "bx bx-x-circle" },
    "embed:clean": { className: "embed clean", icon: "" }
};

/** @type {Array<{key: string, wrap: (val: string) => string}>} */
const FORMAT_SHORTCUTS = [
    { key: "strong", wrap: val => `<strong>${val}</strong>` },
    { key: "italic", wrap: val => `<em>${val}</em>` },
    { key: "strike", wrap: val => `<del>${val}</del>` },
    { key: "underline", wrap: val => `<u>${val}</u>` },
    { key: "code", wrap: val => `<code>${val}</code>` },
    { key: "codeblock", wrap: val => `<code class="multiline">${val}</code>` },
    { key: "spoiler", wrap: val => `<p class="spoiler">${val}</p>` },
    { key: "quote", wrap: val => `<blockquote>${val}</blockquote>` },
    { key: "h1", wrap: val => `<h1>${val}</h1>` },
    { key: "h2", wrap: val => `<h2>${val}</h2>` },
    { key: "h3", wrap: val => `<h3>${val}</h3>` },
    { key: "ul", wrap: val => `<ul><li>${val}</li></ul>` }
];

/**
 * @param {string} input
 * @param {number} maxLength
 * @returns {string}
 */
function formatMessage(input, maxLength = 2000) {
    if (!input || typeof input !== "string") return "";
    const trimmed = input.trim().slice(0, maxLength);
    if (!trimmed) return "";

    // Convert newlines to <br> tags before sanitization
    const withBreaks = trimmed.replace(/\n/g, "<br>");

    const sanitized = sanitizeHtml(withBreaks, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "audio", "video", "u", "del", "br"]),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ["src", "class"], video: ["src", "class", "controls", "width", "height"], audio: ["src", "controls"] }
    });

    // Handle embeds
    const sortedKeys = Object.keys(EMBED_TYPES).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (sanitized.toLowerCase().startsWith(`${key}:`)) {
            const content = sanitized.slice(key.length + 1).trim();
            const { className, icon } = EMBED_TYPES[key];
            const iconHTML = icon ? `<i class="${icon}"></i> ` : "";

            // Split content into lines and apply formatting shortcuts to each line
            const lines = content.split("<br>");
            const formattedLines = lines.map(line => {
                line = line.trim();
                for (const fmt of FORMAT_SHORTCUTS) {
                    if (line.startsWith(`${fmt.key}:`)) {
                        return fmt.wrap(line.slice(fmt.key.length + 1).trim());
                    }
                }
                return line;
            }).filter(line => line).join("<br>");

            return `<div class="${className}">${iconHTML}${formattedLines}</div>`;
        }
    }

    // Handle formatting shortcuts for non-embed content
    const lines = sanitized.split("<br>");
    const formattedLines = lines.map(line => {
        line = line.trim();
        for (const fmt of FORMAT_SHORTCUTS) {
            if (line.startsWith(`${fmt.key}:`)) {
                return fmt.wrap(line.slice(fmt.key.length + 1).trim());
            }
        }
        return line;
    }).filter(line => line).join("<br>");

    // Handle attachments
    if (formattedLines.startsWith("imgspoiler:")) {
        const url = formattedLines.slice(11).trim();
        return `<img class="attachment spoiler" src="${url}"></img>`;
    }
    if (formattedLines.startsWith("img:")) {
        const url = formattedLines.slice(4).trim();
        return `<img class="attachment" src="${url}"></img>`;
    }
    if (formattedLines.startsWith("audio:")) {
        const url = formattedLines.slice(6).trim();
        return `<audio controls src="${url}"></audio>`;
    }
    if (formattedLines.startsWith("video:")) {
        const url = formattedLines.slice(6).trim();
        return `<video class="attachment" controls width="320" height="240"><source src="${url}" type="video/"></video>`;
    }

    return formattedLines;
}

// Cache Implementation with TTL
class Cache {
    constructor() {
        /** @type {Map<string, {value: any, expiry: number}>} */
        this.store = new Map();
    }

    /** @param {string} key */
    get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    /** @param {string} key @param {any} value */
    set(key, value) {
        this.store.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
    }

    clear() {
        this.store.clear();
    }
}

// Bot Implementation
class Bot {
    /**
     * @param {Object} options
     */
    constructor(options) {
        const config = validateConfig(options);
        this.prefix = config.prefix;
        this.onError = config.onError;
        this.onStart = config.onStart;
        this.onMessage = config.onMessage;
        this.autoReconnect = config.autoReconnect;
        this.maxMessageLength = config.maxMessageLength;
        this.reconnectAttempts = config.reconnectAttempts;
        this.reconnectBaseDelay = config.reconnectBaseDelay;
        this.token = "";
        this.botId = "";
        /** @type {string[]} */
        this.serverIds = [];
        /** @type {Map<string, any>} */
        this.sioInstances = new Map();
        this.requestsCache = new Cache();
        this.events = new EventEmitter();
        /** @type {Map<string, number>} */
        this.lastSent = new Map();
        this.performanceMetrics = { messagesSent: 0, commandsProcessed: 0, errors: 0 };
        this._setupCLI();
    }

    _setupCLI() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100
        });

        rl.on("line", (input) => {
            const trimmed = input.trim();
            if (!trimmed) return;

            const [cmd, ...args] = trimmed.split(" ");
            const command = cmd.toLowerCase();

            switch (command) {
                case "status":
                    log(`Connected to ${this.serverIds.length} server${this.serverIds.length === 1 ? "" : "s"}`);
                    log(`Metrics: ${JSON.stringify(this.performanceMetrics)}`);
                    break;
                case "listservers":
                    console.log(this.serverIds.length ? this.serverIds.join("\n") : "(none)");
                    break;
                case "change":
                    if (!args[0] || !args[1]) return console.log("Usage: change <key> <value>");
                    this.change(args[0], args[1]);
                    break;
                case "exit":
                    log("Exiting bot...");
                    this.sioInstances.forEach(socket => socket.disconnect());
                    process.exit(0);
                    break;
                case "say":
                    if (args.length < 2) return console.log("Usage: say <all|server1,server2,...> <message>");
                    const target = args[0].toLowerCase();
                    const message = formatMessage(args.slice(1).join(" "), this.maxMessageLength);
                    const targets = target === "all" ? this.serverIds : target.split(",").map(s => s.trim()).filter(Boolean);

                    for (const sid of targets) {
                        if (!this.serverIds.includes(sid)) {
                            log(chalk.red(`[ERROR] Not connected to server [${sid}]`));
                            continue;
                        }
                        this.send(message, sid);
                        log(chalk.blue(`[CLI-SAY] Sent to ${sid}: ${message}`));
                    }
                    break;
                default:
                    console.log("CLI Commands: status, listServers, change <key> <value>, exit, say <all|server1,server2,...> <message>");
            }
        });
    }

    startCacheWiper() {
        setInterval(() => {
            const sizeBefore = this.requestsCache.store.size;
            this.requestsCache.clear();
            log(chalk.blue(`[INFO] Cache cleared (released ${sizeBefore} entries)`));
        }, CACHE_TTL_MS);
    }

    /**
     * @param {string} url
     * @returns {Promise<any|null>}
     */
    async getJsonCache(url) {
        const cached = this.requestsCache.get(url);
        if (cached) return cached;

        try {
            const response = await axios.get(url, {
                withCredentials: true,
                headers: {
                    "Cookie": `token=${encodeURIComponent(this.token)}; op=${encodeURIComponent(this.botId)}`
                }
            });
            if (response.status >= 400) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = response.data;
            if (!data || typeof data !== "object") {
                throw new Error("Invalid API response: Expected JSON object");
            }
            this.requestsCache.set(url, data);
            return data;
        } catch (err) {
            this.performanceMetrics.errors++;
            const errorMsg = err.response
                ? `HTTP ${err.response.status}: ${err.message}`
                : err.message;
            errorLog(`getJsonCache [${url}]`, errorMsg);
            this.onError(err, "getJsonCache");
            return null;
        }
    }

    /**
     * @param {string} token
     * @param {string} botId
     */
    async run(token, botId) {
        if (!token || !botId) throw new Error("Token and botId are required");
        this.token = token;
        this.botId = botId;

        try {
            const res = await this.getJsonCache(`https://${DOMAIN}/api/user/${botId}/`);
            if (!res) {
                throw new Error("Failed to fetch user data: No response");
            }
            this.serverIds = (res.servers || []).map(s => {
                if (typeof s === "string") return s;
                return s.id ? s.id.toString() : null;
            }).filter(id => id !== null);
            successLog(`Connected to servers: ${this.serverIds.join(", ") || "(none)"}`);
        } catch (err) {
            this.performanceMetrics.errors++;
            errorLog("run:fetchUser", err);
            this.onError(err, "run:fetchUser");
            return;
        }

        for (const serverId of this.serverIds) this._connectSocket(serverId);
        this.onStart();
        this.startCacheWiper();
        this.events.emit("start");
    }

    /**
     * @param {string} serverId
     * @param {number} [attempt=0]
     */
    _connectSocket(serverId, attempt = 0) {
        const socket = io(`https://${DOMAIN}?server=${serverId}`, {
        extraHeaders: {
            Cookie: `op=${this.botId}; token=${this.token}`
        },
            reconnection: this.autoReconnect,
            reconnectionAttempts: this.reconnectAttempts,
            reconnectionDelay: this.reconnectBaseDelay * Math.pow(2, attempt)
        });

        socket.on("connect", () => {
            successLog(`Socket connected to server [${serverId}]`);
            this.events.emit("connect", serverId);
        });

        socket.on("disconnect", reason => {
            log(chalk.yellow(`Disconnected from [${serverId}]: ${reason}`));
            this.events.emit("disconnect", serverId, reason);
        });

        socket.on("connect_error", err => {
            errorLog(`Socket [${serverId}]`, err);
            if (attempt < this.reconnectAttempts) {
                setTimeout(() => this._connectSocket(serverId, attempt + 1), this.reconnectBaseDelay * Math.pow(2, attempt));
            }
        });

        socket.on("prompt", data => this.onSocketMessage(data));
        socket.on("message", data => this.onSocketMessage(data));

        this.sioInstances.set(serverId, socket);
    }

    /**
     * @param {string} id
     * @returns {Promise<any|null>}
     */
    async getUser(id) {
        return await this.getJsonCache(`https://${DOMAIN}/api/user/${id}/`);
    }
    async getServer(id) {
    return await this.getJsonCache(`https://${DOMAIN}/api/server/${id}/`);
    }
    /**
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async isBot(id) {
        const user = await this.getUser(id);
        return user?.label?.name === "BOT" || false;
    }

    /**
     * @param {any} prompt
     */
    onSocketMessage(prompt) {
        if (!prompt?.message || !prompt?.server_id) return;
        this.checkNewCommand(prompt.message, prompt.server_id);
        this.events.emit("message", prompt);
    }

    /**
     * @param {any} message
     * @param {string} serverId
     */
    async checkNewCommand(message, serverId) {
        try {
            if (await this.isBot(message.owner?.id)) return;

            const ctx = new Context(message, serverId, this);
            this.onMessage(ctx);
            this.performanceMetrics.commandsProcessed++;

            if (!message.text?.startsWith(this.prefix)) return;

            const parts = message.text.slice(1).trim().split(" ");
            const cmdName = parts[0].toLowerCase();
            const arg = parts.slice(1).join(" ");

            const cmdFunc = commandDict.get(cmdName);
            if (!cmdFunc) {
                const err = `Unknown command: ${cmdName}`;
                this.onError(err, "checkNewCommand");
                log(chalk.red(err));
                return;
            }

            cmdFunc.length > 1 ? cmdFunc(ctx, arg) : cmdFunc(ctx);
            log(chalk.cyan(`[COMMAND] ${cmdName} -> ${ctx.owner.name}`));
            this.events.emit("command", cmdName, ctx);
        } catch (err) {
            this.performanceMetrics.errors++;
            this.onError(err, "checkNewCommand");
            errorLog("checkNewCommand", err);
        }
    }

    /**
     * @param {string} message
     * @param {string} serverId
     */
    send(message, serverId) {
    if (!this.serverIds.includes(serverId)) {
        const err = `Bot is not in server [${serverId}]`;
        this.onError(err, "send");
        log(chalk.red(err));
        return;
    }
    if (!message || typeof message !== "string") {
        const err = "Invalid message: must be a non-empty string";
        this.onError(err, "send");
        log(chalk.red(err));
        return;
    }

    const lastSent = this.lastSent.get(serverId) || 0;
    if (Date.now() - lastSent < RATE_LIMIT_MS) {
        const err = `Rate limit exceeded for server [${serverId}]`;
        this.onError(err, "send");
        log(chalk.red(err));
        return;
    }

    try {
        const payload = {
            text: message,
        };
        const socket = this.sioInstances.get(serverId);
        if (!socket) {
            throw new Error(`No socket instance for server [${serverId}]`);
        }
        log(chalk.blue(`[DEBUG] Emitting message to [${serverId}]: ${JSON.stringify(payload)}`));
        socket.emit("message", payload);
        this.lastSent.set(serverId, Date.now());
        this.performanceMetrics.messagesSent++;
        log(chalk.gray(`[SEND] "${message}" -> [${serverId}]`));
        this.events.emit("send", message, serverId);
    } catch (err) {
        this.performanceMetrics.errors++;
        this.onError(err, "send");
        errorLog(`send to [${serverId}]`, err);
    }
    }


    /**
     * @param {string} key
     * @param {string} value
     */
    async change(key, value) {
        if (!key || !value) {
            const err = "Key and value are required";
            this.onError(err, "change");
            log(chalk.red(err));
            return;
        }

        try {
            const payload = new URLSearchParams({ change_key: key, change_value: value });
            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `token=${encodeURIComponent(this.token)}; op=${encodeURIComponent(this.botId)}`
            };

            await axios.post(`https://${DOMAIN}/api/change`, payload.toString(), {
                headers,
                withCredentials: true
            });

            successLog(`Changed key [${key}] to [${value}]`);
            this.events.emit("change", key, value);
        } catch (err) {
            this.performanceMetrics.errors++;
            this.onError(err, "change");
            errorLog("change", err);
        }
    }
}

// Embed Builder Implementation
const EMBED_ICONS = {
    error:    "bx-x-circle",
    warn:     "bx-error",
    info:     "bx-info-circle",
    success:  "bx-check-circle",
    note:     "bx-note",
    clean:    null,
    default:  null
};
class EmbedBuilder {
    constructor(embedType = "default", title = "", description = "") {
        this.embedType = embedType;
        this.title = title;
        this.description = description;
        this.attachment = "";
        this.authorHtml = "";
        this.fieldsHtml = [];
        this.showIcon = true;
        this.customColor = null;
        this.customIcon = null;
    }

    setType(embedType) {
        this.embedType = embedType;
        return this;
    }

    setColor(color) {
        this.customColor = color;
        return this;
    }

    setIcon(iconClass) {
        this.customIcon = iconClass;
        return this;
    }

    setTitle(text) {
        this.title = text;
        return this;
    }

    setDescription(text) {
        this.description = text;
        return this;
    }

    setAttachment(url) {
        this.attachment = url;
        return this;
    }

    setAuthor(title, url) {
        this.authorHtml = `<div class='center gap'><img class='avatar' loading='lazy' src='${url}'>${title}</div>`;
        return this;
    }

    setShowIcon(state) {
        this.showIcon = state;
        return this;
    }

    disableIcon() {
        return this.setShowIcon(false);
    }

    addField(name, value, inline = false, color = null, icon = null) {
        const style = color ? ` style='color: ${color};'` : "";
        const iconHtml = icon ? `<i class='bx ${icon}'></i>` : "";
        const inlineHtml = inline ? " inline" : "";
        const valueHtml = (color || icon)
            ? `<p class='center gap'${style}>${iconHtml}${value}</p>`
            : value;

        const fieldHtml = `<div class='center gap${inlineHtml}'><strong>${name}</strong> ${valueHtml}</div>`;
        this.fieldsHtml.push(fieldHtml);
        return this;
    }

    code(content, language = "") {
        const langClass = language ? `language-${language}` : "";
        const html = `<pre><code class="${langClass}">${content}</code></pre>`;
        this.fieldsHtml.push(html);
        return this;
    }

    build() {
        const typeClass = this.embedType !== "default" ? ` ${this.embedType}` : "";
        const iconParentClass = this.showIcon && (this.customIcon || EMBED_ICONS[this.embedType]) ? "" : " block";
        const styleAttr = this.customColor ? ` style="--color: ${this.customColor}"` : "";

        const iconClass = this.customIcon || EMBED_ICONS[this.embedType];
        const iconHtml = this.showIcon && iconClass ? `<i class='bx ${iconClass}'></i><div class='inline'>` : "";
        const iconEndHtml = this.showIcon && iconClass ? "</div>" : "";

        const attachmentHtml = this.attachment ? `<img class='attachment' src='${this.attachment}'>` : "";
        const titleHtml = this.title ? `<h4>${this.title}</h4>` : "";
        const descriptionHtml = this.description ? `${this.description}` : "";
        const fieldsHtml = this.fieldsHtml.length ? this.fieldsHtml.join("<br>") : "";

        const combinedContent = [this.authorHtml, titleHtml, descriptionHtml, fieldsHtml, attachmentHtml]
            .filter(Boolean)
            .join("<br>");

        return `<div class='embed${iconParentClass}${typeClass}'${styleAttr}>${iconHtml}${combinedContent}${iconEndHtml}</div>`;
    }
}


// Context Implementation
class Context {
    /**
     * @param {Object} message
     * @param {string} serverId
     * @param {Bot} bot
     */
    constructor(message, serverId, bot) {
        this.content = message.text || "";
        this.owner = message.owner || {};
        this.owner.name = this.owner.name || this.owner.username || this.owner.id || this.owner.nickname || "Unknown";
        this.date = message.date || new Date();
        this.serverId = serverId || this.serverName || "Unknown";
        this.isBot = message.owner?.id === bot.botId;
        this.serverName = message.server_name || "Unknown";
        this.bot = bot;
        this.fullMessage = new WeakRef(message);
        this.server = null;
        this._fetchServer();
    }

    /**
     * Fetch server details and store in context
     */
    async _fetchServer() {
        try {
            const data = await this.bot.getJsonCache(`https://${DOMAIN}/api/server/${this.serverId}/`);
            this.server = data || null;
        } catch (err) {
            this.server = null;
            errorLog("Context:_fetchServer", err);
            this.bot.onError(err, "Context:_fetchServer");
        }
    }

    /**
     * @param {string} msg
     */
    send(msg) {
        if (!msg) return;
        const formatted = formatMessage(msg, this.bot.maxMessageLength);
        this.bot.send(formatted, this.serverId);
    }

    /**
     * @param {string} msg
     */
    reply(msg) {
        this.send(msg);
    }

    sendRaw(msg) {
        if (!msg) return;
        this.bot.send(msg, this.serverId);
    }

    log() {
        log(`[CTX] ${this.owner.nickname}: ${this.content}`);
    }
}

module.exports = { Bot, Context, command, log, errorLog, successLog, infoLog, formatMessage, EmbedBuilder, EMBED_TYPES, DOMAIN, RATE_LIMIT_MS, CACHE_TTL_MS, commandDict, FORMAT_SHORTCUTS };