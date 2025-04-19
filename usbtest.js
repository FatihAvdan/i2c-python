const fs = require("fs");
const path = require("path");
const drivelist = require("drivelist");

async function findVideoFile() {
  const drives = await drivelist.list();
  console.log(drives);
  for (const drive of drives) {
    if (drive.isUSB) {
      const usbPath = drive.mountpoints[0]?.path;
      console.log(usbPath);
      if (usbPath) {
        const videoPath = path.join(usbPath, "video.mp4");
        console.log(videoPath);
        if (fs.existsSync(videoPath)) {
          return videoPath;
        }
      }
    }
  }
  return null;
}
findVideoFile();
