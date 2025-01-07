//after /addhomework success message
socket.emit('publishListToAllClients');

//HAList updt
socket.on('updtHAList', (data) => {

})

$('#filter-dropdown').on('click', (ev) => {
    ev.stopPropagation(); 
});

$("#filter-dropdown .dropdown").each(function() {
  $(this).on("mouseenter", function() {
    bootstrap.Dropdown.getOrCreateInstance($(this).find(".dropdown-toggle")).show()
    $("#filter-dropdown .dropdown .dropdown-menu")[0].style.marginLeft = "-5px !important"
  });
  $(this).on("mouseleave", function(ev) {
    bootstrap.Dropdown.getOrCreateInstance($(this).find(".dropdown-toggle")).hide()
  });
});
