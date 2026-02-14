const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CHANGE THIS: Replace with your actual Netlify URL after you deploy it
const io = new Server(server, {
    cors: {
        origin: ["https://time-lesswill.netlify.app/", "http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const CONFIG_FILE = '/var/data/config.json'; // Path for Railway Persistent Disk

let CONFIG = {
    contacts: [],
    message: "Good morning!",
    scheduledTime: { hour: 8, minute: 15 }
};

// Ensure data directory exists
if (!fs.existsSync('/var/data')) { fs.mkdirSync('/var/data', { recursive: true }); }

// Load config
if (fs.existsSync(CONFIG_FILE)) {
    CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/var/data/auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
    const url = await qrcode.toDataURL(qr);
    io.emit('qr', url);
});

client.on('ready', () => {
    console.log('✅ WhatsApp Ready');
    io.emit('ready');
    startScheduler();
});

function startScheduler() {
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === CONFIG.scheduledTime.hour && now.getMinutes() === CONFIG.scheduledTime.minute) {
            for (const contactId of CONFIG.contacts) {
                try { await client.sendMessage(contactId, CONFIG.message); } catch (e) { console.error(e); }
            }
        }
    }, 60000);
}

client.initialize();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Real server listening on port ${PORT}`);
});
