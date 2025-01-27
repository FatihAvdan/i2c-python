#include "Wire.h"

#define SDA_1 21
#define SCL_1 22

#define SDA_2 33
#define SCL_2 32

#define I2C_DEV_ADDR 0x18
#define I2C_DEV_ADDR1 0x10

int j = 0;
String myInts[25];
String senddata;

char inputchar ;
bool charComplete = false;

TwoWire I2Cone = TwoWire(0);
TwoWire I2Ctwo = TwoWire(1);

void onRequest() {
  if (charComplete)
  {
    I2Ctwo.print(inputchar);
    charComplete = false;
  }else{
    I2Ctwo.print('\0');
  }
}
void onReceive(int len) {
  if (len == 18 || len == 25) {
    while (I2Cone.available()) {
      myInts[j] = I2Cone.read();
      j++;
    }
  }
}
void setup() {
  Serial.begin(115200);
 //Serial.setDebugOutput(true);

  I2Cone.onReceive(onReceive);
  I2Cone.begin((uint8_t)I2C_DEV_ADDR, SDA_1, SCL_1, 200000);
  I2Ctwo.onRequest(onRequest);
  I2Ctwo.begin((uint8_t)I2C_DEV_ADDR1, SDA_2, SCL_2, 75000);
}

void loop() {
  if (j == 18) {
    j = 0;
    senddata = "START18:"; 
    for (int i = 0; i < 18; i++) {
      senddata += myInts[i];
      if (i < 17) senddata += "/"; 
    }
    senddata += "/:END18"; 
    Serial.println(senddata);
    senddata = "";
  }
  else if (j == 25) {
    j = 0;
    senddata = "START26:"; 
    for (int i = 0; i < 25; i++) {
      senddata += myInts[i];
      if (i < 24) senddata += "/"; 
    }
    senddata += "/:END26";
    Serial.println(senddata);
    senddata = "";
  }
}

void serialEvent() {
 while(Serial.available()>0) {
    inputchar = Serial.read();
    charComplete = true;
  }
}