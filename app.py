import os
import json
import shutil
from pytz import timezone
from datetime import datetime
from flask import Flask, request, render_template, send_from_directory, jsonify

app = Flask(__name__)

last_edited = None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/status")
def status():
    return jsonify(last_edited)

@app.route("/data", methods=["GET", "POST"])
def data():
    if request.method == "GET":
        return send_from_directory(app.root_path, "data.json", mimetype='application/json')
    elif request.method == "POST":
        path = os.path.join(app.root_path, "data.json")
        backup_path = os.path.join(app.root_path, "data.json.bkp") # TODO: better backup strategy! e.g. once a day
        shutil.copyfile(path, backup_path)
        with open(path, "w") as file:
            json.dump(request.json, file, sort_keys=True, indent=2)

        global last_edited
        date = datetime.now(timezone("Europe/Berlin")).isoformat()
        
        ip = request.environ.get('HTTP_X_FORWARDED_FOR')
        if ip == None:
            ip = request.environ['REMOTE_ADDR']
        last_edited = dict(ip=ip, date=date)

        return "", 200

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(app.root_path, "static"), "favicon.ico", mimetype="image/vnd.microsoft.icon")
