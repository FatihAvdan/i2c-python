import threading
import eventlet
import webview
from socketio import WSGIApp
from serial_handler import SerialHandler
from socket_handler import sio

TEMPLATES_DIR = 'templates'

def handle_serial_data(data):
    """Callback for serial data."""
    print("Sending data to clients:", data)
    sio.emit('serial_data', data)

def start_webview():
    print("Starting Webview...")
    try:
        window = webview.create_window("SocketIO Web App", TEMPLATES_DIR + "/index.html", resizable=True, fullscreen=False)
        webview.start(debug=True)
    except Exception as e:
        print("Webview error:", e)

def start_socketio(app):
    print("Starting Socket.IO server...")
    try:
        eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5000)), app)
    except Exception as e:
        print("Socket.IO server error:", e)

if __name__ == '__main__':
    # Serial handler instance
    serial_handler = SerialHandler("COM7")
    serial_handler.start_reading(callback=handle_serial_data)

    app = WSGIApp(sio)

    # Start threads
    socket_thread = threading.Thread(target=start_socketio, args=(app,))
    socket_thread.daemon = True
    socket_thread.start()
    print("Socket.IO server thread started.")

    # Start webview
    start_webview()
