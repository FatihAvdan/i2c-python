import asyncio
import socketio
import threading
from aiohttp import web
import serial
import time

# Seri port ayarları
ser = serial.Serial("COM7", baudrate=115200, timeout=1)

# Socket.IO sunucusu ayarları
sio = socketio.AsyncServer(cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Seri port verisini almak için async Queue kullanacağız
serial_data_queue = asyncio.Queue()

# Seri port okuma fonksiyonu
def serial_read():
    while True:
        if ser.in_waiting > 0:
            byte_data = ser.read(1)
            if byte_data:
                # Gelen veriyi asyncio Queue'ya ekliyoruz
                asyncio.run_coroutine_threadsafe(serial_data_queue.put(byte_data), loop)
        time.sleep(0.1)  # Veri okuma aralığı

# Seri verisini web istemcisine gönderme
async def handle_serial_data():
    while True:
        if not serial_data_queue.empty():
            data = await serial_data_queue.get()
            # Socket.IO üzerinden veriyi istemciye gönder
            await sio.emit('serial_data', {'data': data.decode()})
        await asyncio.sleep(0.1)  # Async olarak bekleyelim

# Ana sayfa isteği (HTML dosyasını servise sunma)
async def index(request):
    with open('templates/index.html') as f:
        return web.Response(text=f.read(), content_type='text/html')

# Socket.IO bağlantı event'leri
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def chat_message(sid, data):
    print(f"Message from {sid}: {data}")

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Static dosyalar için route tanımlama (js, css vb.)
app.router.add_static('/static', 'static')

# Ana sayfa route'u
app.router.add_get('/', index)

# Sunucuyu çalıştırma ve seri port okuma thread'ini başlatma
if __name__ == '__main__':
    loop = asyncio.get_event_loop()

    # Seri port okuma işlemi için ayrı bir iş parçacığı başlatıyoruz
    serial_thread = threading.Thread(target=serial_read, daemon=True)
    serial_thread.start()

    # Seri verilerini web istemcisine gönderme işlemi için async task başlatıyoruz
    loop.create_task(handle_serial_data())

    # aiohttp sunucusunu başlatıyoruz
    web.run_app(app, host='127.0.0.1', port=8080)
