//after /addhomework success message
socket.emit('publishListToAllClients');

//HAList updt
socket.on('updtHAList', (data) => {

})

$("#filter-toggle").on('click', () => {
  $("#filter-content").toggleClass("d-none");
});

$(".dropdown-menu").each(function() {
  $(this).on('click', (ev) => {
    ev.stopPropagation(); 
  });
});
