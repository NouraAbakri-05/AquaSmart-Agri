# 🌱 AquaSmart — AI-Powered Smart Irrigation System

AquaSmart is an intelligent irrigation management system developed as a **three-person academic team project** combining **IoT concepts, Machine Learning, data processing, and web technologies** for smart agriculture.

The system analyzes environmental conditions such as **soil moisture, temperature, and humidity** to determine whether irrigation is required and estimate the appropriate amount of water.

---

## 🎯 Project Objectives

- Monitor agricultural conditions using simulated IoT sensor data
- Predict whether an agricultural zone requires irrigation
- Estimate the required quantity of water
- Visualize sensor measurements and irrigation history
- Detect critical conditions and generate alerts
- Support automatic and manual irrigation control
- Explore the integration of AI and IoT technologies in smart agriculture

---

## 🤖 Machine Learning

AquaSmart integrates two Machine Learning models for irrigation decision-making.

### 🌿 Random Forest Classifier

The classification model determines whether irrigation is required based on environmental sensor data.

**Output:** Irrigation Required / Not Required

### 💧 Random Forest Regressor

The regression model estimates the quantity of water required for irrigation.

**Output:** Recommended water quantity in liters

The models are trained using synthetic agricultural sensor data generated within the project.

---

## 🏗️ System Architecture

```text
IoT Sensors / Sensor Simulator
            │
            ▼
       Flask Backend
            │
     ┌──────┴──────┐
     ▼             ▼
SQLite Database   ML Models
     │             │
     └──────┬──────┘
            ▼
      Web Dashboard
            │
            ▼
 Monitoring • Predictions • Alerts • Irrigation Control
```

---

## ✨ Main Features

- 🌡️ Environmental sensor monitoring
- 💧 Soil moisture tracking
- 🤖 AI-based irrigation prediction
- 📊 Water quantity estimation
- 📈 Historical sensor data visualization
- ⚠️ Irrigation alerts
- 🕹️ Manual irrigation control
- 🌱 Multi-zone agricultural monitoring

---

## 🛠️ Technologies

### Backend

- Python
- Flask

### Machine Learning & Data

- Scikit-learn
- Pandas
- NumPy
- Random Forest

### Database

- SQLite

### Frontend

- HTML
- CSS
- JavaScript
- Chart.js

### IoT Simulation

- Python-based sensor simulation

---

## 📁 Project Structure

```text
AquaSmart-Agri/
│
├── static/                 # CSS, JavaScript and static resources
├── templates/              # Flask HTML templates
│
├── server.py               # Main Flask application
├── init_db.py              # Database initialization
├── sensor_simulator.py     # IoT sensor simulation
├── synthetic_data.py       # Synthetic dataset generation
├── train_models.py         # Machine Learning model training
│
├── requirements.txt        # Python dependencies
├── .gitignore              # Files excluded from Git
└── README.md               # Project documentation
```

---

## 🔄 How It Works

AquaSmart follows an intelligent irrigation workflow:

```text
Environmental Data
        ↓
Sensor Simulation
        ↓
Data Processing
        ↓
Machine Learning Models
        ↓
Irrigation Decision
        ↓
Water Quantity Estimation
        ↓
Database Storage
        ↓
Web Dashboard
```

Environmental measurements are processed by the backend and analyzed using the trained Machine Learning models.

The **Random Forest Classifier** determines whether irrigation is necessary, while the **Random Forest Regressor** estimates the recommended quantity of water.

The resulting information is stored in the database and displayed through the AquaSmart web dashboard.

---

## 📊 Web Dashboard

The AquaSmart dashboard provides a visual interface for monitoring agricultural zones and irrigation activity.

It allows users to:

- Monitor environmental measurements
- View irrigation predictions
- Track historical sensor data
- Visualize statistics and trends
- Receive irrigation alerts
- Trigger manual irrigation when necessary

> 📸 Dashboard screenshots will be added here.

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/NouraAbakri-05/AquaSmart-Agri.git
cd AquaSmart-Agri
```

### 2. Install the Dependencies

```bash
pip install -r requirements.txt
```

### 3. Initialize the Database

```bash
python init_db.py
```

### 4. Train the Machine Learning Models

```bash
python train_models.py
```

### 5. Start the Application

```bash
python server.py
```

Then open the local address displayed by Flask in your browser.

---

## 🎓 Project Context

AquaSmart was developed as a **three-person academic team project** at **Ibn Zohr University**.

The project explores how **Machine Learning, IoT concepts, data processing, databases, and web development** can be integrated to create an intelligent solution for agricultural irrigation management.

The goal was to apply concepts studied during our academic program to a practical **smart agriculture** use case.

---

## 👥 Team

AquaSmart was developed collaboratively by a team of three students from complementary computer science and engineering specializations.

### 👩‍💻 Noura Abakri

**Computer Engineering & Embedded Systems**  
Ibn Zohr University — Agadir, Morocco  

🔗 [LinkedIn](https://www.linkedin.com/in/noura-abakri-17a952277/)

### 👨‍💻 LOUHABI Mohamed

**Software Engineering**

### 👩‍💻 IBOUBKARNE Fatima

**Data Analytics & Artificial Intelligence**

---

## 🔮 Future Improvements

Potential extensions of AquaSmart include:

- Integration with physical ESP32-based IoT sensors
- Real-time communication between sensors and the server
- Weather API integration
- Remote irrigation actuator control
- Cloud deployment
- Testing with real agricultural datasets
- Mobile monitoring interface
- Further evaluation and optimization of the Machine Learning models

---

## 📄 Academic Project

**AquaSmart — AI-Powered Smart Irrigation System**

Academic Team Project — **3 Students**  
Ibn Zohr University — Agadir, Morocco

---

⭐ Team project exploring the integration of **Machine Learning, IoT, data processing, software engineering, and smart agriculture**.
