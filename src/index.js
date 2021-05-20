const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const Filter = require('bad-words')

const app = express()
const server = http.createServer(app)
const io = socketio(server)


const port = process.env.port || 3000
const publicDirectory = path.join(__dirname, '../public')

app.use(express.static(publicDirectory))

let welcomeMessage = 'Welcome!'

io.on('connection', (socket) => {
    console.log('new web socket');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', welcomeMessage))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (data, callback) => {
        // const filter = new Filter()
        // if (filter.isProfane(data)) {
        //     return callback('profanity is not allowed')
        // }
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, data))
        callback('message delivered')
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

})
server.listen(port, () => {
    console.log(`server is up in ${port}`);
})