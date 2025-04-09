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
const message =
  "START18:01/61/03/22/02/0E/FF/FF/F0/00/00/FF/F0/00/00/FF/00/00/:END18";

const startIdx = message.indexOf("START18:");
const endIdx = message.indexOf(":END18") + 7;
const content = message.substring(startIdx, endIdx);
const raw = content.replace("START18:", "").replace(":END18", "");
const receivedData = [];
let tempData = [];
for (let i = 0; i < raw.length; i++) {
  const byte = raw[i];
  if (byte === "/") {
    receivedData.push(tempData.join(""));
    tempData = [];
  } else {
    tempData.push(byte);
  }
}
console.log(receivedData);
const amount = bcdToInt(receivedData.slice(6, 10));
console.log(amount);
