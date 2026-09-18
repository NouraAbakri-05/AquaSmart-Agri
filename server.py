from flask import Flask, request, jsonify, render_template
import sqlite3
import joblib
import numpy as np

app = Flask(__name__)

clf = joblib.load("model_irrigation.pkl")
reg = joblib.load("model_water.pkl")
plant_map = joblib.load("plant_map.pkl")

# LIVE DATA PER ZONE
latest = {}

# ---------------- HOME ----------------
@app.route("/")
def home():
    return render_template("index.html")


# ---------------- ADD ZONE ----------------
@app.route("/add_zone", methods=["POST"])
def add_zone():
    data = request.get_json()

    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO zones (name, plant, hectares)
        VALUES (?, ?, ?)
    """, (data["name"], data["plant"], data["hectares"]))

    conn.commit()
    conn.close()

    return {"status": "ok"}


# ---------------- DELETE ZONE ----------------
@app.route("/delete_zone/<int:zone_id>", methods=["DELETE"])
def delete_zone(zone_id):
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensor_data WHERE zone_id=?", (zone_id,))
    cursor.execute("DELETE FROM zones WHERE id=?", (zone_id,))
    conn.commit()
    conn.close()

    if zone_id in latest:
        del latest[zone_id]

    return {"status": "ok"}


# ---------------- LIVE PREDICTION ----------------
@app.route("/predict_live", methods=["POST"])
def predict_live():
    data = request.get_json()

    soil = data["soil"]
    temp = data["temperature"]
    hum = data["humidity"]
    zone_id = data["zone_id"]

    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name, plant, hectares
        FROM zones
        WHERE id=?
    """, (zone_id,))

    zone = cursor.fetchone()

    if not zone:
        conn.close()
        return {"error": "zone not found"}

    zone_name, plant, hectares = zone

    plant_code = list(plant_map).index(plant)

    X = np.array([[soil, temp, hum, hectares, plant_code]])

    irrigate = clf.predict(X)[0]
    total_water = reg.predict(X)[0]
    water_per_ha = total_water / hectares

    # Save to history
    cursor.execute("""
        INSERT INTO sensor_data (zone_id, soil, temperature, humidity, irrigate, water_need, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    """, (zone_id, soil, temp, hum, int(irrigate), float(total_water)))

    conn.commit()
    conn.close()

    result = {
        "zone": zone_name,
        "plant": plant,
        "soil": soil,
        "temperature": temp,
        "humidity": hum,
        "hectares": float(hectares),
        "irrigate": int(irrigate),
        "water_per_hectare": float(water_per_ha),
        "total_water": float(total_water),
    }

    latest[zone_id] = result

    return result


# ---------------- GET ZONES ----------------
@app.route("/zones")
def zones():
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, plant, hectares FROM zones")
    rows = cursor.fetchall()

    conn.close()

    return jsonify([
        {
            "id": r[0],
            "name": r[1],
            "plant": r[2],
            "hectares": r[3]
        }
        for r in rows
    ])


# ---------------- GET LIVE DATA BY ZONE ----------------
@app.route("/latest/<int:zone_id>")
def get_latest(zone_id):
    if zone_id not in latest:
        return jsonify({"error": "no live data yet"})

    return jsonify(latest[zone_id])


# ---------------- GET HISTORY BY ZONE ----------------
@app.route("/history/<int:zone_id>")
def get_history(zone_id):
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, soil, temperature, humidity, irrigate, water_need, timestamp
        FROM sensor_data
        WHERE zone_id=?
        ORDER BY id DESC
        LIMIT 20
    """, (zone_id,))

    rows = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "soil": r[1],
            "temperature": r[2],
            "humidity": r[3],
            "irrigate": r[4],
            "water_need": r[5],
            "timestamp": r[6]
        }
        for r in reversed(rows)
    ])


# ---------------- STATS BY ZONE ----------------
@app.route("/stats/<int:zone_id>")
def get_stats(zone_id):
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(irrigate) as irrigations,
            AVG(soil) as avg_soil,
            AVG(temperature) as avg_temp,
            AVG(humidity) as avg_hum,
            SUM(water_need) as total_water
        FROM sensor_data
        WHERE zone_id=?
    """, (zone_id,))

    row = cursor.fetchone()
    conn.close()

    if not row or row[0] == 0:
        return jsonify({"error": "no data"})

    return jsonify({
        "total_readings": row[0],
        "irrigations": row[1],
        "avg_soil": round(row[2], 1),
        "avg_temperature": round(row[3], 1),
        "avg_humidity": round(row[4], 1),
        "total_water": round(row[5], 1)
    })


# ---------------- ALERTS (all zones) ----------------
@app.route("/alerts")
def get_alerts():
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sd.id, sd.zone_id, z.name, z.plant,
               sd.soil, sd.temperature, sd.humidity, sd.water_need, sd.timestamp
        FROM sensor_data sd
        JOIN zones z ON sd.zone_id = z.id
        WHERE sd.irrigate = 1
        ORDER BY sd.id DESC
        LIMIT 30
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0], "zone_id": r[1], "zone": r[2], "plant": r[3],
            "soil": r[4], "temperature": r[5], "humidity": r[6],
            "water_need": r[7], "timestamp": r[8]
        }
        for r in rows
    ])


# ---------------- MANUAL IRRIGATION ----------------
@app.route("/manual_irrigate/<int:zone_id>", methods=["POST"])
def manual_irrigate(zone_id):
    conn = sqlite3.connect("sensors.db")
    cursor = conn.cursor()

    cursor.execute("SELECT hectares FROM zones WHERE id=?", (zone_id,))
    zone = cursor.fetchone()

    if not zone:
        conn.close()
        return jsonify({"error": "zone not found"})

    if zone_id in latest:
        d = latest[zone_id]
        soil, temp, hum, water = d["soil"], d["temperature"], d["humidity"], d["total_water"]
    else:
        soil, temp, hum, water = 0, 25, 50, 0.0

    cursor.execute("""
        INSERT INTO sensor_data (zone_id, soil, temperature, humidity, irrigate, water_need, timestamp)
        VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
    """, (zone_id, soil, temp, hum, float(water)))

    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)
