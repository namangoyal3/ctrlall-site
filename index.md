# ctrl+all

> Control Claude Code and Codex on your Mac from Android or iPhone. Share chats, approve requests, run project terminals, and schedule tasks. Free Mac app.

Canonical: https://ctrlall.app/
Last updated: 2026-11-10

## Run coding agents as a team.

Control Claude Code and Codex on your Mac from Android or iPhone. Share chats with your team. Keep your Mac awake while agents work.

[Download for Mac](https://github.com/namangoyal3/ctrlall-releases/releases/latest) [Try it live](https://ctrlall.app/#try)

Your team shares one Claude Code and Codex session on one Mac: anyone with the role taps Allow from a phone, and goals keep building after everyone logs off.

Runs the agents you already pay for.

- Claude Code
- Codex
- OpenCode
- Copilot
- Grok
- Kimi
- Hermes
- Ollama

## Watch. Redirect. Hand off.

Today an agent lives in one person's terminal. ctrl+all gives it a room.

1. **Watch** One session. Every paired phone sees the same turn, live.
2. **Redirect** Steer it mid-run from any phone. A permission card takes one Allow, from whoever has the role.
3. **Hand off** Invite teammates as owner, operator or viewer. Goals keep building overnight.

## Set up once. Every agent gets it.

### A CLI for scripts

The same control room in your shell.

### MCP, once

Add a server one time. Every engine gets it.

### Skills marketplace

Curated or by git URL. One place to install and remove.

### Project memory

Notes every agent reads before every turn.

### Rewind

Undo a turn. Files and transcript go back.

### Apple Watch shortcuts

**Preview · Manual setup.** Dictate a task, read its reply, and answer supported Claude permissions. Requires a paired iPhone, an awake Mac, and a private connector with HTTPS access.

### Project terminals

Open managed shells in your project folder. View output and send commands from your paired phone.

### Scheduled routines

Run a saved task on a schedule. Each routine opens a new chat and keeps its results.

### Android and iPhone

Scan a QR code to connect your phone browser. Review chats and answer supported approval requests away from your Mac.

## Zero tokens metered.

Use your existing agent subscriptions on your Mac. ctrl+all adds no token charges. The Mac app is free; the hosted relay costs extra.

**8** engines verified live

**~140** operations a paired phone can call

## Up in three steps.

1. **Install on your Mac.** It finds the agent CLIs you already have.
2. **Pair your phone.** Scan the QR in any phone browser. It keeps its own keys.
3. **Invite your team.** Each teammate pairs their own phone, with a role.

## Download ctrl+all.

Free Mac app. Needs macOS 14.5 or later. Runs on Apple silicon and Intel. The hosted relay has a separate Pro subscription.

### You need

- A Mac with macOS 14.5 or later.
- One agent CLI, such as Claude Code or Codex.
- Your own account with its vendor.

[Download for Mac](https://github.com/namangoyal3/ctrlall-releases/releases/latest)

### The first time you open it

1. Open the disk image. Drag ctrl+all to **Applications**.
2. Open it from Applications.
3. Open New chat. Choose a project folder and an available assistant.
4. Send your task. Scan the pairing QR code to connect your phone.

Signed with an Apple Developer ID and notarized by Apple. Updates arrive in the sidebar: click "Restart to update".

## Free to run. Pay for the relay.

Everything on the Mac is free. Pro is the relay we run for you.

**Free** $0

The engine, the desktop and web apps, every agent, local pairing, a relay you run yourself, and every update.

[Download for Mac](https://ctrlall.app/#download)

**Pro** 30 days free, then $5 a month or $48 a year. Card required.

The hosted relay, push notifications, and pairing with no setup.

[Start yearly · $48/year](https://ctrlall.app/buy/yearly) [Start monthly · $5/month](https://ctrlall.app/buy/monthly)

Prefer to run your own relay? It's free and [documented](https://ctrlall.app/byo-relay).

## Questions, answered.

### What is ctrl+all?

ctrl+all is a Mac app that runs coding agents on your Mac. A paired phone browser lets you view chats, send tasks, and answer supported approval requests. Your Mac must stay awake and connected.

### Can I use Android or iPhone?

Yes. Scan the pairing QR code on your Mac and open the link in your Android or iPhone browser. You do not need a native phone app.

### How do I start a project chat?

Open New chat. Choose your project folder and an available assistant, such as Claude Code or Codex. Sign in to the assistant if required. Send your task, then pair your phone to continue remotely.

### Can I control a terminal that is already open?

ctrl+all manages its own project shells. You can return to those shells from the app and use terminal controls from a paired phone. It does not attach to an existing Terminal.app or iTerm session.

### Can I view my existing Claude Code or Codex history?

The next desktop update adds an optional local history viewer. You choose whether ctrl+all reads those files. The viewer does not resume old chats or send history to a phone or agent. The public v1.0.3 download does not include this viewer.

### Is this just ssh and tmux to my Mac?

Those show one person one terminal. ctrl+all runs the agents on one Mac as a shared session: teammates join with roles, one Allow from anyone with the role answers the prompt for all, and a goal keeps building after everyone logs off.

### How does a team use it?

One Mac runs the engine, and the owner invites teammates by role: viewers watch, operators run chats and approve steps, owners also manage people. Each pairs their own phone and sees the same chats, goals and inbox, fenced to their role.

### Do I need a cloud workspace?

No. Your agent processes and code stay on your Mac. Use your existing agent vendor accounts. The public download requires Google sign-in. Pro adds a billing subscription for the hosted relay. You can also run your own relay.

### Which agents does it run?

Claude Code and Codex, each as it would run in your terminal, on the subscription you already have. OpenCode, Grok, Hermes, Kimi, GitHub Copilot and a local Ollama model run as experimental engines.

### Does it cost per token?

ctrl+all adds no token charges. Your agent vendor bills your account under its own plan. The Mac app and a self-hosted relay are free. Pro includes the hosted relay: 30 days free, then $5/month or $48/year. A card is required.

### What does the relay see?

The relay sees connection metadata and frame sizes. Your devices seal message frames with X25519, Ed25519 and ChaCha20-Poly1305, so the relay cannot read their contents. The relay also serves the phone client, so you trust its operator for that code.

The Mac app checks GitHub for updates and sends usage counts to ctrlall.app by default. Crash reports are off by default. Turn usage counts off in Settings → Reports. Read [every usage event and its allowed properties](https://ctrlall.app/analytics).

### Can I run my own relay?

Yes. The `ctrlall` CLI ships inside the app, and `ctrlall relay show` prints the relay in use. For a phone on your Wi-Fi or tailnet, the relay install script runs a relay on the Mac. For a phone anywhere, put Tailscale Funnel in front of it or run `ctrlall relay tunnel`. Either way the relay only forwards sealed frames it cannot read.

### Will macOS warn me when I open it?

No. Since version 1.0.0 the app is signed with an Apple Developer ID and notarized by Apple. If macOS does warn you, or says the app is damaged, do not override it: the file is not the one we published. Delete it and write to support@ctrlall.app.

## Related
- [Download for Mac](https://github.com/namangoyal3/ctrlall-releases/releases/latest)
- [Support](mailto:support@ctrlall.app)
