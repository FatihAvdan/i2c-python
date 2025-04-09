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
      receivedData.push(charCode);
      tempData = []; // Veriyi sıfırla
    }
  } else {
    // / karakteri değilse, veriyi geçici diziye ekle
    tempData.push(byte);
  }
}
console.log(receivedData);
