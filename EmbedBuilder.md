# 📘 `EmbedBuilder` — Usage Documentation

The `EmbedBuilder` class provides a fluent interface for generating clean, styled HTML-based embeds for bots using the SLChat platform. It supports fields, attachments, icons, code blocks, and customizable layout behavior.

---

## 🔧 Constructor

```js
new EmbedBuilder(embedType = "default", title = "", description = "")
```

* `embedType`: (string) One of the keys from `EMBED_ICONS`, such as `"success"`, `"error"`, etc.
* `title`: (string) Optional title for the embed.
* `description`: (string) Optional description content.

---

## ✨ Method Overview

### `.setType(type: string)`

Sets the visual style for the embed. Affects the CSS class and default icon.

```js
.setType("success") // Applies .embed.success and a check-circle icon
```

---

### `.setTitle(text: string)`

Sets the embed's title, displayed as a `<h4>` tag.

```js
.setTitle("Operation Complete")
```

---

### `.setDescription(text: string)`

Sets the main body description.

```js
.setDescription("All systems operational.")
```

---

### `.setAttachment(url: string)`

Adds an image to the bottom of the embed.

```js
.setAttachment("https://example.com/image.png")
```

---

### `.setAuthor(title: string, url: string)`

Displays an author section with avatar and name.

```js
.setAuthor("Bot Admin", "https://example.com/avatar.png")
```

---

### `.addField(name, value, inline = false, color = null, icon = null)`

Adds a field block to the embed.

* `name` — field label
* `value` — field content
* `inline` — if `true`, renders field inline
* `color` — optional text color
* `icon` — optional icon class

```js
.addField("Status", "✅ Online", true, "green", "bx-check")
```

---

### `.code(content: string, language = "")`

Inserts a syntax-highlighted code block (pre/code).

```js
.code("npm run build", "bash")
```

---

### `.setShowIcon(state: boolean)`

Toggles whether the default embed icon (based on type) is shown.

```js
.setShowIcon(false)
```

---

### `.disableIcon()`

Convenience method to hide the default icon.

```js
.disableIcon()
```

---

### `.build()`

Builds and returns the complete HTML string for the embed. It automatically joins content blocks with `<br>`, but avoids trailing line breaks.

```js
const html = embed.build();
ctx.sendRaw(html);
```

---

## 📌 Example

```js
const embed = new EmbedBuilder("success")
    .setTitle("✅ Task Complete")
    .setDescription("Your operation completed successfully.")
    .setAuthor("BotCore", "https://example.com/avatar.png")
    .addField("Latency", "23ms", true, "#2ecc71", "bx-timer")
    .code("npm run deploy", "bash")
    .setAttachment("https://example.com/image.png")
    .build();

ctx.sendRaw(embed);
```

---

## 🧠 Notes

* The embed system expects HTML to follow `.embed` class rules as defined by your frontend. You must ensure that:
* `.embed.success`, `.embed.error`, etc. are styled in the default settings provided by the SLChat Platform.
* Icon classes like `bx bx-check-circle` come from Boxicons.
* Outputs are designed to be compatible with SLChat’s HTML rendering engine.
* HTML is sanitized through `sanitize-html` in `formatMessage()` for safety if passed through `.send()`. Use `.sendRaw()` to bypass it.
