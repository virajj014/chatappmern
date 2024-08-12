const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const chats = require('./chats.json');
const app = express();
const bodyParser = require('body-parser');
dotenv.config();
const PORT = process.env.PORT || 5000;
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const mediaUploadRoutes = require('./routes/mediaUploadRoutes');

const cookieParser = require('cookie-parser');
const { updateUserStatus, checkIfUserIsOnline } = require('./utils/userUtils');


require('./db');
require('./models/userModel')
require('./models/verificationModel')
require('./models/chatModel')
require('./models/messageModel')

const allowedOrigins = ['http://localhost:3000']; // Add more origins as needed
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // Allow credentials
    })
);

app.use(bodyParser.json());
app.use(cookieParser());
app.use('/public', express.static('public'));
app.use('/auth', authRoutes)
app.use('/user', userRoutes);
app.use('/media', mediaUploadRoutes);
app.use('/chat', chatRoutes);


app.get('/', (req, res) => {
    res.send('API is running....');
});



const server = app.listen(
    PORT,
    console.log(`Server running on PORT ${PORT}...`)
);

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: 'http://localhost:3000'
    }
});

io.on("connection", (socket) => {
    console.log('a user connected', socket.id);

    // Handle user going online
    socket.on('userOnline', (userId) => {
        updateUserStatus(userId, true);
        // Optionally notify other users that this user is online
        socket.broadcast.emit('userOnlineStatus', { userId, isOnline: true });
    });

    // Handle user going offline
    socket.on('userOffline', (userId) => {
        updateUserStatus(userId, false);
        // Optionally notify other users that this user is offline
        socket.broadcast.emit('userOnlineStatus', { userId, isOnline: false });
    });

    // Handle request for online status of another user
    socket.on("checkUserOnlineStatus", async (otherUserId) => {
        // Fetch the online status from your database or in-memory store
        const isOnline =await checkIfUserIsOnline(otherUserId); // This function should return true or false
        // Send the online status back to the requesting socket

        console.log('check online other user id -',isOnline)
        socket.emit("userOnlineStatus", { userId: otherUserId, isOnline });
    });

    // Handle user joining their own room
    socket.on('joinownuserid', (userId) => {
        socket.join(userId);
        console.log('user joined own room ', userId);
    });

    // Handle user joining a chat room
    socket.on('joinroom', (chatId) => {
        socket.join(chatId);
        console.log('user joined room ', chatId);

        // Tell how many users are in this room
        const userInThisRoom = io.sockets.adapter.rooms.get(chatId)?.size;
        console.log('userInThisRoom', userInThisRoom);
    });

    // Handle user leaving a chat room
    socket.on('leaveroom', (chatId) => {
        socket.leave(chatId);
        console.log('user left room ', chatId);
    });

    // Handle sending a message
    socket.on("messageSend", (messageObj) => {
        console.log('messageSend');
        let roomId = messageObj.chat._id;
        messageObj.chat.users.forEach(element => {
            console.log("message users", element._id);
            socket.to(element._id).emit('refetchcontacts');
        });
        socket.to(roomId).emit("messageReceived", messageObj);
    });

    // Handle typing indicators
    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Update user status as offline (you might need to track which user was associated with the socket)
        // updateUserStatus(userId, false); // You may need to track userId via socket
    });
});
