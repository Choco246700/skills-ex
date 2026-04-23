import os
import uuid
import requests as py_requests
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, or_, and_
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from models import User, UserCreate, UserRead, LoginRequest, UserBase, UserUpdate, Message, MessageCreate, MessageRead, NotificationAcknowledgment
from database import engine, create_db_and_tables, seed_db, get_session
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel

app = FastAPI(title="Skills EX API")


GOOGLE_CLIENT_ID = "104003170147-f6sghra2gg6dogf5ctq3a5c5lpivvkgf.apps.googleusercontent.com"

class GoogleToken(BaseModel):
    token: str

# Add CORS so our frontend can talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers for Google Sign-In (Resolves 403 error on button resource load)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    # Allows the Google Sign-in popup to communicate back to our origin
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    # Note: Cross-Origin-Embedder-Policy might be too restrictive (require-corp)
    # so we usually stick to COOP for GSI unless strictly needed.
    return response

# Route to redirect root to homepage.html
@app.get("/")
def read_root():
    return RedirectResponse(url="/homepage.html")

@app.get("/admin.html")
def admin_redirect():
    return RedirectResponse(url="/admin-portal/index.html")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    seed_db()

@app.post("/signup", response_model=UserRead)
def signup(user_data: UserCreate, session: Session = Depends(get_session)):
    # Check if email exists
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # In a real app, hash the password!
    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=user_data.password, # For now, simple storage
        teach=user_data.teach,
        learn=user_data.learn,
        category=user_data.category,
        image=user_data.image
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.post("/login", response_model=UserRead)
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user or user.password_hash != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

