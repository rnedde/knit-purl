const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });


let sharedBinaryMessage = '';
let sharedColors = []; // Array of [r, g, b] values, one per stitch

// Optional: fixed palette of 4 colors
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

wss.on('connection', (ws) => {
  const clientColor = getNextColor();
  ws.clientColor = clientColor;

  // Send assigned color
  ws.send(JSON.stringify({ type: 'assignColor', data: clientColor }));

  // Send current full message and full color history
  ws.send(JSON.stringify({
    type: 'fullMessage',
    data: sharedBinaryMessage,
    colors: sharedColors
  }));

  ws.on('message', (message) => {
    const msg = JSON.parse(message);

    if (msg.type === 'append') {
      sharedBinaryMessage += msg.data;

      // Push this client's color once per bit
      for (let i = 0; i < msg.data.length; i++) {
        sharedColors.push(ws.clientColor);
      }

      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'append',
            data: msg.data,
            color: ws.clientColor
          }));
        }
      });
    }
  });
});

console.log('WebSocket server running on ws://localhost:8080');
