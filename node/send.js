module.exports = {
    to_self: function(socket, action, data){
        socket.emit(action, data);
    },
    to_others: function(socket, action, data){
        socket.broadcast.emit(action, data);
    },
    to_room: function(socket, action, data){
        if(socket.room){
            console.log(action, socket.room, socket.id);
         
            if(socket.room){
                socket.broadcast.in(socket.room).emit(action, data);
            }
        }
    },
    to_a_room: function(socket, room, action, data){
        if(room){
            socket.broadcast.in(room).emit(action, data);
        }
    }
};