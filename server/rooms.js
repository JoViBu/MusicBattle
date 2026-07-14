const rooms = {};

function generateRoomCode() {

    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {

        code = "";

        for (let i = 0; i < 4; i++) {

            code += letters[Math.floor(Math.random() * letters.length)];

        }

    } while (rooms[code]);

    return code;

}

function createRoom(playerName, socket) {

    const code = generateRoomCode();

    rooms[code] = {

        code,

        players: [

            {

                name: playerName,

                socket

            }

        ]

    };

    return code;

}

function joinRoom(code, playerName, socket) {

    const room = rooms[code];

    if (!room) {

        return {

            success: false,

            message: "La sala no existeix."

        };

    }

    if (room.players.length >= 2) {

        return {

            success: false,

            message: "La sala està plena."

        };

    }

    room.players.push({

        name: playerName,

        socket

    });

    return {

        success: true,

        room

    };

}

module.exports = {

    createRoom,

    joinRoom

};