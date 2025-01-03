//after /addhomework success message
socket.emit('publishListToAllClients');

//HAList updt
socket.on('updtHAList', (data) => {

})