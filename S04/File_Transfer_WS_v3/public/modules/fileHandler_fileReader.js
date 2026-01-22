// import modules
import * as uiUtils from "./uiUtils.js";

// global flags and variables
let abortSend = false; 

export function sendFile(ws, file, receiverUsername) {
    // function-scoped variable declaration
    let offset = 0; // the offset for chunking
    // let chunkSize = 10 * 1024 * 1024; // 10MB seems reasonable per chunk
    let chunkSize = navigator.connection?.effectiveType === '4g'
        ? 16 * 1024 * 1024 // Fast network connections
        : 10 * 1024 * 1024 // Slow network connections

    const MAX_BUFFERED_AMOUNT = 50 * 1024 * 1024; 

    // initialize the progress element
    uiUtils.DOM.sendProgressBar.max = file.size; 
    uiUtils.DOM.sendProgressBar.value = 0; // this we will change dynamically

    // step 1: send file metadata to the receiver
    const metadata = {
        type: 'file_meta',
        filename: file.name,
        size: file.size, 
        receiver: receiverUsername
    };
    ws.send(JSON.stringify(metadata));

    // step 2: send the file chunks using the FileReader API
    const reader = new FileReader(); // create a reader object. Right now, its doing nothing. 

    reader.addEventListener("load", async (e) => {

        if(abortSend) {
            console.warn("File sending has been aborted by the user");
            reader.abort();
            abortSend = false; 
            return; 
        }

        const chunk = reader.result; 
        console.log("Size of chunk (in bytes) read by the FileReader API: ", chunk.byteLength);
        console.log("bufferedAmount property (send queue): ", ws.bufferedAmount);

        // deal with large send queues (bufferedAmount)
        while(ws.bufferedAmount > MAX_BUFFERED_AMOUNT && ws.readyState === ws.OPEN) {
            console.warn(`bufferedAmount high: ${ws.bufferedAmount} bytes, pausing ⌛⌛⌛...`);
            // await new Promise(r => setTimeout(r, 10));
            await new Promise( (resolve, reject) => {
                setTimeout(resolve, 10);
            })
        }

        // sending the chunk to the ws server
        if(ws.readyState === ws.OPEN) {
            ws.send(chunk); // remember, this chunk is of type "ArrayBuffer"
        } else {
            console.warn("Tried to send on non-open WebSocket connection. State: ", ws.readyState);
            // reader.abort(); 
            return; 
        }

        offset += chunk.byteLength; 
        uiUtils.DOM.sendProgressBar.value = offset; 

        // continue reading next slice if not done
        if(offset < file.size) {
            readSlice();
        }

        // handle logic when file read is complete
        if(offset === file.size) {
            console.log("DONE DONE DONE");
        }
    })

    reader.addEventListener("error", (e) => {
        console.error("An error has occured. Most probably the file is too large: ", e);
    })

    function readSlice() {
        const slice = file.slice(offset, offset + chunkSize); // the slice does return a Blob object
        reader.readAsArrayBuffer(slice);  // this is where we use our reader object, to read file data and return that data in the format of an arrayBuffer
    }

    // start reading the file
    readSlice(); 

};

export function abortFileSend() {
    abortSend = true; 
}

// ######### File Reception Handling #########
let receivedFileMetadata; 
let receivedFileBuffer = [];

export function handleIncomingFileMetadata(metadata) {
    receivedFileMetadata = {
        filename: metadata.filename, 
        size: metadata.size, 
    }
    console.log("File metadata received", receivedFileMetadata);
    uiUtils.DOM.receiveProgressBar.max = receivedFileMetadata.size; 
    uiUtils.DOM.receiveProgressBar.value = 0;  // dynamic
}

export function handleIncomingFileChunk(chunk) {
    receivedFileBuffer.push(chunk);
    uiUtils.DOM.receiveProgressBar.value += chunk.byteLength;

    if(uiUtils.DOM.receiveProgressBar.value === receivedFileMetadata.size) {
        const blob = new Blob(receivedFileBuffer); 
        const url = URL.createObjectURL(blob);
        uiUtils.DOM.downloadLink.href = url; 
        uiUtils.DOM.downloadLink.download = receivedFileMetadata.filename; 
        uiUtils.DOM.downloadLink.textContent = `Download ${receivedFileMetadata.filename}`;
        uiUtils.DOM.downloadLink.style.display = 'inline-block';
        uiUtils.DOM.downloadLink.style.marginTop = '10px';

        // final message display
        uiUtils.DOM.stats.textContent = "File ready for download";
        uiUtils.DOM.stats.classList.add("success-glow");

        // memory clean-up
        receivedFileBuffer = [];
        receivedFileMetadata = null;

        // clearing up Blob memory when the user downloads the file
        uiUtils.DOM.downloadLink.addEventListener("click", () => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 5000);
        })

    }

}
