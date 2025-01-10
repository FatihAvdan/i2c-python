import socketio
import webview
import eventlet
import threading
import time
import serial
import os
# SocketIO sunucusunu başlat
sio = socketio.Server(cors_allowed_origins='*')

# WSGI uygulaması (Flask olmadan)
app = socketio.WSGIApp(sio)
ser = serial.Serial("COM7",baudrate=115200,timeout=0)


# Web sayfasını çalıştırmak için HTML şablonu yolu
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), 'templates')
def serial_read():
    data = []
    hex_data = []
    received_data = []
    while True:
        # print("serial_read is running")
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
                amount = bcd_to_int(bcdAmount)
                volume = bcd_to_int(bcdVolume)
                uprice = bcd_to_int(bcdUprice)
                formatted_price = format_price(uprice, priceDot)
                sendData = {
                    "amount": amount,
                    "volume": volume,
                    "price": formatted_price
                }
                print("sendData", sendData)
                received_data.clear()
                ser.b
                return sendData
# SocketIO olayları
@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")
    sio.emit(sid, "Hello from the server!")

@sio.event
def message(sid, data):
    print(f"Message from {sid}: {data}")
    print("message is coming")
    serialData = serial_read()
    sio.emit('message', serialData)

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
def i_want_serial_data(sid, data):  
    print("serial data is coming")
    serialData = serial_read()
    sio.emit('message', serialData)


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







                
# Pywebview'i çalıştırmak için fonksiyon
def start_webview():
    window = webview.create_window("SocketIO Web App", TEMPLATES_DIR + "/index.html", resizable=True, fullscreen=False)
    webview.start(debug=True)

# SocketIO sunucusunu başlatan fonksiyon
def start_socketio():
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5000)), app)

if __name__ == '__main__':
    # Flask ve Webview'i farklı iş parçacıklarında başlatıyoruz
    socket_thread = threading.Thread(target=start_socketio)
    socket_thread.daemon = True  # Ana thread ile birlikte kapanacak
    socket_thread.start()

    serial_thread = threading.Thread(target=serial_read)
    serial_thread.daemon = True  # Ana thread ile birlikte kapanacak
    serial_thread.start()

    # Webview'i çalıştırıyoruz
    start_webview()

