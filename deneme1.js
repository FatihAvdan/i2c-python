let buffer =
  "START26:11/20/20/20/20/20/20/20/20/20/20/41/4B/4F/52/44/20/20/20/20/20/20/20/20/20/20/20/20/:END26";

const startIdx = buffer.indexOf("START26");
const endIdx = buffer.indexOf("END26") + 7; // "END26" uzunluğu 6 karakter
const message = buffer.substring(startIdx, endIdx);
console.log("message:", message);
buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar
let content = message.replace("START26:", "").replace(":END26", "");
content = content.slice(1, -1);
console.log("content:", content);
let receivedData = [];
let tempData = [];
console.log("content:", content);
for (let i = 0; i < content.length; i++) {
  const byte = content[i];
  if (byte === "/") {
    if (tempData.length > 0) {
      let stringTempData = tempData.join("");
      // hex to charcode
      let charCode = parseInt(stringTempData, 16);
      let asciiData = String.fromCharCode(charCode);
      console.log("asciiData:", asciiData);
      receivedData.push(asciiData);
      tempData = []; // Veriyi sıfırla
    }
  } else {
    // / karakteri değilse, veriyi geçici diziye ekle
    tempData.push(byte);
  }
}
receivedData = receivedData.slice(1, -1);
let messageData = receivedData.join("");
console.log("messageData:", messageData);
