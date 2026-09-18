import sqlite3
import random

conn = sqlite3.connect("sensors.db")
cursor = conn.cursor()

plants = ["tomato", "potato", "corn"] 

# ---------------- CREATE ONLY 3 ZONES ----------------
cursor.execute("SELECT COUNT(*) FROM zones")
if cursor.fetchone()[0] == 0:
    for i in range(3):
        cursor.execute("""
            INSERT INTO zones (name, plant, hectares)
            VALUES (?, ?, ?)
        """, (
            f"zone_{i+1}",
            random.choice(plants),
            round(random.uniform(1, 10), 2)
        ))

conn.commit()

# ---------------- GET ZONES ----------------
cursor.execute("SELECT id, plant, hectares FROM zones")
zones = cursor.fetchall()

# ---------------- RULE FUNCTION ----------------
def rule(soil, temp, hum, h):
    score = (100 - soil) * 0.5 + temp * 0.3 - hum * 0.2
    irrigate = 1 if score > 35 else 0
    water = score * h
    return irrigate, water

# ---------------- GENERATE DATA ----------------
for _ in range(3000):

    zone_id, plant, hectares = random.choice(zones)

    soil = random.randint(10, 90)
    temp = random.randint(15, 45)
    hum = random.randint(20, 90)

    irrigate, water = rule(soil, temp, hum, hectares)

    cursor.execute("""
        INSERT INTO sensor_data (zone_id, soil, temperature, humidity, irrigate, water_need)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (zone_id, soil, temp, hum, irrigate, water))

conn.commit()
conn.close()

print("✅ Synthetic data generated for 3 zones only")