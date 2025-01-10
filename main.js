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

    port.on("data", (data) => {
      console.log("Gelen Veri:", data.toString());

      // Web sayfasına veri gönderme
      win.webContents.send("serial-data", data.toString());
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
