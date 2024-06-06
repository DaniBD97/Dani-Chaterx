import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

const formularioEstiloLogin = document.querySelector("#login");
const form = document.getElementById('form');
const logeo = document.getElementById('formLogin');
const logout = document.getElementById('Logout');
const formLogin = document.getElementById('login');
const containerUser = document.getElementById('infoUser-Container');
const btnRegisterUser = document.getElementById('registerUser');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const infoUsers = document.getElementById('infoUsers');
const user = document.getElementById('inputUser');
const rooms = document.getElementById('inputRoom');
const chat = document.getElementById('chat');

chat.style.display = "none";
logout.style.display = "none";
containerUser.style.display = "none";

const socket = io({
    auth: {
        serverOffset: 0
    }
});

let usuariosEnLinea = [];

socket.on("login", () => {
    const nuevoUsuario = user.value.trim();
    const salaElegida = rooms.value.trim();

    usuariosEnLinea.push({ nombre: nuevoUsuario, sala: salaElegida });

    alert("!Bienvenido Usuario " + nuevoUsuario + " Respeta, " + " Elegiste la Sala " + salaElegida);

    containerUser.style.display = "Block";
    formLogin.style.display = "none";
    chat.style.display = "Block";
    logout.style.display = "Block";
});

let Linea = [];
socket.on("Active", (data) => {
    const usersArray = Object.values(data);
    console.log(data);
    Linea.push(data.user);
    console.log(usersArray);
    infoUsers.innerHTML = "";

    const usernames = usersArray.map(user => {
        if (user.room === rooms.value) {
            infoUsers.insertAdjacentHTML("beforeend", `<li>${user.user}</li>`);
        }
    });
});

logeo.addEventListener("submit", (e) => {
    e.preventDefault();
    if (user.value.trim() !== "" && rooms.value.trim() !== "") {
        let username = user.value.trim();
        let room = rooms.value.trim();
        socket.emit("register", username, room);
    }
});

socket.on('chat message', (msg, serverOffset, user, room) => {
    const item = `<li>${user}: ${msg}</li>`;
    messages.insertAdjacentHTML('beforeend', item);

    console.log(`Nuevo mensaje en la habitación ${room}: ${user}: ${msg}`);
    socket.auth.serverOffset = serverOffset;

    messages.scrollTop = messages.scrollHeight;
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (input.value) {
        socket.emit('chat message', input.value, user.value, rooms.value);
        input.value = '';
    }
});

logout.addEventListener("submit", (e) => {
    e.preventDefault();
    socket.disconnect();
    window.location.href = '/';
});
