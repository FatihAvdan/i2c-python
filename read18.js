var SerialPort = require("serialport");

const port = new SerialPort("/dev/serial0", {
  baudRate: 115200,
});
let buffer = "";
port.on("open", () => {
  console.log("Port açıldı");
});

port.on("data", (data) => {
  buffer += data.toString();
  console.log(buffer);
  while (buffer.includes("START26") && buffer.includes("END26")) {
    try {
      const startIdx = buffer.indexOf("START26");
      const endIdx = buffer.indexOf("END26") + 7;
      const message = buffer.substring(startIdx, endIdx);
      buffer = "";
      let content = message.replace("START26:", "").replace(":END26", "");
      content = content.slice(3, -1);
      if (content[content.length - 1] == "/") {
        content = content.slice(0, -1);
      }
      let receivedData = [];
      let tempData = [];
      for (let i = 0; i < content.length; i++) {
        const byte = content[i];
        if (byte === "/") {
          if (tempData.length > 0) {
            let stringTempData = tempData.join("");
            // hex to charcode
            let charCode = parseInt(stringTempData, 16);
            let asciiData = String.fromCharCode(charCode);
            if (receivedData.length < 25) {
              receivedData.push(asciiData);
            }
            tempData = [];
          }
        } else {
          tempData.push(byte);
        }
      }
      if (receivedData.length == 0) {
        throw new Error("Message-data receivedData is empty");
      }
      // receivedData = receivedData.slice(1, -1);
      let messageData = receivedData.join("");
      console.log(messageData);
    } catch (err) {
      console.log("message-data error:", err);
    }
  }
});
