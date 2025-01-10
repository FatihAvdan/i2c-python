const { contextBridge, ipcRenderer } = require("electron");

// Ana süreçle iletişim için güvenli bir API sunuyoruz
contextBridge.exposeInMainWorld("electron", {
  startSerialPort: () => ipcRenderer.send("start-serial"), // Seri portu başlat
  onSerialData: (callback) => ipcRenderer.on("serial-data", callback), // Veri geldiğinde callback çalıştır
});
