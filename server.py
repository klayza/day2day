import json
import os
import random
from datetime import datetime
import time
from flask_cors import CORS
from dotenv import load_dotenv
from flask import Flask, send_file, jsonify, request

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

GOODS_DIR = os.getenv("goods")
GOODGOODS_DIR = os.getenv("goodgoods")
LOCATION = os.getenv("location")

def get_random_image_path(directory):
    if not os.path.isdir(directory):
        return None
    files = [os.path.join(directory, f) for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]
    return random.choice(files) if files else None


def get_date_str():
    return datetime.now().strftime("%m%d%Y")


def update_history(img):
    history_file = "rewardHistory.json"
    if not os.path.exists(history_file):
        with open(history_file, "w") as f:
            json.dump({}, f)
    with open(history_file, "r+") as f:
        history = json.load(f)
        history[get_date_str()] = img
        f.seek(0)
        json.dump(history, f)


def rewarded_today():
    history_file = "rewardHistory.json"
    if not os.path.exists(history_file):
        with open(history_file, "w") as f:
            json.dump({}, f)
    with open(history_file, "r") as f:
        history = json.load(f)
        return get_date_str() in history


def get_image_from_date(dateStr):
    with open("rewardHistory.json", "r") as f:
        history = json.load(f)
        return history.get(dateStr)


@app.route("/reward")
def reward():
    today = datetime.today().weekday()  # Monday is 0, Sunday is 6
    directory = GOODGOODS_DIR if today in [4, 5] else GOODS_DIR  # Use GOODGOODS_DIR on Friday and Saturday
    directory = GOODGOODS_DIR
    if rewarded_today():
        image_path = get_image_from_date(get_date_str())
        if image_path:
            return send_file(image_path, mimetype="image/jpeg")
        else:
            return "No image available", 404
    print(directory)

    image_path = get_random_image_path(directory)
    print(image_path)
    if not image_path:
        return "No image available", 404

    update_history(image_path)
    return send_file(image_path, mimetype="image/jpeg")


@app.route("/getHabits")
def getHabits():
    data = []
    if os.path.exists("habits.json"):
        with open("habits.json", "r") as file:
            data = json.load(file)
    else:
        data = []  # Empty list if the file doesn't exist
    return jsonify(data), 200


@app.route("/newHabit", methods=["POST"])
def newHabit():
    data = request.get_json()
    habit = data["habit"]
    habit_id = genHabitID()
    habit["id"] = habit_id

    habits = []
    try:
        with open("habits.json", "r") as f:
            habits = json.load(f)
    except FileNotFoundError:
        pass
    habits.append(habit)
    with open("habits.json", "w") as f:
        json.dump(habits, f, indent=4)

    return jsonify({"message": "Habit added successfully"}), 200


@app.route("/saveHabitChecks", methods=["POST"])
def saveHabitChecks():
    data = request.get_json()
    newHabits = data["habits"]

    # Load existing habits
    existingHabits = []
    try:
        with open("habits.json", "r") as file:
            existingHabits = json.load(file)
    except FileNotFoundError:
        pass  # If the file doesn't exist, we start with an empty list

    # Update existing habits with the new data
    for newHabit in newHabits:
        for i, existingHabit in enumerate(existingHabits):
            if existingHabit["id"] == newHabit["id"]:
                existingHabits[i] = newHabit
                break
        else:
            # If the habit is not found in existingHabits, it's a new habit, so add it
            existingHabits.append(newHabit)

    # Save the updated habits back to the file
    with open("habits.json", "w") as file:
        json.dump(existingHabits, file, indent=4)

    return jsonify({"message": "Habits updated successfully"}), 200
    


def genHabitID():
    return int(time.time() * 1000)


@app.route("/")
def home():
    return send_file("./index.html")


if __name__ == "__main__":
    if LOCATION == "windows": app.run(port=5621, debug=True)  
    elif LOCATION == "linux": app.run(host='0.0.0.0', port=5621, debug=True) 
    else: app.run(port=5621, debug=True)