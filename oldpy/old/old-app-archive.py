from flask import Flask, render_template
import webview
import threading
from flask_socketio import SocketIO
import sys
app = Flask(__name__)
socketio = SocketIO(app)

# Flask route
@app.route('/')
def index():
    return render_template('index.html')

# WebSocket üzerinden gelen mesajı dinle
@socketio.on('message')
def handle_message(message):
    print(f"Gelen mesaj: {message}")
    socketio.send("Mesaj alındı!")  # Geri mesaj gönder

# Flask'ı başlatan iş parçacığı fonksiyonu
def start_flask():
    socketio.run(app, host="0.0.0.0", port=5000)

def serial_read():
    print("Serial okuyor...")

def start_webview():
    # Pywebview'i başlat
    window = webview.create_window("Flask Web App", "http://127.0.0.1:5000", resizable=True, fullscreen=False)
    webview.start()  # Pywebview başlat

if __name__ == '__main__':
    try:
        # Flask'i ayrı bir iş parçacığında çalıştır
        flask_thread = threading.Thread(target=start_flask)
        flask_thread.daemon = True  # Flask thread'inin ana thread ile birlikte kapanmasını sağlar
        flask_thread.start()

        # Seri port verilerini okumak için ayrı bir iş parçacığı başlat
        serial_thread = threading.Thread(target=serial_read)
        serial_thread.daemon = True  # Seri thread'inin ana thread ile birlikte kapanmasını sağlar
        serial_thread.start()

        # Webview'i başlat (ana thread'de çalışacak)
        start_webview()

    except KeyboardInterrupt:
        print("Program sonlandırılıyor...")
        sys.exit(0)  # Programı düzgün bir şekilde kapat