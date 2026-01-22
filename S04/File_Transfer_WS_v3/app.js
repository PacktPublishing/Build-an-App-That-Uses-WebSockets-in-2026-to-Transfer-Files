import http, { request } from "http";
import express from "express";
import { WebSocketServer } from "ws";

const app = express(); 
const users = new Map(); // every Map has key -> value entries. Our entries will be: username -> ws connection

app.use(express.static("public"));

// create a HTTP server from the express app
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

// Create a websocket server, and mount it on top of the http server
const wss = new WebSocketServer( {server} );

wss.on("connection", (ws) => {
    // Mark connection as alive for ping-pong health checks
    ws.isAlive = true; 
    // listener for pong responses (keepalive purposes)
    ws.on("pong", () => {
        ws.isAlive = true;
    })
    // handle incoming messages on this websocket connection
    ws.on("message", (message, isBinary) => {
        if(!isBinary)  {
            const parsed = JSON.parse(message);
            switch (parsed.type) {
                case "username_check":
                    // requested username from the client
                    const requestedUsername = parsed.username;
                    if(users.has(requestedUsername)) {
                        const message = {
                            type: "username_status", 
                            success: false,
                            serverResponse: 'Username already taken'
                        }; 
                        ws.send(JSON.stringify(message));
                    } else {
                        // assign th eusername and store the connection info
                        users.set(requestedUsername, ws);
                        ws.username = requestedUsername;
                        const message = {
                            type: "username_status", 
                            success: true
                        }; 
                        ws.send(JSON.stringify(message));
                        // broadcast to all connected users the new user so that the client can update the selection list
                        broadcastUserList();
                    }
                    break;
                case 'file_meta':
                    // forward the metadata to the receiver, if their websocket connection is open
                    const receiverSocket = users.get(parsed.receiver); // return the ws connection for the receiver
                    // store the intended receiver's username on this senders ws object
                    ws.fileTransferReceiver = parsed.receiver; 
                    if(receiverSocket && receiverSocket.readyState === receiverSocket.OPEN) {
                        receiverSocket.send(message.toString());
                    }
                    break;
                default:
                    console.log("could not find a valid message.type property");
                    break;
            }
        } else {
            // binary data received, treat as file chunk
            if(ws.fileTransferReceiver) {

                // get the receivers ws connection object
                const receiversSocket = users.get(ws.fileTransferReceiver);
                if(receiversSocket && receiversSocket.readyState === receiversSocket.OPEN) {
                    // relay the file chunks to the receiver
                    receiversSocket.send(message);
                } else {
                    console.error(`Receivers socket does not exist for ${ws.fileTransferReceiver}, or its not open`);
                }
            } else {
                console.error("No fileTransferReceiver set on the ws object, so cannot relay file data");
            }
        }
    });

    ws.on("close", () => {
        if(ws.username) {
            users.delete(ws.username);
            broadcastUserList();
        }
    });

});

// Broadcast updated user list to all connected clients
function broadcastUserList() {
    // get the usernames as an array
    const allUsers = Array.from(users.keys()); // ['alice', 'bob', 'wally']
    const message = JSON.stringify({type: "user_list_update",users: allUsers});
    users.forEach((ws, key) => {
        if(ws.readyState === ws.OPEN) {
            ws.send(message);
        }
    })
}   

// basic ping/pong mechanism to keep the ws connetion alive
setInterval(() => {
    wss.clients.forEach( (ws)=> {
        if(!ws.isAlive) return ws.terminate(); 
        ws.isAlive = false; // set isAlive to false, because you are about to send a new ping.
        ws.ping(); // The client is expected to respond with a pong, and in the pong handler the isAlive will be set back to true
    })
}, 30000); // run every 30 seconds

// spin up our HTTP server
server.listen(PORT, ()=> {
    console.log(`Server listening on port ${PORT}`);
})


