import sqlite3

conn = sqlite3.connect("sensors.db")
cursor = conn.cursor()

cursor.execute("PRAGMA foreign_keys = ON")

# ZONES TABLE
cursor.execute("""
CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    plant TEXT,
    hectares REAL
)
""")

# SENSOR DATA TABLE
cursor.execute("""
CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER,
    soil REAL,
    temperature REAL,
    humidity REAL,
    irrigate INTEGER,
    water_need REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(zone_id) REFERENCES zones(id)
)
""")

conn.commit()
conn.close()

print("Database ready")