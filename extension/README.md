# PhishDetect AI Chrome Extension 🚫📩

PhishDetect AI is a smart phishing and scam message detector powered by RoBERTa. It scans messages using AI and alerts users if a message seems suspicious, helping build digital literacy and protect from online threats.

## Features

- 🧠 AI-powered phishing detection (RoBERTa model)
- 🧾 History log of all scanned messages
- 🚫 Blocklist of spam emails with sync and export
- 📢 Alert banners on webpages with blocked emails
- 💾 Export history and blocklist to CSV
- 🎨 Clean minimalist UI (Off-white, Purple, Gold palette)

## How to Use

1. Install the Chrome extension by loading it as an unpacked extension via `chrome://extensions`.
2. Run the backend (hosted on Railway or locally).
3. Paste suspicious messages into the popup and scan them.
4. Manage spam emails via blocklist and get real-time banner alerts.

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

### Extension

1. Load `extension/` as an unpacked extension in Chrome.
2. Make sure the backend URL is correct in the code (`popup.js`, `banner.js`).

## Credits

Built for the social good to promote digital literacy and cybersecurity awareness.