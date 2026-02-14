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

// Use the PORT Railway gives us, or default to 8080
const PORT = process.env.PORT || 8080;

// 1. APPLY GLOBAL CORS
app.use(cors({
    origin: "https://time-lesswill.netlify.app",
    credentials: true
}));

// 2. APPLY SOCKET.IO CORS (No trailing slash on origin!)
const io = new Server(server, {
    cors: {
        origin: "https://time-lesswill.netlify.app",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

const DATA_DIR = '/var/data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure directory exists
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
            '--single-process' // Helps in restricted container environments
        ],
        // This is key: it tells Puppeteer where to find Chromium in your Docker setup
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
    }
});

io.on('connection', (socket) => {
    console.log('🔌 UI connected');
    socket.emit('config', CONFIG);
    
    socket.on('updateConfig', (newConfig) => {
        CONFIG = newConfig;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG));
        console.log('⚙️ Config Updated');
    });
});

client.on('qr', async (qr) => {
    try {
        const url = await qrcode.toDataURL(qr);
        io.emit('qr', url);
        console.log('📤 QR Sent');
    } catch (err) {
        console.error('QR Error', err);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp Ready');
    io.emit('ready');
});

client.initialize();

// 3. FORCE BINDING TO 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
