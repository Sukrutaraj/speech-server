const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Server is running");
});

const server = app.listen(PORT, () => {
  console.log("Server running");
});

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
