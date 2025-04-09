const { app, BrowserWindow, ipcMain } = require("electron");
var SerialPort = require("serialport");
const path = require("path");
const fs = require("fs");
const drivelist = require("drivelist");

const currencyList = require("./currencyList");

let win;
let port;
let retryInterval = null;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true, // Güvenlik için false
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

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
  });

  ipcMain.on("write-serial", (event, data) => {
    console.log("write-serial", data);
    port.write(data);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
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
    const result = execSync(
      "lsblk -o MOUNTPOINT,RM | grep ' 1' | awk '{print $1}'"
    )
      .toString()
      .trim();
    if (result) {
      const videoPath = path.join(result, "video.mp4");
      if (fs.existsSync(videoPath)) {
        console.log("videoPath:", videoPath);
        return videoPath;
      }
    }
  } catch (err) {
    console.error("USB bulunamadı:", err);
  }
  return null;
}

function startSerialPort() {
  const portName = "/dev/serial0"; // Bağlantı yapılacak seri port ismi
  const baudRate = 115200;

  try {
    // Seri portu başlatıyoruz
    port = new SerialPort(portName, { baudRate });

    // Port açıldığında
    port.on("open", () => {
      // console.log(`Seri port açıldı: ${portName}`);
      // Başarılı bağlantı durumunda arka plandaki denemeyi durdur
      clearInterval(retryInterval);
      if (win)
        win.webContents.send("message-data", {
          data: `Seri port ${portName} başarıyla açıldı.`,
          type: "message",
        });
    });

    let buffer;
    port.on("data", (data) => {
      buffer += data.toString(); // Gelen veriyi arabelleğe ekle
      // console.log("buffer:", buffer);
      // Veriler tamlandıysa işle
      while (buffer.includes("START18") && buffer.includes("END18")) {
        const startIdx = buffer.indexOf("START18");
        const endIdx = buffer.indexOf("END18") + 7; // "END18" uzunluğu 6 karakter
        const message = buffer.substring(startIdx, endIdx);
        buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar
        let content = message.replace("START18:", "").replace(":END18", "");
        let receivedData = [];
        let tempData = []; // Veriyi geçici olarak tutmak için bir dizi
        for (let i = 0; i < content.length; i++) {
          const byte = content[i];
          //   console.log("Byte:", byte);

          if (byte === "/") {
            if (tempData.length > 0) {
              // Veriyi işlemek için geçici diziyi kullan
              //   console.log("tempData:", tempData);
              let stringTempData = tempData.join(""); // "97"

              // "97" bir karakter kodu olduğu için, bunu bir karakter olarak ele alalım
              let charCode = parseInt(stringTempData, 10); // 97, sayısal değeri alıyoruz
              if (isNaN(charCode)) {
                charCode = 0;
              }
              // Şimdi, bu sayısal değerin karşılık geldiği hexadecimal değeri alıyoruz
              // let hexData = charCode.toString(16); // '61'
              receivedData.push(charCode);
              tempData = []; // Veriyi sıfırla
            }
          } else {
            // / karakteri değilse, veriyi geçici diziye ekle
            tempData.push(byte);
          }
        }
        const priceDot2 = receivedData[2];
        let isAlert;
        let priceDot;
        if (priceDot2.length == 1) {
          isAlert = false;
          priceDot = priceDot2;
        } else {
          isAlert = true;
          priceDot = priceDot2[1];
        }

        const twoDots = receivedData[3];
        const volumeDot = twoDots[0];
        const amountDot = twoDots[1];
        const bcdAmount = receivedData.slice(6, 10);
        const bcdVolume = receivedData.slice(11, 14);
        const bcdUprice = receivedData.slice(15, 18);

        const settingsCurrency = receivedData[4];
        const settingsFormationType = receivedData[5];
        const settingsVolumeUnit = receivedData[10];
        // console.log("priceDot:", priceDot);
        // console.log("volumeDot:", volumeDot);
        // console.log("bcdAmount:", bcdAmount);
        // console.log("bcdVolume:", bcdVolume);
        // console.log("bcdUprice:", bcdUprice);

        let amount = bcdToInt(bcdAmount);
        // console.log("amount:", amount);
        amount = formatPrice(amount, amountDot);
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
        console.log("price-data", sendData);
        win.webContents.send("price-data", sendData);
        // console.log("price-data", { data: sendData, type: "price" });
      }

      while (buffer.includes("START26") && buffer.includes("END26")) {
        const startIdx = buffer.indexOf("START26");
        const endIdx = buffer.indexOf("END26") + 7; // "END26" uzunluğu 6 karakter
        const message = buffer.substring(startIdx, endIdx);
        buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar
        let content = message.replace("START26:", "").replace(":END26", "");
        content = content.slice(1, -1);
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
        win.webContents.send("message-data", {
          data: messageData,
          type: "message",
        });
      }
      while (buffer.includes("START21") && buffer.includes("END21")) {
        const startIdx = buffer.indexOf("START21");
        const endIdx = buffer.indexOf("END21") + 7; // "END21" uzunluğu 6 karakter
        const message = buffer.substring(startIdx, endIdx);
        buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar
        let content = message.replace("START21:", "").replace(":END21", "");
        let receivedData = [];
        let tempData = []; // Veriyi geçici olarak tutmak için bir dizi
        for (let i = 0; i < content.length; i++) {
          const byte = content[i];
          //   console.log("Byte:", byte);
          if (byte === "/") {
            if (tempData.length > 0) {
              // Veriyi işlemek için geçici diziyi kullan
              //   console.log("tempData:", tempData);
              let stringTempData = tempData.join(""); // "97"

              let charCode = parseInt(stringTempData, 10); // 97, sayısal değeri alıyoruz
              if (isNaN(charCode)) {
                charCode = 0;
              }
              // Şimdi, bu sayısal değerin karşılık geldiği hexadecimal değeri alıyoruz
              // let hexData = charCode.toString(16); // '61'
              receivedData.push(charCode);
              tempData = []; // Veriyi sıfırla
            }
          } else {
            // / karakteri değilse, veriyi geçici diziye ekle
            tempData.push(byte);
          }
        }

        let checkFirst0x21 = receivedData[0];
        let responseData;
        if (checkFirst0x21 != "33") {
          return;
        }
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
          firstNozzlePrice: firstNozzlePrice,
          secondNozzlePrice: secondNozzlePrice,
          thirdNozzlePrice: thirdNozzlePrice,
          fourthNozzlePrice: fourthNozzlePrice,
          firstProductType: firstProductType,
          secondProductType: secondProductType,
          thirdProductType: thirdProductType,
          fourthProductType: fourthProductType,
          firstNozzleStatus: firstNozzleStatus,
          secondNozzleStatus: secondNozzleStatus,
          thirdNozzleStatus: thirdNozzleStatus,
          fourthNozzleStatus: fourthNozzleStatus,
        };
        console.log("nozzle-data", responseData);
        win.webContents.send("nozzle-data", responseData);
      }
    });

    // Hata durumunda yeniden bağlantı denemek için interval başlat
    port.on("error", (err) => {
      // console.error("Seri port hatası:", err.message);
      if (win)
        win.webContents.send("message-data", {
          data: `Seri port hatası: ${err.message}`,
          type: "message",
        });

      // Yeniden denemek için intervali başlat
      if (!retryInterval) {
        retryInterval = setInterval(() => {
          win.webContents.send("message-data", {
            data: `Bağlantı sağlanamadı, yeniden denemeye başlanıyor...`,
            type: "message",
          });
          // console.log(`Bağlantı sağlanamadı, yeniden denemeye başlanıyor...`);
          startSerialPort(); // Tekrar dene
        }, 5000); // 5 saniyede bir dene
      }
    });
  } catch (err) {
    // console.error("Seri port bağlantısı başarısız:", err);
    if (win)
      win.webContents.send("message-data", {
        data: "Seri port bağlantısı başarısız.",
        type: "message",
      });
  }
}
