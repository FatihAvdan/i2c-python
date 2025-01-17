const { app, BrowserWindow, ipcMain } = require("electron");
var SerialPort = require("serialport").SerialPort;
const path = require("path");

let win;
let port;

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

  ipcMain.on("start-serial", () => {
    // Seri portu başlatıyoruz
    port = new SerialPort({ path: "COM7", baudRate: 115200 });

    port.on("open", () => {
      console.log("Seri port açıldı: COM7");
    });

    // port.on("data", (data) => {
    //   console.log("Gelen Veri:", data.toString());
    //   const recieved = data.toString().trim();
    //   console.log(recieved.length);
    //   // Web sayfasına veri gönderme
    //   const response = {
    //     data: data.toString(),
    //     type: "price",
    //   };
    //   win.webContents.send("serial-data", response);
    // });
    let buffer = ""; // Gelen veriler için bir arabellek

    port.on("data", (data) => {
      buffer += data.toString(); // Gelen veriyi arabelleğe ekle

      // Veriler tamlandıysa işle
      while (buffer.includes("START18") && buffer.includes("END18")) {
        // console.log("buffer:", buffer);
        const startIdx = buffer.indexOf("START18");
        const endIdx = buffer.indexOf("END18") + 7; // "END18" uzunluğu 6 karakter
        const message = buffer.substring(startIdx, endIdx);
        // console.log("message:", message);
        buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar
        let content = message.replace("START18:", "").replace(":END18", "");
        console.log("content:", content);
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
              // Şimdi, bu sayısal değerin karşılık geldiği hexadecimal değeri alıyoruz
              let hexData = charCode.toString(16); // '61'
              receivedData.push(hexData);
              tempData = []; // Veriyi sıfırla
            }
          } else {
            // / karakteri değilse, veriyi geçici diziye ekle
            tempData.push(byte);
          }
        }
        console.log("receivedData:", receivedData);

        const priceDot = receivedData[2];
        const twoDots = receivedData[3];
        const volumeDot = twoDots[0];
        const amountDot = twoDots[1];
        const bcdAmount = receivedData.slice(6, 10);
        const bcdVolume = receivedData.slice(11, 14);
        const bcdUprice = receivedData.slice(15, 18);

        console.log("priceDot:", priceDot);
        console.log("volumeDot:", volumeDot);
        console.log("bcdAmount:", bcdAmount);
        console.log("bcdVolume:", bcdVolume);
        console.log("bcdUprice:", bcdUprice);

        const amount = bcdToInt(bcdAmount);
        const volume = bcdToInt(bcdVolume);
        const uprice = bcdToInt(bcdUprice);
        const formattedPrice = formatPrice(uprice, priceDot);

        const sendData = {
          amount: amount,
          volume: volume,
          price: formattedPrice,
        };

        // console.log("sendData:", sendData);

        // console.log("18 Byte Veri (Fiyat):", content);
        console.log("serial-data", { data: content, type: "price" });
      }

      while (buffer.includes("START25") && buffer.includes("END25")) {
        const startIdx = buffer.indexOf("START25");
        const endIdx = buffer.indexOf("END25") + 7; // "END25" uzunluğu 6 karakter
        const message = buffer.substring(startIdx, endIdx);
        buffer = buffer.replace(message, ""); // İşlenen kısmı arabellekten çıkar

        const content = message.replace("START25:", "").replace(":END25", "");
        console.log("25 Byte Veri (Durum):", content);
        console.log("serial-data", { data: content, type: "status" });
      }
    });

    port.on("error", (err) => {
      console.error("Seri port hatası:", err);
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
function bcdToInt(bcdList) {
  let result = bcdList.join("");
  result = result.replaceAll("f", "0");
  // console.log("result:", result);
  // console.log("result:", parseInt(result));
  return parseInt(result);
}

function formatPrice(price, priceDot) {
  let priceStr = String(price);
  priceDot = parseInt(priceDot);
  if (priceDot > 0 && priceDot < priceStr.length) {
    priceStr = priceStr.slice(0, -priceDot) + "." + priceStr.slice(-priceDot);
  }
  return priceStr;
}
