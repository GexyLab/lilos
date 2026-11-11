# Notify

`lilos.notify` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Sends you a lilOS notification, on behalf of the program. The notification appears in the bell of the taskbar, like those of the apps.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Any value that arrives here sends the notification. |
| **title** (`title`) | text | The title. If it has a value, it takes the place of the **Title** in the settings. It does not start the block. |
| **text** (`text`) | text | The text. If it has a value, it takes the place of the **Text** in the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **sent** (`sent`) | pulse | Sends `true` when lilOS has accepted the notification. |
| **Exception** (`error`) | object | When the notification does not go out: no text, too many notifications, notification service missing. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Title** (`title`) | text | empty | The title of the notification, when the **title** input has no value. It can contain `{name}` placeholders. |
| **Text ({name} = an added input)** (`text`) | text | empty | The text of the notification, when the **text** input has no value. Each `{name}` takes the value of the added input with that name. |
| **Kind** (`level`) | Information, Success, Warning, Error | Information | The kind of the notification: it changes the icon and the colour with which lilOS shows it. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 8 inputs of any type. They are called **placeholder 1**, **placeholder 2**... and you can **rename** them: the name you give is the one to write between braces in the title or in the text. The number of added ports also has a general limit of the engine (32 by default, see [Limits](logicstudio-engine/limits)).

The added inputs **only keep their value**: a value that arrives there does not send the notification, even if the input "starts it". The notification goes out only with **send**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **send**:

1. The block takes the title: the value of **title** if it has one, otherwise the **Title** in the settings. The same for the text.
2. It replaces each `{name}` with the value of the added input that has that name. An object or a list becomes JSON text (`{"a":1}`); an added input that has not received anything yet becomes empty text. A `{name}` that matches no added input stays written as it is. Names are case sensitive: `{Temp}` is not `{temp}`.
3. If title and text are both empty (or only spaces), the block stops with the error "La notifica non ha testo" ("The notification has no text").
4. It asks lilOS (in the kernel, on your behalf) to send you the notification and, if all goes well, sends `true` on **sent**.

Things to know:

- New lines and repeated spaces become **a single space**: the notification is always on one line.
- If there are a title and a text, the notification shows them joined like this: `Title — text`. If only one of the two is there, it shows only that.
- The text of the notification stops at **300 characters**: the rest is cut without an error.
- The notification arrives **to you**, that is to the user who owns the program, and is marked as sent by the program: the sender is the name of the program (at most 80 characters). Clicking it opens nothing.
- lilOS keeps only the last notifications of each user (20 by default): the oldest ones disappear.
- **At most 10 notifications per minute.** The limit is per user and applies to **all your Logic Studio programs together**, because for lilOS the sender is always Logic Studio. Beyond the limit the block sends on **Exception** "Troppe notifiche in poco tempo: riprova tra N secondi" ("Too many notifications in a short time: try again in N seconds").
- Do not link **send** to a block that sends values continuously (for example [Interval (setInterval)](core.every) with a few seconds): put a check first, like [On change (edge)](core.edge) or [If · Else](core.if), so the notification goes out only when something changes.
- The block needs the notification service (`notifications-basic`), which the AppStore installs together with this package.

## Examples

### 1. A fixed notification at start

```
[On start (main)] pulse ──▶ send [Notify]
```

In the settings of the Notify block: **Title** `Irrigation`, **Text** `The program has started`, **Kind** Success. As soon as the program starts you receive the notification "Irrigation — The program has started".

### 2. A value inside the text

Add an input to the Notify block and rename it `temp`. In the settings: **Title** `Greenhouse`, **Text** `High temperature: {temp} °C`, **Kind** Warning.

```
[Constant · Variable: 31.5]  value ──▶ temp  [Notify]
[Button: alert] pressed ──▶ send
```

When you press the [Button](ui.button) you receive "Greenhouse — High temperature: 31.5 °C". The constant arrives on **temp** at start, but alone it sends nothing: **send** is needed.

### 3. Alerting only when a threshold is passed

```
[Interval (setInterval): 60 s] pulse ──▶ read [readFile: ~/serra/temp.txt] content ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify]
                                                                 content ──▶ temp
[Constant · Variable: 30]                                                    value ──▶ b
```

Every minute the program reads the temperature from a file (for example `31.5`) and compares it with 30. The [On change (edge)](core.edge) block sends **becomes true** only when the comparison goes from false to true: you receive a notification when the temperature goes over 30, not one per minute. The added input **temp** of the Notify block receives the content of the file, to write it in the text `{temp} °C`.

> The On change block sends nothing on the first value it receives: if the temperature is already over 30 when the program starts, the first notification arrives only after it has gone down and up again.

### 4. Title and text from other blocks

```
[Template string: "Order {number} arrived"] text ──▶ text [Notify]
[Constant · Variable: "Shop"]                         value ──▶ title
[HTTP request (fetch)]                           status ──▶ send
```

The **title** and **text** inputs do not start the block: they keep the value until **send** arrives. Here the notification goes out when the [HTTP request (fetch)](net.request) block answers, with the text prepared by [Template string](core.format) (which has its own added input **number**).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| La notifica non ha testo ("The notification has no text") | Title and text are both empty. |
| Troppe notifiche in poco tempo: riprova tra N secondi ("Too many notifications in a short time: try again in N seconds") | You went over 10 notifications per minute (N is the number of seconds left). |
| Troppe notifiche in poco tempo: riprova tra un minuto ("Too many notifications in a short time: try again in a minute") | As above, when lilOS does not say how long to wait. |
| Notifica non valida: … ("Invalid notification: …") | lilOS refused the notification (for example an invalid kind). |
| Il servizio delle notifiche non c'è ("The notification service is not there") | The notifications module is not installed or did not start. |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping while the block was working. |
| Notify ha impiegato più di 30 s ("Notify took more than 30 s") | lilOS did not answer within the maximum time of a block (30 seconds by default). |

## Permissions

The block works as the user who owns the program and sends notifications only to them. An app made with **Make app** that contains a Notify block, before starting, asks you for permission to "send you notifications". See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

## See also

- [Emit (event to lilOS)](lilos.event), to alert lilOS pages without a notification
- [Print (console.log)](core.consoleWrite), for messages that stay in the console of the program
- [On change (edge)](core.edge) and [If · Else](core.if), to send the notification only when needed
- [How a block works](ide/blocks)
