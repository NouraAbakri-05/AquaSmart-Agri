import requests
import random
import time
import sqlite3

def get_zones():
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM zones")
    zones = [z[0] for z in cursor.fetchall()]
    conn.close()
    return zones

while True:
    zones = get_zones()

    if not zones:
        print("No zones yet")
        time.sleep(3)
        continue

    data = {
        "soil": random.randint(10, 90),
        "temperature": random.randint(15, 45),
        "humidity": random.randint(20, 90),
        "zone_id": random.choice(zones)
    }

    try:
        requests.post("http://127.0.0.1:5000/predict_live", json=data)
        print("Sent:", data)
    except:
        print("Server not running")

    time.sleep(2)