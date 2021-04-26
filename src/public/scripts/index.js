const roomForm = document.getElementById("roomForm");
const roomElement = document.getElementById("room");

roomForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if(roomElement.value.trim().length > 0) {
        location.replace(`/${roomElement.value}`);
    }
});