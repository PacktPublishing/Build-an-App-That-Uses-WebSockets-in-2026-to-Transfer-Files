// import modules
import * as uiUtils from "./modules/uiUtils.js";

// ######### WebSocket connection setup #########
const wsClientConnection = new WebSocket(`ws://${window.location.host}`);

// handler for incoming websocket messages
wsClientConnection.onmessage = (e) => {
    if(typeof e.data === "string") {
        // text message
        const message = JSON.parse(e.data);
        switch (message.type) {
            case "username_status":
                if(message.success) {
                    uiUtils.DOM.fileTransferWrapper.style.display = "block";
                    uiUtils.DOM.usernameInput.disabled = true; 
                    uiUtils.DOM.usernameSubmitButton.disabled = true; 
                } else {
                    alert(message.serverResponse);
                }
                break;
            case "user_list_update": 
                updateUserList(message.users);
                break;
            default:
                console.warn("unknown message type: ", message.type);
                break;
        }
    }
}

// ######### DOM Event Listeners #########

uiUtils.DOM.usernameForm.addEventListener("submit", (e) => {
    e.preventDefault(); // prevent the page reload
})

uiUtils.DOM.usernameSubmitButton.addEventListener("click", () => {
    console.log("click event fired");
    const username = uiUtils.DOM.usernameInput.value.trim(); 
    if(username === "") {
        alert("Please enter a valid username");
        return; 
    }

    const message = {
        type: "username_check",
        username
    };

    wsClientConnection.send(JSON.stringify(message));

});

// ######### Helper functions #########
function updateUserList(users) {
    // clear current options from the list
    uiUtils.DOM.receiverSelect.innerHTML = `<option value="">Select user</option>`;
    users.forEach( user => {
        if(user !== uiUtils.DOM.usernameInput.value.trim()) {
            const opt = document.createElement("option");
            opt.textContent = user;
            opt.value = user; // we don't strictly have to do this (as we are setting textContent), but its good practice. 
            uiUtils.DOM.receiverSelect.appendChild(opt); // don't forget to append your newely created HTML element to the DOM
        }
    })
};