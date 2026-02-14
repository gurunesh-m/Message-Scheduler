const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Use Railway PORT or default
const PORT = process.env.PORT || 8080;

/* =========================
   CORS CONFIG
========================= */

app.use(cors({
    origin: "https://time-lesswill.netlify.app",
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: "https://time-lesswill.netlify.app",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

/* =========================
   FILE STORAGE
========================= */

const DATA_DIR = '/var/data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

let CONFIG = {
    contacts: [],
    message: "Good morning!",
    scheduledTime: { hour: 8, minute: 15 }
};

if (fs.existsSync(CONFIG_FILE)) {
    CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

/* =========================
   WHATSAPP CLIENT
========================= */

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(DATA_DIR, 'auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ],
        executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
    }
});

/* =========================
   SOCKET CONNECTION
========================= */

io.on('connection', (socket) => {
    console.log('🔌 UI connected');
    socket.emit('config', CONFIG);

    socket.on('updateConfig', (newConfig) => {

        let istHour = parseInt(newConfig.scheduledTime.hour);
        let istMinute = parseInt(newConfig.scheduledTime.minute);

        // Convert IST (UTC+5:30) → UTC
        let utcHour = istHour - 5;
        let utcMinute = istMinute - 30;

        if (utcMinute < 0) {
            utcMinute += 60;
            utcHour -= 1;
        }

        if (utcHour < 0) {
            utcHour += 24;
        }

        CONFIG = {
            ...newConfig,
            utcScheduledTime: {
                hour: utcHour,
                minute: utcMinute
            }
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG));

        console.log(
            `⚙️ Config Updated. IST: ${istHour}:${istMinute} → UTC: ${utcHour}:${utcMinute}`
        );
    });
});

/* =========================
   WHATSAPP EVENTS
========================= */

client.on('qr', async (qr) => {
    try {
        const url = await qrcode.toDataURL(qr);
        io.emit('qr', url);
        console.log('📤 QR Sent');
    } catch (err) {
        console.error('QR Error:', err);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp Ready');
    io.emit('ready');
});

/* =========================
   LOCK CLEANUP
========================= */

const clearLocks = () => {
    const lockPath = path.join(DATA_DIR, 'auth', 'Default', 'SingletonLock');
    const cookieLockPath = path.join(DATA_DIR, 'auth', 'Default', 'Cookies-journal');

    [lockPath, cookieLockPath].forEach((p) => {
        if (fs.existsSync(p)) {
            try {
                fs.unlinkSync(p);
                console.log(`🗑️ Removed old lock: ${p}`);
            } catch (e) {
                console.error(`Could not remove lock: ${p}`, e);
            }
        }
    });
};

clearLocks();

/* =========================
   INITIALIZE CLIENT
========================= */

client.initialize();

/* =========================
   START SERVER
========================= */

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
