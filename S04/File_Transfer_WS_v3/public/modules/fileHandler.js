// import modules
import * as uiUtils from "./uiUtils.js";

// global flags and variables
let abortSend = false; 

export async function sendFile(ws, file, receiverUsername) {
    // function-scoped variable declaration
    let offset = 0; // the offset for keeping track of our progress element

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

    // step 2: send the file chunks using the Streams API
    const stream = file.stream(); // creates a ReadableStream (pipe), At this point, there is no reading. 
    const reader = stream.getReader(); // the file is LOCKED for reading. But still, no reading at this point. 
    try {
        while(true) {
    
            if(abortSend) {
                console.warn("File sending has been aborted by the user");
                abortSend = false; 
                break; 
            }

            // deal with large send queues (bufferedAmount)
            while(ws.bufferedAmount > MAX_BUFFERED_AMOUNT && ws.readyState === ws.OPEN) {
                console.warn(`bufferedAmount high: ${ws.bufferedAmount} bytes, pausing ⌛⌛⌛...`);
                // await new Promise(r => setTimeout(r, 10));
                await new Promise( (resolve, reject) => {
                    setTimeout(resolve, 10);
                })
            }

            // at this point, we can read the next chunk    
            const { done, value } = await reader.read(); 

            if (done) {
                // final message display
                uiUtils.DOM.stats.textContent = "File has been sent";
                uiUtils.DOM.stats.classList.add("success-glow");
                break; 
            }; 
            // use the "value" for each chunk
            // console.log("This is what the value object looks like: ", value); if you like, you can view the value object yourself (for fun)
            console.log("size of chunk (in bytes) from the Streams API is: ", value.byteLength);
            ws.send(value);
            offset += value.byteLength; 
            uiUtils.DOM.sendProgressBar.value = offset;
        }
    } catch (error) {
        console.warn("A problem occurred reading the file using the Streams API")
    } finally {
        reader.releaseLock();
    }
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
