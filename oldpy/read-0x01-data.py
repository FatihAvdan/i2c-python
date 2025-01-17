import serial

ser = serial.Serial("COM7", baudrate=115200, timeout=1)
#ser = serial.Serial('/dev/serial0', 115200)
#ser = serial.Serial('COM7', 115200)
data = []
hex_data = []
received_data = []


def bcd_to_int(bcd_list):
    result = ''.join(bcd_list)
    result = result.replace('F', '0')
    return result

def format_price(price, price_dot):
    price_str = str(price)
    price_dot = int(price_dot)
    if price_dot > 0 and price_dot < len(price_str):
        price_str = price_str[:-price_dot] + '.' + price_str[-price_dot:]
    return price_str
while True:
    if ser.in_waiting > 0:
        byte_data = ser.read(1)
        
        if byte_data == b'/':
            if data:
                combined_data = ''.join(data)
                hex_value = f"{int(combined_data):02X}"
                hex_data.append(hex_value)
                #print("Gelen Veri (Hex):", hex_value)
                received_data.append(hex_value)
                data.clear()
        else:
            data.append(byte_data.decode())
           
        if len(received_data) == 18:
            #print("18 byte'lık Veri Array:", received_data)

            priceDot = received_data[2]
            volumeDot = received_data[3]

            bcdAmount = received_data[6:10]
            bcdVolume = received_data[11:14]
            bcdUprice = received_data[15:18]

            #print("priceDot:", priceDot)
            #print("volumeDot:", volumeDot)
            #print("bcdAmount:", bcdAmount)
            #print("bcdVolume:", bcdVolume)
            #print("bcdUprice:", bcdUprice)

            amount = bcd_to_int(bcdAmount)
            volume = bcd_to_int(bcdVolume)
            uprice = bcd_to_int(bcdUprice)

            formatted_price = format_price(uprice, priceDot)

            print("Amount:", amount)
            print("Volume:", volume)
            print("Price:", formatted_price)
            print("\n")

            received_data.clear()