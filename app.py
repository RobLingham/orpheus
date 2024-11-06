from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from openai import OpenAI

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pitches.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class Pitch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stage = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

def generate_ai_feedback(transcript: str, stage: str) -> list:
    prompt = f"""Analyze this {stage} pitch and provide actionable feedback:
    Transcript: {transcript}
    
    Please provide feedback in these categories:
    1. Opening and Hook
    2. Value Proposition
    3. Market Understanding
    4. Delivery and Communication
    5. Areas for Improvement
    
    Format the response as a JSON array of feedback points."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        feedback = response.choices[0].message.content
        return feedback
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        return ["Unable to generate AI feedback at this time. Please try again later."]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/save-transcript', methods=['POST'])
def save_transcript():
    try:
        data = request.json
        new_pitch = Pitch(
            stage=data['stage'],
            duration=data['duration'],
            transcript=data['transcript']
        )
        db.session.add(new_pitch)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Transcript saved successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/generate-feedback', methods=['POST'])
def get_feedback():
    try:
        data = request.json
        transcript = data.get('transcript')
        stage = data.get('stage')
        
        if not transcript or not stage:
            return jsonify({'success': False, 'message': 'Missing transcript or stage'}), 400
        
        feedback = generate_ai_feedback(transcript, stage)
        return jsonify({'success': True, 'feedback': feedback})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
