// WhatsApp Automation Bot with Web UI - Neo Brutalism
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default Configuration
let CONFIG = {
    contacts: ['918220050175@c.us'],
    message: "Good morning! This is your daily scheduled message.",
    scheduledTime: { hour: 8, minute: 15 }
};

// Load persistent config if exists
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        CONFIG = { ...CONFIG, ...savedConfig };
        console.log('✅ Configuration loaded from file');
    } catch (err) {
        console.error('Error loading config file:', err);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
        console.log('💾 Configuration saved to file');
    } catch (err) {
        console.error('Error saving config file:', err);
    }
}

let lastSentDate = null;
let currentQRCode = null;
let isReady = false;

// Create WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Serve UI
app.use(express.static('public'));

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('🔌 UI connected');

    // Send current status/config on connect
    if (currentQRCode && !isReady) {
        socket.emit('qr', currentQRCode);
    }
    if (isReady) {
        socket.emit('ready');
    }

    socket.emit('config', CONFIG);

    // Handle config updates from UI
    socket.on('updateConfig', (newConfig) => {
        CONFIG = newConfig;
        saveConfig();
        console.log('⚙️ Configuration updated from UI');
    });
});

/**
 * Function to send the daily message to specified contacts
 */
async function sendDailyMessages() {
    console.log(`\n[${new Date().toLocaleString()}] 🕒 Sending scheduled daily messages...`);

    if (CONFIG.contacts.length === 0) {
        console.log("⚠️ No contacts specified in CONFIG.");
        return;
    }

    for (const contactId of CONFIG.contacts) {
        try {
            await client.sendMessage(contactId, CONFIG.message);
            console.log(`✅ Message sent to: ${contactId}`);
        } catch (error) {
            console.error(`❌ Failed to send message to ${contactId}:`, error.message);
        }
    }
}

/**
 * Checks if it's time to send the message
 */
function startScheduler() {
    console.log(`🚀 Scheduler active. Targeting ${CONFIG.scheduledTime.hour}:${CONFIG.scheduledTime.minute.toString().padStart(2, '0')} daily.`);

    setInterval(async () => {
        const now = new Date();
        const currentDate = now.toDateString();

        if (now.getHours() === CONFIG.scheduledTime.hour &&
            now.getMinutes() === CONFIG.scheduledTime.minute) {

            if (lastSentDate !== currentDate) {
                lastSentDate = currentDate;
                await sendDailyMessages();
            }
        }
    }, 30000);
}

// WhatsApp Events
client.on('qr', async (qr) => {
    console.log('QR Code received!');
    qrcodeTerminal.generate(qr, { small: true });

    // Generate data URL for the UI
    try {
        currentQRCode = await QRCode.toDataURL(qr);
        io.emit('qr', currentQRCode);
    } catch (err) {
        console.error('QR Generation Error:', err);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp Client is Ready');
    isReady = true;
    io.emit('ready');

    if (client.pupPage) {
        client.pupPage.evaluate(() => {
            if (window.WWebJS && window.WWebJS.sendSeen) {
                window.WWebJS.sendSeen = async () => { };
            }
        }).catch(() => { });
    }

    startScheduler();
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    io.emit('disconnected');
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was logged out:', reason);
    isReady = false;
    currentQRCode = null;
    io.emit('disconnected');
});

// Start Server and WhatsApp
server.listen(PORT, () => {
    console.log(`\n-----------------------------------------`);
    console.log(`🌐 UI available at: http://localhost:${PORT}`);
    console.log(`-----------------------------------------\n`);
});

console.log('🚀 Initializing WhatsApp Automation...');
client.initialize();