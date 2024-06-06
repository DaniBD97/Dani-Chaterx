import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

import { Server } from 'socket.io'
import { createServer } from 'node:http'
import { log } from 'node:console'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config()
const port = process.env.PORT ?? 3000

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const server = createServer(app)



const io = new Server(server, {
    connectionStateRecovery: {}
})

const db = createClient({
    url: "libsql://lucky-howard-danibd97.turso.io",
    authToken: process.env.DB_TOKEN
})

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        user TEXT,
        room TEXT
    )
`)

const globalData = {};
io.on('connection', async (socket) => {

    socket.on("register", (user, room) => {
        socket.user = user.trim();
        socket.room = room.trim();
        socket.join(socket.room);
        console.log(socket.room);
    
        // Emitir la lista actualizada de usuarios antes de agregar el nuevo usuario
        io.emit('Active', globalData);
    
        // Agregar el nuevo usuario a globalData
        globalData[socket.id] = {
            user: socket.user,
            room: socket.room
        };
    
        // Emitir la lista actualizada de usuarios después de agregar el nuevo usuario
        io.emit('Active', globalData);
    
        socket.emit("login");
        console.log('user Connected!');
    
        recoverMessages(socket);
    });

    // console.log(globalData);
    // io.emit('Active', globalData);
    socket.on('disconnect', () => {
        // Elimina al usuario desconectado de globalData
        delete globalData[socket.id];
    
        // Emite la lista actualizada de usuarios conectados a todos los clientes
        io.emit('Active', globalData);
    
        console.log('User Disconnected');
    });



    //Escuchamos los mensajes
    socket.on('chat message', async (msg, user, room) => {
        let result;

        const { user: username, room: roomName } = globalData[socket.id] ?? { user: 'anonimo', room: 'Invitados' };
    

        // const username = socket.user ?? 'anonimo';
        // const roomName = socket.room ?? 'Invitados';
        // console.log(username);
        // console.log(roomName);
        try {
            // Si user es null, asigna 'anonimo'


            result = await db.execute({
                sql: 'INSERT INTO messages (content, user, room) VALUES (:msg, :user, :room)',
                args: { msg, user: username, room: roomName }
            });
        } catch (e) {
            console.log(e);
            return;
        }

        io.to(roomName).emit('chat message', msg, result.lastInsertRowid.toString(), user, room);
       
    });

    //Esta bloque function asyncrono toma como parametro el socket
    //habia un problema que siempre en el bloque if llegaban los datos como null
    //ahora creando esta funcion y pasandosela al registro alamacenamos los mensajes de forma global para su uso
    async function recoverMessages(socket) {
        if (!socket.recovered) {
            try {
                const { room: roomName } = globalData[socket.id] ?? { room: 'General' };
                console.log(roomName);
                const results = await db.execute({
                    sql: 'SELECT id, content, user, room FROM messages WHERE room = :room',
                    args: { room: roomName }
                });
    
                // Verificar si el usuario está en la sala antes de emitir el mensaje
                results.rows.forEach(row => {
                    socket.emit('chat message', row.content, row.id.toString(), row.user, row.room);
                    
                });
    
                // Marcar como recuperado después de emitir los mensajes
                socket.recovered = true;
            } catch (e) {
                console.error('Error al ejecutar la consulta:', e);
                // Manejar el error de alguna manera
            }
        }
    }


})
//instanciamos morgan framework nos da informacion en consola de Las transacciones del Servidors GET y  POST
app.use(logger('dev'))

app.use('/css', express.static(join(__dirname, 'client', 'css')));
app.use('/js', express.static(join(__dirname, 'client', 'js')));
app.use('/html', express.static(join(__dirname, 'client', 'html')));
//donde se inicializa
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'client', 'html', 'index.html'));
});

//Escucha del puerto
server.listen(port, () => {
    console.log(`Server Running Port ${port}`)
})