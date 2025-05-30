let knitColor = [255, 255, 255];
let socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'assignColor') {
    knitColor = msg.data;
    document.body.style.backgroundColor = `rgb(${knitColor[0]}, ${knitColor[1]}, ${knitColor[2]})`;
  }
});

document.getElementById('messageForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const message = document.getElementById('userInput').value;
  const binary = textToBinary(message);
  socket.send(JSON.stringify({ type: 'append', data: binary }));
  document.getElementById('userInput').value = '';
});

function textToBinary(str) {
  return str.split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}
