import socketio

sio = socketio.Server(cors_allowed_origins='*')

@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")
    sio.emit('server_message', "Hello from the server!", to=sid)

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
def message(sid, data):
    print(f"Message from {sid}: {data}")
    # if serial_handler:
    #     serial_data = serial_handler.read_data()
    #     sio.emit('message', serial_data, to=sid)

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
def i_want_serial_data(sid, data):
    print("Serial data requested")
    # if serial_handler:
    #     serial_data = serial_handler.read_data()
    #     sio.emit('message', serial_data, to=sid)