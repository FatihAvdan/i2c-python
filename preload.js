const { contextBridge, ipcRenderer } = require("electron");

// Ana süreçle iletişim için güvenli bir API sunuyoruz
contextBridge.exposeInMainWorld("electron", {
  startSerialPort: () => ipcRenderer.send("start-serial"), // Seri portu başlat
  onSerialData: (callback) => ipcRenderer.on("serial-data", callback), // Veri geldiğinde callback çalıştır
  onPriceData: (callback) => ipcRenderer.on("price-data", callback), // Veri geldiğinde callback çalıştır
  onFullScreenContainerData: (callback) =>
    ipcRenderer.on("full-screen-container-data", callback), // Veri geldiğinde callback çalıştır
});
