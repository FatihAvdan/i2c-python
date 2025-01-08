import serial

# Seri portu ayarlıyoruz (Windows'ta 'COMx', Linux/macOS'ta '/dev/ttyUSBx' gibi)
ser = serial.Serial('COM7', 115200)  # COM3, baud rate: 9600 (serbest seçilebilir)

# while True:
#     if ser.in_waiting > 0:  # Veri geldiyse
#         byte = ser.read(1)  # Tek bir byte oku
#         hex_byte = "0x{:02X}".format(byte[0])  # Byte'ı 0xXX formatına dönüştür
#         print(f"Gelen Byte (Hex): {hex_byte}")

data = []  # Verileri tutacak liste
hex_data = []  # Hex verilerini tutacak liste
received_data = []

# while True:
#     if ser.in_waiting > 0:  # Veri geldiyse
#         byte_data = ser.read(1)  # Tek bir byte oku
        
#         if byte_data == b'/':  # Eğer '/' karakteri gelirse
#             if data:  # Eğer data listesinde veriler varsa
#                 # Veriyi birleştir ve hexadecimal formata çevir
#                 combined_data = ''.join(data)
#                 # İki haneli her byte'ı hexadecimal'e çevir
#                 hex_value = f"0x{int(combined_data):02X}"
#                 hex_data.append(hex_value)
#                 print("Gelen Veri (Hex):", hex_value)
#                 data.clear()  # Veriyi sıfırla
#         else:
#             data.append(byte_data.decode())  # Byte'ı string olarak veri listesine ekle


while True:
    if ser.in_waiting > 0:  # Veri geldiyse
        byte_data = ser.read(1)  # Tek bir byte oku
        
        if byte_data == b'/':  # Eğer '/' karakteri gelirse
            if data:  # Eğer data listesinde veriler varsa
                # Veriyi birleştir ve hexadecimal formata çevir
                combined_data = ''.join(data)
                # İki haneli her byte'ı hexadecimal'e çevir
                hex_value = f"0x{int(combined_data):02X}"
                hex_data.append(hex_value)
                print("Gelen Veri (Hex):", hex_value)
                received_data.append(hex_value)
                data.clear()  # Veriyi sıfırla
        else:
            data.append(byte_data.decode())  # Byte'ı string olarak veri listesine ekle

        # Veriyi received_data array'ine ekle
        # if byte_data != b'/':
        #     received_data.append(f"0x{byte_data.hex().upper()}")  # Gelen veriyi array'e ekle (hex formatında)
        
        # Eğer veri array'ımız 18 byte'lıksa, bunu yazdıralım
        if len(received_data) == 18:
            print("18 byte'lık Veri Array:", received_data)
            received_data.clear()  # Array'i sıfırla