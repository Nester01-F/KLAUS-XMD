<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=230&section=header&text=KLAUS%20XMD&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=The%20Ultimate%20WhatsApp%20Bot%20Experience&descAlignY=58&descSize=18" alt="KLAUS XMD" width="100%"/>

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=900&size=26&duration=2500&pause=800&color=A855F7&center=true&vCenter=true&width=720&lines=Welcome+to+KLAUS+XMD;68%2B+Powerful+Commands;Antilink+%26+Antispam+Built-in;Auto+View+%7C+React+%7C+Typing+%7C+Bio;Deploy+Anywhere+in+Minutes" alt="Typing SVG"/>

<br/>

<img src="https://img.shields.io/badge/VERSION-1.0.0-ff00c8?style=for-the-badge&logo=opsgenie&logoColor=white" alt="Version"/>
<img src="https://img.shields.io/badge/NODE-20%2B-00ff88?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"/>
<img src="https://img.shields.io/badge/BAILEYS-MULTI--DEVICE-22d3ee?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys"/>
<img src="https://img.shields.io/badge/COMMANDS-68-a855f7?style=for-the-badge" alt="Commands"/>

<img src="https://img.shields.io/github/stars/Nester01-F/KLAUS-XMD?style=social" alt="Stars"/>
<img src="https://img.shields.io/github/forks/Nester01-F/KLAUS-XMD?style=social" alt="Forks"/>
<img src="https://img.shields.io/github/watchers/Nester01-F/KLAUS-XMD?style=social" alt="Watchers"/>

<br/><br/>

<img src="https://files.catbox.moe/ndm2q0.jpg" alt="KLAUS XMD" width="620"/>

</div>

<br/>

## ⚡ How it works

```mermaid
flowchart LR
    A([🔑 Get Session ID]) --> B([⚙️ Set SESSION_ID])
    B --> C([🚀 Deploy])
    C --> D([✅ Online card in your WhatsApp])
    D --> E([💬 Send .menu])
```

<br/>

## 🔑 Step 1: Get your Session ID

<div align="center">

