let knitColor = [255, 255, 255];
const socket = io(); // Connect to Socket.IO server

socket.on('assignColor', (color) => {
  knitColor = color;
  document.body.style.backgroundColor = `rgb(${knitColor[0]}, ${knitColor[1]}, ${knitColor[2]})`;
});

document.getElementById('messageForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const message = document.getElementById('userInput').value;
  const binary = textToBinary(message);
  socket.emit('append', binary);
  document.getElementById('userInput').value = '';
});

function textToBinary(str) {
  return str.split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}
