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
  while (buffer.includes("START21") && buffer.includes("END21")) {
    try {
      const startIdx = buffer.indexOf("START21");
      const endIdx = buffer.indexOf("END21") + 7;
      const message = buffer.substring(startIdx, endIdx);
      buffer = "";
      let content = message.replace("START21:", "").replace(":END21", "");
      let receivedData = [];
      let tempData = [];
      for (let i = 0; i < content.length; i++) {
        const byte = content[i];
        if (byte === "/") {
          if (tempData.length > 0) {
            let stringTempData = tempData.join("");
            let charCode = parseInt(stringTempData, 10);
            if (isNaN(charCode)) {
              charCode = 0;
            }
            // let hexData = charCode.toString(16); // '61'
            receivedData.push(charCode);
            tempData = [];
          }
        } else {
          tempData.push(byte);
        }
      }
      if (receivedData.length == 0) {
        errorCounter++;
        throw new Error("Nozzle-data receivedData is empty");
      }
      let checkFirst0x21 = receivedData[0];
      let responseData;
      let firstNozzlePrice = receivedData.slice(1, 4);
      let secondNozzlePrice = receivedData.slice(4, 7);
      let thirdNozzlePrice = receivedData.slice(7, 10);
      let fourthNozzlePrice = receivedData.slice(10, 13);
      let firstProductType = receivedData[13];
      let secondProductType = receivedData[14];
      let thirdProductType = receivedData[15];
      let fourthProductType = receivedData[16];
      let firstNozzleStatus = receivedData[17];
      let secondNozzleStatus = receivedData[18];
      let thirdNozzleStatus = receivedData[19];
      let fourthNozzleStatus = receivedData[20];
      firstNozzlePrice = bcdToInt(firstNozzlePrice);
      secondNozzlePrice = bcdToInt(secondNozzlePrice);
      thirdNozzlePrice = bcdToInt(thirdNozzlePrice);
      fourthNozzlePrice = bcdToInt(fourthNozzlePrice);
      responseData = {
        firstNozzlePrice: formatPrice(firstNozzlePrice, priceDot),
        secondNozzlePrice: formatPrice(secondNozzlePrice, priceDot),
        thirdNozzlePrice: formatPrice(thirdNozzlePrice, priceDot),
        fourthNozzlePrice: formatPrice(fourthNozzlePrice, priceDot),
        firstProductType: firstProductType,
        secondProductType: secondProductType,
        thirdProductType: thirdProductType,
        fourthProductType: fourthProductType,
        firstNozzleStatus: firstNozzleStatus,
        secondNozzleStatus: secondNozzleStatus,
        thirdNozzleStatus: thirdNozzleStatus,
        fourthNozzleStatus: fourthNozzleStatus,
      };
      sendToRenderer("nozzle-data", responseData);
    } catch (err) {
      console.log("nozzle-data error:", err);
    }
  }
});
function bcdToInt(bcdList) {
  let result = bcdList;
  for (let i = 0; i < result.length; i++) {
    if (result[i].length == 1) {
      result[i] = "F" + result[i];
    }
  }
  result = result.join("");
  result = result.replaceAll("F", "0");
  if (result.length == 1) {
    result = "0" + result;
  }
  return result;
}
function formatPrice(price, priceDot) {
  let priceStr = String(price);
  priceDot = parseInt(priceDot);
  if (priceDot > 0 && priceDot < priceStr.length) {
    priceStr = priceStr.slice(0, -priceDot) + "." + priceStr.slice(-priceDot);
  }
  return priceStr;
}
