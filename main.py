import serial

# Seri portu ayarlıyoruz (Windows'ta 'COMx', Linux/macOS'ta '/dev/ttyUSBx' gibi)
ser = serial.Serial('COM7', 115200)  # COM3, baud rate: 9600 (serbest seçilebilir)
# BCD verileri
bcdAmount = ['FF', 'F4', '94', '73']
# bcdVolume = ['FF', '65', '44']
# bcdUprice = ['FF', '75', '60']

# # Hexadecimal değerlerini decimal'e çevirip birleştirme
# amount = ''.join([hex(int(x, 16))[2:].zfill(2) for x in bcdAmount[1:]])  # ilk eleman FF'yi atla
# volume = ''.join([hex(int(x, 16))[2:].zfill(2) for x in bcdVolume[1:]])  # ilk eleman FF'yi atla
# price = ''.join([hex(int(x, 16))[2:].zfill(2) for x in bcdUprice[1:]])  # ilk eleman FF'yi atla

# # Çıktıyı yazdırma
# print("Amount:", amount)
# print("Volume:", volume)
# print("Price:", price)
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

def bcd_to_int(bcd_list):
    """BCD formatındaki her byte'ı tek tek birleştirip, içindeki 'F' karakterlerini '0' ile değiştirerek tamsayıya dönüştür."""
    # Listeyi birleştir
    result = ''.join(bcd_list)
    
    # 'F' olanları '0' ile değiştir
    result = result.replace('F', '0')
    
    # Sonucu tam sayıya dönüştür
    return result
def format_price(price, price_dot):
    """Fiyatı noktalı formatta yazdır."""
    price_str = str(price)
    price_dot = int(price_dot)  # price_dot'u int'e dönüştür
    if price_dot > 0 and price_dot < len(price_str):
        price_str = price_str[:-price_dot] + '.' + price_str[-price_dot:]
    return price_str
while True:
    if ser.in_waiting > 0:  # Veri geldiyse
        byte_data = ser.read(1)  # Tek bir byte oku
        
        if byte_data == b'/':  # Eğer '/' karakteri gelirse
            if data:  # Eğer data listesinde veriler varsa
                # Veriyi birleştir ve hexadecimal formata çevir
                combined_data = ''.join(data)
                # İki haneli her byte'ı hexadecimal'e çevir
                hex_value = f"{int(combined_data):02X}"
                hex_data.append(hex_value)
                # print("Gelen Veri (Hex):", hex_value)
                received_data.append(hex_value)
                data.clear()  # Veriyi sıfırla
        else:
            data.append(byte_data.decode())  # Byte'ı string olarak veri listesine ekle

        # Veriyi received_data array'ine ekle
        # if byte_data != b'/':
        #     received_data.append(f"0x{byte_data.hex().upper()}")  # Gelen veriyi array'e ekle (hex formatında)
        
        # Eğer veri array'ımız 18 byte'lıksa, bunu yazdıralım
        if len(received_data) == 18:
            # print("18 byte'lık Veri Array:", received_data)

            # priceDot ve volumeDot değerlerini al
            priceDot = received_data[2]
            volumeDot = received_data[3]

            # BCD formatındaki değerleri al
            bcdAmount = received_data[6:10]
            bcdVolume = received_data[11:14]
            bcdUprice = received_data[15:18]

            print("priceDot:", priceDot)
            print("volumeDot:", volumeDot)
            print("bcdAmount:", bcdAmount)
            print("bcdVolume:", bcdVolume)
            print("bcdUprice:", bcdUprice)

             # BCD değerlerini tamsayıya dönüştür
            amount = bcd_to_int(bcdAmount)
            volume = bcd_to_int(bcdVolume)
            uprice = bcd_to_int(bcdUprice)

            # Fiyatı formatla
            formatted_price = format_price(uprice, priceDot)

            # Sonuçları yazdır
            print("Amount:", amount)
            print("Volume:", volume)
            print("Price:", formatted_price)

            # Array'i sıfırlıyoruz
            received_data.clear()