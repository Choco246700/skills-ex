# Skills EX — Community Skill Exchange Platform

Skills EX is a premium, community-driven skill exchange platform designed specifically for student communities (starting with KNUST). It enables users to bridge knowledge gaps through reciprocal learning, mentorship, and real-time connections.

## 🚀 Vision
To democratize learning by removing financial barriers and information asymmetry, fostering a community where "trading what you know for what you want to learn" is the new currency.

## ✨ High-Impact Features

### 🎊 Match Celebration System
When two users' skills align (Reciprocal Exchange or Mentorship), the platform triggers a high-fidelity "Match Celebration" using confetti algorithms and immersive modals to reward community engagement.

### 🌓 Professional Dark Mode
A state-of-the-art dark mode implementation with persistent state management, providing an accessibility-first experience for late-night learning sessions.

### 📊 Admin Category Pulse
A live dashboard for community administrators to monitor skill distribution, member growth, and connection activity in real-time.

### 🛡️ Dynamic Badge System
An automated trust system that awards badges (Verified, Expert, Active Learner) based on user activity and community verification.

### 💬 Real-time Communication
Integrated messaging system allowing users to coordinate their skill exchanges directly within the platform.

### 🔑 Secure Authentication
Seamless Google OAuth 2.0 integration for quick onboarding, alongside a robust local authentication system.

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python), SQLModel ORM, SQLite Database.
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3 (Flexbox/Grid), Lucide Icons.
- **Services**: Google OAuth 2.0, Unsplash API (Auto-generated skill imagery), Canvas-Confetti.

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd classProject
   ```

2. **Set up the virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**:
   ```bash
   uvicorn main:app --reload
   ```

5. **Access the platform**:
   Open `http://localhost:8000` in your browser.

## 📂 Project Structure

- `main.py`: FastAPI server and API endpoints.
- `models.py`: SQLModel database schemas.
- `database.py`: Database connection and seeding logic.
- `index.js`: Core frontend logic and state management.
- `styles.css`: Premium design system and utility classes.
- `admin-portal/`: Dedicated administrative dashboard.
- `presentation.html`: Official project presentation slide deck.

---

*Developed by Group 19 — 2026*
