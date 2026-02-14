# Timeless Will - WhatsApp Automation 🚀

**Timeless Will** is a powerful, modern WhatsApp automation tool designed for scheduling daily broadcast messages. Built with a focus on reliability and a bold user experience, it allows you to automate repetitive messaging tasks with ease.

---

## 🌟 Overview

Timeless Will provides a seamless way to schedule and send daily WhatsApp messages to multiple contacts. Whether it's a daily greeting, a reminder, or a status update, this tool handles it automatically at your preferred time. It features a striking **Neo-Brutalist** web dashboard for real-time management and monitoring.

## ✨ Key Features

- **🕒 Precision Scheduling**: Set a specific time (Daily) for your messages to be sent automatically.
- **📱 Multi-Contact Broadcasting**: Add and manage multiple target phone numbers for simultaneous delivery.
- **🎨 Neo-Brutalist Dashboard**: A high-contrast, bold web interface for a superior management experience.
- **🔄 Real-time Status**: Live updates on connection state, QR code authentication, and message delivery status via Socket.io.
- **💾 Persistent Settings**: Your configuration (contacts, messages, time) is saved locally and survives restarts.
- **🔐 Secure Login**: Authentic WhatsApp Web integration using QR code scanning.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Automation**: [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- **Real-time**: Socket.io
- **Frontend**: HTML5, Vanilla CSS (Neo-Brutalist Design)
- **Utilities**: Puppeteer, QRcode-terminal

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher)
- [npm](https://www.npmjs.com/)
- A WhatsApp account on your mobile device

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gurunesh-m/Message-Scheduler.git
   cd whatsapp-automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   node index.js
   ```

## 📖 Usage

1. **Access the Dashboard**: Once the server is running, open your browser and navigate to `http://localhost:3000`.
2. **Authenticate**: Scan the displayed QR code using your WhatsApp mobile app (Linked Devices > Link a Device).
3. **Configure Settings**:
   - Enter the **Target Contacts** (10-digit mobile numbers).
   - Compose your **Broadcast Message**.
   - Set the **Execution Time** (AM/PM format).
4. **Save & Activate**: Click "Save & Activate" to sync your settings. The scheduler will now handle the rest!

## 📂 Project Structure

- `index.js`: Main server logic and WhatsApp client initialization.
- `public/`: Contains the Neo-Brutalist web frontend.
- `config.json`: Persistent storage for your automation settings.
- `query_history.json`: (Optional) Log of past queries/interactions.

---

*Made with ❤️ for automation enthusiasts.*
