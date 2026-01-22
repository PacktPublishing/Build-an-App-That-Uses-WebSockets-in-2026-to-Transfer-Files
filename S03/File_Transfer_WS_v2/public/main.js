// import modules
import * as uiUtils from "./modules/uiUtils.js";
import * as fileHandler from "./modules/fileHandler.js";

// ######### Global variables #########
let file; 

// ######### WebSocket connection setup #########
const wsClientConnection = new WebSocket(`ws://${window.location.host}`);
wsClientConnection.binaryType = "arraybuffer"; // by default, its "blob"

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
            case "file_meta": 
                fileHandler.handleIncomingFileMetadata(message);
                break;
            default:
                console.warn("unknown message type: ", message.type);
                break;
        }
    } else {
        // binary chunk of data has been received
        fileHandler.handleIncomingFileChunk(e.data);
    }
};

// ######### DOM Event Listeners #########

uiUtils.DOM.usernameForm.addEventListener("submit", (e) => {
    e.preventDefault(); // prevent the page reload
})

uiUtils.DOM.usernameSubmitButton.addEventListener("click", () => {
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

uiUtils.DOM.receiverSelect.addEventListener("change", () => {
    // enable the file input element only if a valid user is selected
    if(uiUtils.DOM.receiverSelect.value !== "") {
        uiUtils.DOM.fileUploadInput.disabled = false; 
    }
})

uiUtils.DOM.fileUploadInput.addEventListener("change", () => {
    file = uiUtils.DOM.fileUploadInput.files[0];
    if(file.size === 0) {
        file = null; 
        uiUtils.DOM.fileSelectionStatus.textContent = "File is empty. Please select a non-empty file";
        return; 
    } else {
        uiUtils.DOM.fileSelectionStatus.textContent = "You have added a file";
        uiUtils.DOM.fileSelectionStatus.style.color = "green";
        uiUtils.DOM.sendFileButton.disabled = false; 

    }
})

uiUtils.DOM.sendFileButton.addEventListener("click", () => {
    // update UI elements
    uiUtils.DOM.sendFileButton.disabled = true; 
    uiUtils.DOM.stopFileButton.disabled = false; 
    // start the websocket sending file process
    const receiverUsername = uiUtils.DOM.receiverSelect.value.trim();
    fileHandler.sendFile(wsClientConnection, file, receiverUsername);
});

uiUtils.DOM.stopFileButton.addEventListener("click", () => {
    fileHandler.abortFileSend(); 
    uiUtils.DOM.stopFileButton.disabled = true; 
    uiUtils.DOM.sendFileButton.disabled = false; 
    uiUtils.DOM.fileSelectionStatus.textContent = "File sending aborted";

})

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