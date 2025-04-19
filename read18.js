var SerialPort = require("serialport");

const port = new SerialPort("/dev/serial0", {
  baudRate: 115200,
});
let buffer = "";
let priceDot = 2;
port.on("open", () => {
  console.log("Port açıldı");
});

port.on("data", (data) => {
  buffer += data.toString();
  while (buffer.includes("START18") && buffer.includes("END18")) {
    try {
      const startIdx = buffer.indexOf("START18");
      const endIdx = buffer.indexOf("END18") + 7;
      const message = buffer.substring(startIdx, endIdx);
      buffer = "";
      let content = message.replace("START18:", "").replace(":END18", "");
      content = content.replaceAll("F", "0");
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
        throw new Error("Price-data receivedData is empty");
      }
      let priceDot2 = receivedData[2];
      priceDot2 = priceDot2.toString();
      let isAlert;

      if (priceDot2.length == 1) {
        isAlert = false;
        priceDot = priceDot2;
      } else {
        isAlert = true;
        priceDot = priceDot2[1];
      }

      let twoDots = receivedData[3];
      twoDots = twoDots.toString();
      const volumeDot = twoDots[0];
      const amountDot = twoDots[1];
      const bcdAmount = receivedData.slice(6, 10);
      const bcdVolume = receivedData.slice(11, 14);
      const bcdUprice = receivedData.slice(15, 18);

      const settingsCurrency = receivedData[4];
      const settingsFormationType = receivedData[5];
      const settingsVolumeUnit = receivedData[10];
      //   console.log("content", content);
      //   console.log("bcdAmount", bcdAmount);
      let amount = bcdToInt(bcdAmount);
      console.log("amount", amount);
      if (amount.length == 6) {
        console.log("bcdAmount", bcdAmount);
        console.log("amount", amount);
      }
      amount = formatPrice(amount, amountDot);
      //   console.log("amount2", amount);
      let volume = bcdToInt(bcdVolume);
      volume = formatPrice(volume, volumeDot);
      const uprice = bcdToInt(bcdUprice);
      const formattedPrice = formatPrice(uprice, priceDot);

      const sendData = {
        amount: amount,
        volume: volume,
        price: formattedPrice,
        isAlert: isAlert,
        settingsCurrency: settingsCurrency,
        settingsFormationType: settingsFormationType,
        settingsVolumeUnit: settingsVolumeUnit,
      };
      //   console.log("price-data", sendData);
    } catch (err) {
      console.log("price-data error:", err);
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
