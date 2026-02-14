const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

// ✅ Favicon handler to stop 404 spam
app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
});


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
    transports: ["polling", "websocket"], // ← CRITICAL
    allowEIO3: true
});


const DATA_DIR = "/var/data";
const AUTH_DIR = path.join(DATA_DIR, "auth");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* 🔥 REMOVE ALL CHROMIUM LOCK FILES */
function cleanLocks(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.lstatSync(p).isDirectory()) cleanLocks(p);
        else if (f.toLowerCase().includes("lock") || f.includes("Singleton") || f.includes("journal")) {
            try { fs.unlinkSync(p); } catch { }
        }
    }
}
cleanLocks(AUTH_DIR);

let CONFIG = {
    contacts: [],
    message: "Good morning",
    scheduledTime: { hour: 8, minute: 0 }
};

if (fs.existsSync(CONFIG_FILE)) {
    CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE));
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: AUTH_DIR,
        clientId: "main"
    }),
    puppeteer: {
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--single-process"
        ]
    }
});

const sendMessages = async () => {
    if (!client.info || !CONFIG.contacts || CONFIG.contacts.length === 0) {
        io.emit("log", { type: "error", msg: "Broadcast failed: Client not ready or no contacts." });
        return;
    }

    io.emit("log", { type: "info", msg: `Starting broadcast to ${CONFIG.contacts.length} contacts...` });

    for (const contact of CONFIG.contacts) {
        try {
            await client.sendMessage(contact, CONFIG.message);
            io.emit("log", { type: "success", msg: `✅ Sent to ${contact}` });
        } catch (err) {
            io.emit("log", { type: "error", msg: `❌ Failed for ${contact}: ${err.message}` });
        }
    }
    io.emit("log", { type: "info", msg: "Broadcast complete." });
};

let lastSentDay = null;

setInterval(() => {
    if (!CONFIG.utcScheduledTime) return;

    const now = new Date();
    const currentH = now.getUTCHours();
    const currentM = now.getUTCMinutes();
    const currentDay = now.getUTCDate();

    if (currentH === CONFIG.utcScheduledTime.hour &&
        currentM === CONFIG.utcScheduledTime.minute &&
        lastSentDay !== currentDay) {

        lastSentDay = currentDay;
        sendMessages();
    }
}, 60000);

io.on("connection", socket => {
    socket.emit("config", CONFIG);

    socket.on("updateConfig", cfg => {
        const istH = parseInt(cfg.scheduledTime.hour);
        const istM = parseInt(cfg.scheduledTime.minute);

        let utcH = istH - 5;
        let utcM = istM - 30;
        if (utcM < 0) { utcM += 60; utcH--; }
        if (utcH < 0) utcH += 24;

        CONFIG = { ...cfg, utcScheduledTime: { hour: utcH, minute: utcM } };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
        io.emit("log", { type: "info", msg: `Schedule updated: ${istH}:${istM} IST` });
    });

    socket.on("testSend", () => {
        io.emit("log", { type: "info", msg: "Manual test triggered." });
        sendMessages();
    });
});

client.on("qr", async qr => {
    io.emit("qr", await qrcode.toDataURL(qr));
});

client.on("ready", () => {
    io.emit("ready");
    io.emit("log", { type: "success", msg: "WhatsApp System Ready & Online." });
});

client.initialize();

server.listen(PORT, "0.0.0.0", () => console.log("Server running", PORT));


