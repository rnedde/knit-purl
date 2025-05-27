const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let stitchArray = [];

function addMessage(text) {
  for (let i = 0; i < text.length; i++) {
    let charBinary = text.charCodeAt(i).toString(2).padStart(8, '0');
    for (let bit of charBinary) {
      stitchArray.push(bit === '0' ? 'k' : 'p');
    }
  }
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send current stitchArray to new client
  ws.send(JSON.stringify({ type: 'init', data: stitchArray }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'newMessage' && typeof msg.data === 'string') {
        addMessage(msg.data);

        // Broadcast updated stitchArray to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update', data: stitchArray }));
          }
        });
      }
    } catch (e) {
      console.error('Error parsing message', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:8080');
