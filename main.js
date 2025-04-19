const { app, BrowserWindow, ipcMain } = require("electron");
var SerialPort = require("serialport");
const path = require("path");
const fs = require("fs");
const drivelist = require("drivelist");
const { execSync } = require("child_process");

const currencyList = require("./currencyList");

let win;
let port;
let retryInterval = null;
const { screen } = require("electron");

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true, // Güvenlik için false
      contextIsolation: false,
    },
    frame: true,
    x: screen.getAllDisplays()[1]?.bounds.x || 0,
    y: screen.getAllDisplays()[1]?.bounds.y || 0,
    fullscreen: true,
  });

  win.loadFile("index.html");
}
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("check-usb", async () => {
    let videoPath;
    // if platform windows
    if (process.platform === "win32") {
      videoPath = await findVideoFile();
    } else {
      videoPath = findLinuxUSB(); // Linux için özel tarama
    }
    return videoPath;
  });

  ipcMain.on("start-serial", () => {
    // Seri portu başlatıyoruz
    startSerialPort();
    // dummySender();
  });

  ipcMain.on("write-serial", (event, data) => {
    console.log("write-serial", data);
    port.write(data, (err) => {
      if (err) {
        console.log("write-serial error", err);
      }
    });
  });
});

const dummySender = () => {
  const volumeDot = 2;
  const amountDot = 2;
  const priceDot = 2;
  const priceData = {
    amount: formatPrice(12345678, amountDot),
    volume: formatPrice("123456", volumeDot),
    price: formatPrice("7654", priceDot),
    isAlert: false,
    settingsCurrency: 3,
    settingsFormationType: 13,
    settingsVolumeUnit: 1,
  };
  console.log("price-data", priceData);
  sendToRenderer("price-data", priceData);

  const messageData = {
    data: "         AKORD           ",
    type: "message",
  };
  sendToRenderer("message-data", messageData);

  const nozzleData = {
    firstNozzlePrice: formatPrice("1234", 2),
    secondNozzlePrice: formatPrice("222222", 2),
    thirdNozzlePrice: formatPrice("333333", 2),
    fourthNozzlePrice: formatPrice("444444", 2),
    firstProductType: 1,
    secondProductType: 4,
    thirdProductType: 1,
    fourthProductType: 10,
    firstNozzleStatus: 0,
    secondNozzleStatus: 0,
    thirdNozzleStatus: 0,
    fourthNozzleStatus: 1,
  };
  sendToRenderer("nozzle-data", nozzleData);
  setTimeout(() => {
    sendToRenderer("full-screen-container-data", {
      visibility: 1,
      texts: {
        turkish: `Bağlantı sağlanıyor...`,
        english: `Connecting...`,
      },
    });
  }, 2000);
  setTimeout(() => {
    sendToRenderer("full-screen-container-data", {
      visibility: 0,
      texts: {
        turkish: `Başarıyla bağlandı.`,
        english: `Successfully connected.`,
      },
    });
  }, 3000);
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
function bcdToInt(bcdList) {
  let result = bcdList;
  for (let i = 0; i < result.length; i++) {
    if (result[i].length == 1) {
      result[i] = "0" + result[i];
    }
  }
  result = result.join("");
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

// Windows & Mac için USB kontrolü
async function findVideoFile() {
  const drives = await drivelist.list();
  for (const drive of drives) {
    if (drive.isUSB) {
      const usbPath = drive.mountpoints[0]?.path;
      if (usbPath) {
        const videoPath = path.join(usbPath, "video.mp4");
        if (fs.existsSync(videoPath)) {
          return videoPath;
        }
      }
    }
  }
  return null;
}

// Linux için özel USB tarama fonksiyonu
function findLinuxUSB() {
  try {
    const videoPath = execSync("find /media -name video.mp4 2>/dev/null", {
      encoding: "utf8",
    }).trim();
    if (videoPath && fs.existsSync(videoPath)) return videoPath;
  } catch (err) {
    console.error("USB bulunamadı:", err.message || err);
  }
  return null;
}

function startSerialPort() {
  if (port && port.isOpen) {
    console.log("Port zaten açık, yeniden başlatmaya gerek yok.");
    sendToRenderer("full-screen-container-data", {
      visibility: 0,
      texts: {
        turkish: `Başarıyla bağlandı.`,
        english: `Successfully connected.`,
      },
    });
    return;
  }
  const portName = "/dev/serial0"; // Bağlantı yapılacak seri port ismi
  // const portName = "COM4"; // Bağlantı yapılacak seri port ismi
  const baudRate = 115200;

  try {
    port = new SerialPort(portName, { baudRate });
    port.on("open", () => {
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }

      sendToRenderer("full-screen-container-data", {
        visibility: 0,
        texts: {
          turkish: `Başarıyla bağlandı.`,
          english: `Successfully connected.`,
        },
      });
    });

    let buffer = "";
    let successCounter = 0;
    let errorCounter = 0;
    let priceDataCounter = 0;
    let messageDataCounter = 0;
    let nozzleDataCounter = 0;
    let initDisplay = false;
    let priceDot;
    port.on("data", (data) => {
      buffer += data.toString(); // Gelen veriyi arabelleğe ekle
      if (0) {
        // console.log("buffer:", buffer);
        console.log("successCounter:", successCounter);
        console.log("errorCounter:", errorCounter);
        console.log("priceDataCounter:", priceDataCounter);
        console.log("messageDataCounter:", messageDataCounter);
        console.log("nozzleDataCounter:", nozzleDataCounter);
      }
      if (
        !initDisplay &&
        nozzleDataCounter > 5 &&
        priceDataCounter > 5 &&
        messageDataCounter > 5
      ) {
        initDisplay = true;
        sendToRenderer("full-screen-container-data", {
          visibility: 0,
          texts: {
            turkish: `Başarıyla bağlandı.`,
            english: `Successfully connected.`,
          },
        });
      }
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
          let bcdAmount = receivedData.slice(6, 10);
          let newBcdAmount = [];
          for (let i = 0; i < bcdAmount.length; i++) {
            let digit = bcdAmount[i].toString();
            if (digit.length == 1) {
              digit = "0" + digit;
            }
            newBcdAmount.push(digit);
          }
          bcdAmount = newBcdAmount;

          let bcdVolume = receivedData.slice(11, 14);
          let newBcdVolume = [];
          for (let i = 0; i < bcdVolume.length; i++) {
            let digit = bcdVolume[i].toString();
            if (digit.length == 1) {
              digit = "0" + digit;
            }
            newBcdVolume.push(digit);
          }
          bcdVolume = newBcdVolume;
          let bcdUprice = receivedData.slice(15, 18);
          let newBcdUprice = [];
          for (let i = 0; i < bcdUprice.length; i++) {
            let digit = bcdUprice[i].toString();
            if (digit.length == 1) {
              digit = "0" + digit;
            }
            newBcdUprice.push(digit);
          }
          bcdUprice = newBcdUprice;
          const settingsCurrency = receivedData[4];
          const settingsFormationType = receivedData[5];
          const settingsVolumeUnit = receivedData[10];
          let amount = bcdToInt(bcdAmount);
          amount = formatPrice(amount, amountDot);
          amount = deleteStartingZeros(amount);
          let volume = bcdToInt(bcdVolume);
          volume = formatPrice(volume, volumeDot);
          volume = deleteStartingZeros(volume);
          const uprice = bcdToInt(bcdUprice);
          let formattedPrice = formatPrice(uprice, priceDot);
          formattedPrice = deleteStartingZeros(formattedPrice);
          const sendData = {
            amount: amount,
            volume: volume,
            price: formattedPrice,
            isAlert: isAlert,
            settingsCurrency: settingsCurrency,
            settingsFormationType: settingsFormationType,
            settingsVolumeUnit: settingsVolumeUnit,
          };
          sendToRenderer("price-data", sendData);
          successCounter++;
          priceDataCounter++;
        } catch (err) {
          console.log("price-data error:", err);
          errorCounter++;
        }
      }

      while (buffer.includes("START26") && buffer.includes("END26")) {
        try {
          const startIdx = buffer.indexOf("START26");
          const endIdx = buffer.indexOf("END26") + 7;
          const message = buffer.substring(startIdx, endIdx);
          buffer = "";
          let content = message.replace("START26:", "").replace(":END26", "");
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
            errorCounter++;
            throw new Error("Message-data receivedData is empty");
          }
          receivedData = receivedData.slice(1, receivedData.length);
          let messageData = receivedData.join("");

          sendToRenderer("message-data", {
            data: messageData,
            type: "message",
          });
          messageDataCounter++;
          successCounter++;
        } catch (err) {
          errorCounter++;
          console.log("message-data error:", err);
        }
      }
      while (buffer.includes("START21") && buffer.includes("END21")) {
        try {
          const startIdx = buffer.indexOf("START21");
          const endIdx = buffer.indexOf("END21") + 7;
          const message = buffer.substring(startIdx, endIdx);
          buffer = "";
          let content = message.replace("START21:", "").replace(":END21", "");
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
            errorCounter++;
            throw new Error("Nozzle-data receivedData is empty");
          }
          console.log("content", content);
          console.log("receivedData", receivedData);
          let responseData;
          let firstNozzlePrice = receivedData.slice(1, 4);
          console.log("firstNozzlePrice1", firstNozzlePrice);
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
          console.log("firstNozzlePrice2", firstNozzlePrice);

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
          // console.log("nozzle-data", responseData);
          sendToRenderer("nozzle-data", responseData);
          successCounter++;
          nozzleDataCounter++;
        } catch (err) {
          errorCounter++;
          console.log("nozzle-data error:", err);
        }
      }
    });

    port.on("error", (err) => {
      if (port && port.isOpen) {
        port.close((closeErr) => {
          console.log("port Kapatılmayı deneiyor", closeErr);
          if (closeErr)
            console.error("Port kapatılırken hata:", closeErr.message);
          port = null;
          console.log("port Kapatıldı");
        });
      }

      if (win)
        sendToRenderer("full-screen-container-data", {
          visibility: 1,
          texts: {
            turkish: `Bağlantı sağlanamadı, yeniden denemeye başlanıyor...`,
            english: `Connection failed, retrying...`,
          },
        });

      if (!retryInterval) {
        retryInterval = setInterval(() => {
          sendToRenderer("full-screen-container-data", {
            visibility: 1,
            texts: {
              turkish: `Bağlantı sağlanamadı, yeniden denemeye başlanıyor...`,
              english: `Connection failed, retrying...`,
            },
          });
          console.log(`port on error`, err);

          startSerialPort();
        }, 5000);
      }
    });
  } catch (err) {
    sendToRenderer("full-screen-container-data", {
      visibility: 1,
      texts: {
        turkish: `Seri port bağlantısı başarısız.`,
        english: `Serial port connection failed.`,
      },
    });
  }
}
function sendToRenderer(channel, data) {
  if (win && win.webContents) {
    win.webContents.send(channel, data);
  } else {
    console.warn(`Render'a mesaj gönderilemedi. Kanal: ${channel}`);
  }
}

function deleteStartingZeros(data) {
  let dataStr = String(data);
  if (dataStr == "0000.00" || dataStr == "000000.00") {
    return "0.00";
  }
  while (dataStr.length > 1 && dataStr[0] === "0") {
    dataStr = dataStr.substring(1);
  }
  return dataStr;
}
