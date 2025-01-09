import serial

ser = serial.Serial("/dev/ttyUSB0",baudrate=115200,timeout=1)
# ser = serial.Serial('/dev/serial0', 115200)
# ser = serial.Serial('COM7', 115200)
while True:
    if ser.in_waiting > 0:  # Veri geldiyse
        byte = ser.read(1)  # Tek bir byte oku
        print(byte)