| 🟢 Pair Site 1 | 🟢 Pair Site 2 |
|:-:|:-:|
| [![Session 1](https://img.shields.io/badge/GET%20SESSION-CLICK%20HERE-00ff88?style=for-the-badge&logo=whatsapp&logoColor=white)](https://klaus-xmd-kge2.onrender.com/) | [![Session 2](https://img.shields.io/badge/GET%20SESSION-CLICK%20HERE-22d3ee?style=for-the-badge&logo=whatsapp&logoColor=white)](https://klaus-session-pair.vercel.app) |

</div>

1. Open a pair site and choose **Pairing Code** or **QR Code**.
2. In WhatsApp go to **Settings → Linked Devices → Link a Device**.
3. Enter the code (or scan the QR). Your **SESSION_ID** appears on the page **and is sent to your own WhatsApp chat**.

> [!CAUTION]
> Your SESSION_ID gives full access to your WhatsApp account. **Never share it, post it in logs or issues, or commit it to GitHub.** If it leaks, unlink the device in *Linked Devices* and generate a new one.

<br/>

## 🚀 Step 2: Deploy

<div align="center">

[![Deploy on Railway](https://img.shields.io/badge/Deploy%20on-Railway-8B5CF6?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/new/template?template=https://github.com/Nester01-F/KLAUS-XMD)
[![Deploy on Heroku](https://img.shields.io/badge/Deploy%20on-Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com/deploy?template=https://github.com/Nester01-F/KLAUS-XMD)
[![Deploy on Render](https://img.shields.io/badge/Deploy%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/Nester01-F/KLAUS-XMD)
[![Deploy on Koyeb](https://img.shields.io/badge/Deploy%20on-Koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=white)](https://app.koyeb.com/deploy?type=git&repository=github.com/Nester01-F/KLAUS-XMD)

</div>

### 🔧 Environment variables

| Variable | Required | What it is |
|:--|:-:|:--|
| `SESSION_ID` | ✅ | The Session ID from Step 1 |
| `OWNER_NUMBER` | ➖ | Your number with country code, no `+` (e.g. `2547XXXXXXXX`) |

### 💻 Run it yourself

```bash
git clone https://github.com/Nester01-F/KLAUS-XMD.git
cd KLAUS-XMD
npm install
SESSION_ID="your_session_id" node index.js
```

No session yet? Run `node index.js` with no `SESSION_ID` and choose **QR** or **Pairing Code** in the terminal.

<details>
<summary><b>🟣 Heroku notes</b></summary>

<br/>

The `Procfile` runs the bot as a **worker**, so turn the web dyno off and the worker on:

```bash
heroku ps:scale web=0 worker=1
heroku config:set SESSION_ID="your_session_id"
heroku logs --tail
```

Run **one copy per session**. Two bots on the same Session ID log each other out.

</details>

<br/>

## 🌟 Why KLAUS XMD?

<table>
<tr>
<td width="50%" valign="top">

### ⚡ Fast &amp; Reliable
- Multi-device **Baileys** core
- Hot-reload plugins, no restart needed
- Smart reconnect with backoff
- Built-in keep-alive pings

### 🛡️ Group Guard
- **Antilink**: detects and deletes links
- **Antispam**: rate-limits spammers
- **3-Strike System**: auto-kick after warnings
- **Per-group settings** for every chat

</td>
<td width="50%" valign="top">

### 🤖 Automation
- Auto view &amp; save **status**
- Auto react to status and commands
- Auto read, auto typing, auto bio
- Auto block and call handling

### 🎨 Beautiful Output
- Custom menu with images
- Neon-styled replies
- Image-backed command cards
- Online card sent on startup

</td>
</tr>
</table>

<br/>

## 📦 Feature Highlights

<div align="center">

| 🎯 Category | 🔥 Power |
|:-----------:|:---------|
| **Downloaders** | YouTube · TikTok · Instagram · Facebook · Spotify · Twitter · Pinterest |
| **AI Tools** | GPT · Gemini · Image Generation · Summarizer |
| **Stickers** | Image→Sticker · Video→Sticker · Sticker→Image |
| **Group Admin** | Kick · Promote · Tagall · Mute · Antilink · Antispam |
| **Automation** | Auto view status · react · read · typing · bio · block |
| **Tools** | Weather · Translate · QR · Time · Lyrics · Currency · IP Lookup |
| **Fun** | Memes · Jokes · 8Ball · Ship · Dice · Coin Flip |

</div>

Send **`.menu`** in any chat to see everything the bot can do.

<br/>

## 📸 Preview

<div align="center">

| 🎨 Menu | ⚡ Alive | 👑 Developer |
|:-------:|:--------:|:-------------:|
| <img src="https://files.catbox.moe/lusgnl.jpg" width="230" alt="Menu"/> | <img src="https://files.catbox.moe/maj8xu.jpg" width="230" alt="Alive"/> | <img src="https://files.catbox.moe/ndm2q0.jpg" width="230" alt="Developer"/> |

</div>

<br/>

## 👨‍💻 Developer

<div align="center">

<img src="https://files.catbox.moe/ndm2q0.jpg" width="150" alt="Warrior Felix"/>

### 🥷 Warrior Felix

**Founder · KLAUS TECH · Nairobi, Kenya 🇰🇪**

<a href="https://wa.me/254701881604"><img src="https://img.shields.io/badge/WhatsApp-%2B254%20701%20881%20604-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WA1"/></a>
<a href="https://wa.me/254725391914"><img src="https://img.shields.io/badge/WhatsApp-%2B254%20725%20391%20914-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WA2"/></a>
<a href="https://github.com/Nester01-F"><img src="https://img.shields.io/badge/GitHub-Nester01--F-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>

<br/><br/>

<img src="https://github-readme-stats.vercel.app/api/pin/?username=Nester01-F&repo=KLAUS-XMD&theme=radical&hide_border=true" alt="KLAUS-XMD repo card"/>

</div>

<br/>

## ❤️ Support the Project

<div align="center">

If **KLAUS XMD** helped you, please ⭐ **star** the repo and 🍴 **fork** it!

<a href="https://github.com/Nester01-F/KLAUS-XMD/stargazers"><img src="https://img.shields.io/github/stars/Nester01-F/KLAUS-XMD?style=for-the-badge&logo=github&color=ffdd00&label=STAR%20THE%20REPO" alt="Star"/></a>
<a href="https://github.com/Nester01-F/KLAUS-XMD/fork"><img src="https://img.shields.io/badge/FORK%20THE%20REPO-a855f7?style=for-the-badge&logo=git&logoColor=white" alt="Fork"/></a>
<a href="https://github.com/Nester01-F/KLAUS-XMD/issues"><img src="https://img.shields.io/badge/REPORT%20BUG-ff0055?style=for-the-badge&logo=github&logoColor=white" alt="Issues"/></a>

<br/><br/>

<a href="https://star-history.com/#Nester01-F/KLAUS-XMD&Date">
  <img src="https://api.star-history.com/svg?repos=Nester01-F/KLAUS-XMD&type=Date" alt="Star History" width="560"/>
</a>

</div>

<br/>

## ⚠️ Disclaimer

> KLAUS XMD is provided **as-is** for educational purposes and is **not affiliated with or endorsed by WhatsApp or Meta**.
> Do not use it for spam, harassment, or any activity that violates **WhatsApp's Terms of Service**.
> The developer is **not responsible** for misuse or account bans.

<div align="center">

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Russo+One&weight=700&size=22&duration=3000&pause=1000&color=FF00C8&center=true&vCenter=true&width=600&lines=Made+with+%E2%9D%A4%EF%B8%8F+in+Kenya;By+Warrior+Felix;KLAUS+TECH+%7C+2026" alt="Footer"/>

### 🇰🇪 **MADE IN KENYA** 🇰🇪

**By [Warrior Felix](https://github.com/Nester01-F) · KLAUS TECH**

⭐ **Star · Fork · Deploy · Enjoy** ⭐

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=120&section=footer" width="100%" alt=""/>

</div>