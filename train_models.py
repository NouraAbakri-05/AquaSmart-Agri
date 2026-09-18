import sqlite3
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

conn = sqlite3.connect("sensors.db")

df = pd.read_sql_query("""
SELECT s.soil, s.temperature, s.humidity,
       z.plant, z.hectares,
       s.irrigate, s.water_need
FROM sensor_data s
JOIN zones z ON s.zone_id = z.id
""", conn)

conn.close()

df = df.dropna()

# encode plant
df["plant"] = df["plant"].astype("category")
df["plant_code"] = df["plant"].cat.codes

X = df[["soil", "temperature", "humidity", "hectares", "plant_code"]]

y_class = df["irrigate"]
y_water = df["water_need"]

X_train, X_test, y_train, y_test = train_test_split(X, y_class, test_size=0.2)

clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)

reg = RandomForestRegressor(n_estimators=100)
reg.fit(X, y_water)

joblib.dump(clf, "model_irrigation.pkl")
joblib.dump(reg, "model_water.pkl")
joblib.dump(df["plant"].astype("category").cat.categories, "plant_map.pkl")

print("Models trained successfully")