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

app.use(cors({
    origin: "https://time-lesswill.netlify.app",
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: "https://time-lesswill.netlify.app",
        credentials: true
    }
});

const DATA_DIR = "/var/data";
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let CONFIG = {
    contacts: [],
    message: "Good morning!",
    scheduledTime: { hour: 8, minute: 0 }
};

if (fs.existsSync(CONFIG_FILE)) {
    CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE));
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(DATA_DIR, "auth")
    }),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox"],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium"
    }
});

io.on("connection", socket => {
    socket.emit("config", CONFIG);

    socket.on("updateConfig", cfg => {
        const istH = cfg.scheduledTime.hour;
        const istM = cfg.scheduledTime.minute;

        let utcH = istH - 5;
        let utcM = istM - 30;

        if (utcM < 0) { utcM += 60; utcH--; }
        if (utcH < 0) utcH += 24;

        CONFIG = {
            ...cfg,
            utcScheduledTime: { hour: utcH, minute: utcM }
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
        console.log("Config updated");
    });
});

client.on("qr", async qr => {
    io.emit("qr", await qrcode.toDataURL(qr));
});

client.on("ready", () => {
    io.emit("ready");
    console.log("WhatsApp Ready");
});

client.initialize();

server.listen(PORT, "0.0.0.0", () =>
    console.log("Server running on", PORT)
);
