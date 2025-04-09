const { ipcRenderer } = require("electron");

// async function checkUSB() {
//   const videoPath = await ipcRenderer.invoke("check-usb");

//   if (videoPath) {
//     document.getElementById("videoSource").src = `file://${videoPath}`;
//     document.getElementById("videoPlayer").load();
//     document.getElementById("videoPlayer").style.display = "block";
//     document.getElementById("ads-img").style.display = "none";
//   }
// }

// // Uygulama açıldığında USB'yi kontrol et
// window.onload = checkUSB;
