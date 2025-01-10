import sys
import serial
import time
from PyQt5.QtWidgets import QApplication, QWidget, QLabel, QVBoxLayout
from PyQt5.QtCore import QThread, pyqtSignal

# Seri port için bir sınıf (separate thread kullanmak için)
class SerialThread(QThread):
    new_data_signal = pyqtSignal(dict)  # Veriyi GUI'ye gönderecek sinyal

    def __init__(self, serial_port, parent=None):
        super().__init__(parent)
        self.serial_port = serial_port
        self.running = True

    def run(self):
        data = []
        received_data = []
        while self.running:
            if self.serial_port.in_waiting > 0:
                byte_data = self.serial_port.read(1)
                if byte_data == b'/':
                    if data:
                        combined_data = ''.join(data)
                        hex_value = f"{int(combined_data):02X}"
                        received_data.append(hex_value)
                        data.clear()
                else:
                    data.append(byte_data.decode())
                
                if len(received_data) == 18:
                    priceDot = received_data[2]
                    volumeDot = received_data[3]
                    bcdAmount = received_data[6:10]
                    bcdVolume = received_data[11:14]
                    bcdUprice = received_data[15:18]

                    amount = bcd_to_int(bcdAmount)
                    volume = bcd_to_int(bcdVolume)
                    uprice = bcd_to_int(bcdUprice)

                    formatted_price = format_price(uprice, priceDot)

                    send_data = {
                        "amount": amount,
                        "volume": volume,
                        "price": formatted_price
                    }
                    print("send_data", send_data)
                    self.new_data_signal.emit(send_data)  # Veriyi GUI'ye gönder

                    received_data.clear()
            

    def stop(self):
        self.running = False
        self.quit()


# GUI sınıfı
class SerialReaderApp(QWidget):
    def __init__(self):
        super().__init__()

        self.init_ui()
        self.serial_port = serial.Serial('COM7', 115200, timeout=0)  # Seri portu ayarla
        self.serial_thread = SerialThread(self.serial_port)
        self.serial_thread.new_data_signal.connect(self.update_display)
        self.serial_thread.start()

    def init_ui(self):
        self.setWindowTitle('Serial Data Display')
        self.setGeometry(100, 100, 400, 300)

        self.layout = QVBoxLayout()

        self.amount_label = QLabel("Amount: N/A")
        self.volume_label = QLabel("Volume: N/A")
        self.price_label = QLabel("Price: N/A")

        self.layout.addWidget(self.amount_label)
        self.layout.addWidget(self.volume_label)
        self.layout.addWidget(self.price_label)

        self.setLayout(self.layout)

    def update_display(self, data):
        """GUI'yi günceller."""
        self.amount_label.setText(f"Amount: {data['amount']}")
        self.volume_label.setText(f"Volume: {data['volume']}")
        self.price_label.setText(f"Price: {data['price']}")

    def closeEvent(self, event):
        """Uygulama kapanırken serial thread'i durdur."""
        self.serial_thread.stop()
        self.serial_thread.wait()
        self.serial_port.close()


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

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = SerialReaderApp()
    ex.show()
    sys.exit(app.exec_())
