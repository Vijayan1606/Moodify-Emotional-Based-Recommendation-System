from __future__ import division, print_function
import os
import cv2
import numpy as np
from deepface import DeepFace
from flask import Flask, request, render_template,jsonify
import requests
import json
from werkzeug.utils import secure_filename
import statistics as st

BASE_DIR = os.path.abspath(os.path.dirname(__file__)) 
TEMPLATE_DIR = os.path.join(BASE_DIR, "../../frontend/templates")
STATIC_DIR = os.path.join(BASE_DIR, "../../frontend/static")

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)

API_URL = "https://openrouter.ai/api/v1/chat/completions"
API_KEY = "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"  

# Chatbot Logic - Emotion-based Support
def get_chatbot_response(user_message):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    # Message structure for Gemini
    data = {
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "system", "content": "You are an empathetic listener. Do not manipulate the user, only acknowledge emotions and provide comfort."},
            {"role": "user", "content": user_message}
        ]
    }

    response = requests.post(API_URL, headers=headers, data=json.dumps(data))
    
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return "I'm here to listen. Can you share more?"


@app.route("/")
def home():
    return render_template("index1.html")

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json["message"]
    bot_response = get_chatbot_response(user_message)
    return jsonify({"response": bot_response})
    
@app.route('/camera', methods = ['GET', 'POST'])
def camera():
    import time
    i = 0
    output = []
    cap = cv2.VideoCapture(0)
    print("[INFO] Starting webcam for emotion detection...")
    start_time = time.time()
    max_seconds = 3  # Reduce capture time for speed
    frame_limit = 20  # Reduce frame count for speed
    detector_backend = 'retinaface'  # 'retinaface' is robust and often more accurate
    while i < frame_limit and (time.time() - start_time) < max_seconds:
        ret, img = cap.read()
        if not ret:
            print("[ERROR] Failed to capture frame from webcam.")
            break
        # Resize frame for faster processing
        img_small = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
        img_rgb = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)
        try:
            analysis = DeepFace.analyze(
                img_rgb,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend=detector_backend
            )
            print(f"[DEBUG] DeepFace analysis: {analysis}")
            if isinstance(analysis, list):
                result = analysis[0]
            else:
                result = analysis
            predicted_emotion = result.get('dominant_emotion', None)
            face_conf = result.get('face_confidence', 0)
            if predicted_emotion and face_conf > 0.80:
                output.append(predicted_emotion)
            else:
                print(f"[DEBUG] No confident face/emotion detected in this frame. Confidence: {face_conf}")
        except Exception as e:
            print(f"[ERROR] DeepFace error: {e}")
        # Optionally, comment out live display for more speed
        # cv2.imshow('LIVE', img_small)
        key = cv2.waitKey(1)
        if key == 27:
            print("[INFO] ESC pressed, exiting webcam loop.")
            break
        i += 1
    cap.release()
    cv2.destroyAllWindows()
    print(f"[INFO] Detected emotions: {output}")
    if output:
        from collections import Counter
        emotion_counts = Counter(output)
        # If there are non-neutral emotions, ignore neutral in the result
        non_neutral = [e for e in output if e != 'neutral']
        if non_neutral:
            emotion_counts = Counter(non_neutral)
        most_common = emotion_counts.most_common(2)
        if len(most_common) > 1 and all(e in ['neutral','sad','fear'] for e, _ in most_common):
            final_output1 = ', '.join([e for e, _ in most_common])
        else:
            final_output1 = most_common[0][0]
    else:
        final_output1 = "No face detected"
    return render_template("buttons.html", final_output=final_output1)


@app.route('/buttons', methods = ['GET','POST'])
def buttons():
    return render_template("buttons.html")

@app.route('/movies/<emotion>', methods = ['GET', 'POST'])
def movies(emotion):
    return render_template(f"movies{emotion.capitalize()}.html")

@app.route('/songs/<emotion>', methods = ['GET', 'POST'])
def songs(emotion):
    return render_template(f"songs{emotion.capitalize()}.html")

@app.route('/books/<emotion>', methods = ['GET', 'POST'])
def books(emotion):
    return render_template(f"books{emotion.capitalize()}.html")

    
if __name__ == "__main__":
    app.run(debug=True)
