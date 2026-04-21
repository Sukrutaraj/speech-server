const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// 📁 FILVÄG
const filePath = path.join(__dirname, "names.json");

// 🧠 LADDA NAMN
let names = {};

try {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    names = JSON.parse(data);
  }
} catch (err) {
  console.log("Load error:", err);
  names = {};
}

// 📥 GET
app.get("/names", (req, res) => {
  res.json(names);
});

// 📤 POST (säkert spar)
app.post("/names", (req, res) => {
  const { heard, correct } = req.body;

  if (!heard || !correct) {
    return res.status(400).send("Missing data");
  }

  names[heard.toLowerCase()] = correct;

  try {
    fs.writeFileSync(filePath, JSON.stringify(names, null, 2));
    console.log("Saved:", heard);
  } catch (err) {
    console.log("Write error:", err);
  }

  res.send({ success: true });
});

// 🟢 TEST
app.get("/", (req, res) => {
  res.send("Server is running");
});

const server = app.listen(PORT, () => {
  console.log("Server running");
});

// 🔌 WEBSOCKET (din speech del)
const wss = new WebSocket.Server({ server });

wss.on("connection", (client) => {

  const deepgram = new WebSocket(
    "wss://api.deepgram.com/v1/listen?punctuate=false&language=sv",
    {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
      }
    }
  );

  deepgram.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const transcript = data.channel?.alternatives?.[0]?.transcript;

      if (transcript) {
        client.send(transcript);
      }
    } catch {}
  });

  client.on("message", (audio) => {
    if (deepgram.readyState === WebSocket.OPEN) {
      deepgram.send(audio);
    }
  });

  client.on("close", () => {
    deepgram.close();
  });
});