@app.post("/auth/google", response_model=UserRead)
def google_auth(data: GoogleToken, action: str = "login", session: Session = Depends(get_session)):
    import time
    try:
        # Verify the Google Token
        id_info = id_token.verify_oauth2_token(data.token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        # Check if user exists
        user = session.exec(select(User).where(User.email == email)).first()
        
        if action == "login":
            if not user:
                raise HTTPException(status_code=401, detail="Account not found. Please sign up.")
            
            # Since we receive the latest profile from Google, update it if missing or using default
            updated = False
            if picture and (not user.image or "http" not in user.image):
                user.image = picture
                updated = True
            if name and user.name != name:
                user.name = name
                updated = True
                
            if updated:
                session.add(user)
                session.commit()
                session.refresh(user)

        elif action == "signup":
            if user:
                raise HTTPException(status_code=400, detail="Email already registered. Please log in.")
                
            # Create new user from Google data
            user = User(
                name=name,
                email=email,
                password_hash="google_auth",
                image=picture, # Use Google profile picture
                teach="Exploring", # Default
                learn="New Skills", # Default
                category="New Member"
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

@app.get("/users", response_model=List[UserRead])
def get_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users

@app.post("/users", response_model=UserRead)
def add_user(user_data: UserBase, session: Session = Depends(get_session)):
    import time
    # This is for adding a community member without a full auth flow (like the original addUser)
    # We'll generate a dummy email/password
    user = User(
        **user_data.dict(),
        email=f"{user_data.name.lower().replace(' ', '')}{int(time.time())}@example.com",
        password_hash="dummy"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}

@app.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, user_data: UserUpdate, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_dict = user_data.dict(exclude_unset=True)
    
    # Image handling logic
    new_image_url = update_dict.get("image")
    teach_skill = update_dict.get("teach") 
    
    # Only fetch a new image if the skill has CHANGED or they have NO image
    skill_changed = teach_skill is not None and teach_skill != user.teach
    needs_initial_image = not user.image or user.image == ""
    
    if (skill_changed or needs_initial_image) and (teach_skill or user.teach):
        effective_skill = teach_skill if teach_skill else user.teach
        if effective_skill and effective_skill.lower() not in ["exploring", ""]:
            # Auto-fetch from Unsplash
            new_image_url = f"https://source.unsplash.com/featured/800x600/?{effective_skill.replace(' ', ',')}"

    # If we have a URL (either provided or auto-generated), download it
    if new_image_url and new_image_url.startswith("http"):
        try:
            # Download image
            response = py_requests.get(new_image_url, timeout=10, allow_redirects=True)
            if response.status_code == 200:
                # Determine extension
                ext = ".jpg" # Default
                content_type = response.headers.get("Content-Type", "")
                if "png" in content_type: ext = ".png"
                elif "webp" in content_type: ext = ".webp"
                
                filename = f"skill-{uuid.uuid4().hex}{ext}"
                filepath = os.path.join("images", filename)
                
                # Ensure directory exists
                os.makedirs("images", exist_ok=True)
                
                with open(filepath, "wb") as f:
                    f.write(response.content)
                
                # Update the image field to the local filename
                update_dict["image"] = filename
        except Exception as e:
            print(f"Error downloading image: {e}")
            # If download fails, we just keep the existing image or use the URL as is (fall back)

    for key, value in update_dict.items():
        setattr(user, key, value)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.get("/users/{user_id}/notifications", response_model=List[UserRead])
def get_user_notifications(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.teach or user.teach.strip().lower() in ["exploring", ""]:
        return []
        
    # Find all users who want to learn what this user teaches
    all_users = session.exec(select(User)).all()
    
    # Get IDs of people this user has already messaged OR acknowledged
    messaged_messages = session.exec(
        select(Message).where(or_(Message.sender_id == user_id, Message.receiver_id == user_id))
    ).all()
    
    acknowledged = session.exec(
        select(NotificationAcknowledgment).where(NotificationAcknowledgment.user_id == user_id)
    ).all()

    excluded_ids = set()
    for m in messaged_messages:
        excluded_ids.add(m.sender_id)
        excluded_ids.add(m.receiver_id)
    for a in acknowledged:
        excluded_ids.add(a.target_id)

    notifications = []
    for other in all_users:
        if other.id == user_id or other.id in excluded_ids:
            continue
            
        # MUTUAL MATCHING: Notify if they teach what you learn OR you teach what they learn
        match_found = False
        u_learn = (user.learn or "").strip().lower()
        o_teach = (other.teach or "").strip().lower()
        u_teach = (user.teach or "").strip().lower()
        o_learn = (other.learn or "").strip().lower()

        if o_teach and u_learn and (o_teach in u_learn or u_learn in o_teach):
            match_found = True
        elif u_teach and o_learn and (u_teach in o_learn or o_learn in u_teach):
            match_found = True
            
        if match_found:
            notifications.append(other)
            
    return notifications

@app.post("/users/{user_id}/notifications/acknowledge/{target_id}")
def acknowledge_notification(user_id: int, target_id: int, session: Session = Depends(get_session)):
    ack = session.exec(
        select(NotificationAcknowledgment)
        .where(NotificationAcknowledgment.user_id == user_id)
        .where(NotificationAcknowledgment.target_id == target_id)
    ).first()
    
    if not ack:
        ack = NotificationAcknowledgment(user_id=user_id, target_id=target_id)
        session.add(ack)
        session.commit()
    return {"status": "ok"}

@app.get("/messages", response_model=List[MessageRead])
def get_messages(user1_id: int, user2_id: int, session: Session = Depends(get_session)):
    messages = session.exec(
        select(Message).where(
            or_(
                and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
                and_(Message.sender_id == user2_id, Message.receiver_id == user1_id)
            )
        ).order_by(Message.timestamp)
    ).all()
    return messages

@app.post("/messages", response_model=MessageRead)
def send_message(msg: MessageCreate, session: Session = Depends(get_session)):
    message = Message(**msg.dict())
    session.add(message)
    session.commit()
    session.refresh(message)
    return message

@app.get("/users/{user_id}/chats", response_model=List[UserRead])
def get_chats(user_id: int, session: Session = Depends(get_session)):
    messages = session.exec(
        select(Message).where(or_(Message.sender_id == user_id, Message.receiver_id == user_id))
    ).all()
    
    partner_ids = set()
    for m in messages:
        if m.sender_id != user_id:
            partner_ids.add(m.sender_id)
        if m.receiver_id != user_id:
            partner_ids.add(m.receiver_id)
            
    if not partner_ids:
        return []
        
    users = session.exec(select(User).where(User.id.in_(partner_ids))).all()
    return users

@app.get("/matches")
def get_matches(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    matches = []
    
    # Matching logic (mentorship & reciprocal)
    for i in range(len(users)):
        for j in range(i + 1, len(users)):
            a, b = users[i], users[j]
            a_teaches_b_wants = (a.teach and b.learn and a.teach.lower() == b.learn.lower())
            b_teaches_a_wants = (b.teach and a.learn and b.teach.lower() == a.learn.lower())
            
            if a_teaches_b_wants and b_teaches_a_wants:
                matches.append({"a": a, "b": b, "type": "exchange"})
            elif a_teaches_b_wants:
                matches.append({"teacher": a, "learner": b, "type": "mentorship"})
            elif b_teaches_a_wants:
                matches.append({"teacher": b, "learner": a, "type": "mentorship"})
                
    return matches

# Mount the current directory to serve HTML/CSS/JS files
# IMPORTANT: This must be at the END of the file so it doesn't block the API routes above.
app.mount("/", StaticFiles(directory=".", html=True), name="static")
