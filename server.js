// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));


let sharedBinaryMessage = '';
let sharedColors = [];

const palette = [
  [255, 150, 200],
  [150, 200, 255],
  [200, 255, 150],
  [255, 220, 150]
];

let clientCount = 0;

function getNextColor() {
  const color = palette[clientCount % palette.length];
  clientCount++;
  return color;
}

io.on('connection', (socket) => {
  const clientColor = getNextColor();
  socket.clientColor = clientColor;

  // Send assigned color to the client
  socket.emit('assignColor', clientColor);

  // Send full current state (message + colors)
  socket.emit('fullMessage', {
    data: sharedBinaryMessage,
    colors: sharedColors
  });

  socket.on('append', (binaryData) => {
    // Append new data
    sharedBinaryMessage += binaryData;

    // For each bit added, assign client's color
    for (let i = 0; i < binaryData.length; i++) {
      sharedColors.push(clientColor);
    }

    // Broadcast to all clients (including sender)
    io.emit('append', {
      data: binaryData,
      color: clientColor
    });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});
