import serial
import threading
import time

class SerialHandler:
    def __init__(self, port, baudrate=115200, timeout=0):
        try:
            self.ser = serial.Serial(port, baudrate=baudrate, timeout=timeout)
            print(f"Serial port {port} connected.")
        except serial.SerialException as e:
            print(f"Failed to connect to serial port {port}: {e}")
            self.ser = None

        self.running = False
        self.callback = None

    def bcd_to_int(self, bcd_list):
        result = ''.join(bcd_list)
        result = result.replace('F', '0')
        return result

    def format_price(self, price, price_dot):
        price_str = str(price)
        price_dot = int(price_dot)
        if price_dot > 0 and price_dot < len(price_str):
            price_str = price_str[:-price_dot] + '.' + price_str[-price_dot:]
        return price_str

    def read_loop(self):
        while True:
            try:
                """Continuously read from serial and process data."""
                if not self.ser:
                    print("Serial port is not connected.")
                    return

                self.running = True
                data = []
                hex_data = []
                received_data = []

                while self.running:
                    if self.ser.in_waiting > 0:
                        byte_data = self.ser.read(1)
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
                            price_dot = received_data[2]
                            volume_dot = received_data[3]
                            bcd_amount = received_data[6:10]
                            bcd_volume = received_data[11:14]
                            bcd_uprice = received_data[15:18]


                            amount = self.bcd_to_int(bcd_amount)
                            volume = self.bcd_to_int(bcd_volume)
                            uprice = self.bcd_to_int(bcd_uprice)
                            formatted_price = self.format_price(uprice, price_dot)

                            send_data = {
                                "amount": amount,
                                "volume": volume,
                                "price": formatted_price
                            }
                            # Callback for data
                            if self.callback:
                                self.callback(send_data)

                            received_data.clear()

                    time.sleep(0.01)

            except Exception as e:
                print(f"An error occurred in read_loop: {e}")

    def start_reading(self, callback=None):
        """Start reading in a separate thread."""
        self.callback = callback
        threading.Thread(target=self.read_loop, daemon=True).start()

    def stop_reading(self):
        """Stop the reading loop."""
        self.running = False
        print("Serial reading stopped.")
