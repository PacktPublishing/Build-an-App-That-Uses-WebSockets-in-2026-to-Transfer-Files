let usernameSubmitButton = document.getElementById("username_submit");
let usernameInput = document.getElementById("username");
let usernameForm = document.getElementById("username_form");
let fileTransferWrapper = document.getElementById("file_transfer_wrapper");
let receiverSelect = document.getElementById("receiver_id");
let fileUploadInput = document.getElementById("file_upload_input");
let fileSelectionStatus = document.getElementById("file_selection_status");
let sendFileButton = document.getElementById("send_file_button");
let stopFileButton = document.getElementById("abort_file_button");
let sendProgressBar = document.getElementById("send_progress");
let receiveProgressBar = document.getElementById("receive_progress");
let downloadLink = document.getElementById("download_link");
let stats = document.getElementById("stats");

export const DOM = {
    usernameSubmitButton, 
    usernameInput,
    usernameForm,
    fileTransferWrapper,
    receiverSelect,
    fileUploadInput,
    fileSelectionStatus,
    sendFileButton,
    stopFileButton,
    sendProgressBar,
    receiveProgressBar, 
    downloadLink,
    stats
}