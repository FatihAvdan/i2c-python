import socketio

sio = socketio.Server(cors_allowed_origins='*')

@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")
    sio.emit('message', "Hello from the server!", to=sid)

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
def message(sid, data):
    print(f"Message from {sid}: {data}")

@sio.event
def serial_data(sid, data):
    print(f"Serial data from {sid}: {data}")

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

def send_serial_data(data):
    """Send serial data to all connected clients."""
    try:
        print("Sending serial data to clients:", data)
        sio.emit('serial_data', data)  # Use 'serial_data' event instead of 'message'
    except Exception as e:
        print("Error in send_serial_data:", e)
