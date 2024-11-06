from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pitches.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Pitch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stage = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
