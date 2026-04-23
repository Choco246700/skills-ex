from sqlmodel import create_engine, SQLModel, Session
from models import User

sqlite_file_name = "skillex.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# Initial Seed Data
SEED_DATA = [
    {"name": "Alex J.", "teach": "Acoustic Guitar", "learn": "Photography", "category": "Music", "rating": 4.9, "image": "skill-guitar.jpg", "email": "alex@example.com", "password_hash": "dummy"},
    {"name": "Sarah M.", "teach": "Sourdough Baking", "learn": "Gardening", "category": "Culinary", "rating": 4.8, "image": "skill-baking.jpg", "email": "sarah@example.com", "password_hash": "dummy"},
    {"name": "David K.", "teach": "UX/UI Principles", "learn": "Python", "category": "Tech", "rating": 5.0, "image": "skill-uxui.jpg", "email": "david@example.com", "password_hash": "dummy"},
    {"name": "Yuka T.", "teach": "Conversational Japanese", "learn": "Cooking", "category": "Language", "rating": 4.9, "image": "skill-japanese.jpg", "email": "yuka@example.com", "password_hash": "dummy"},
    {"name": "Liam O.", "teach": "Intro to Python", "learn": "Music", "category": "Tech", "rating": 4.7, "image": "skill-python.jpg", "email": "liam@example.com", "password_hash": "dummy"},
    {"name": "Marco V.", "teach": "Pasta from Scratch", "learn": "Photography", "category": "Culinary", "rating": 4.9, "image": "skill-pasta.jpg", "email": "marco@example.com", "password_hash": "dummy"},
    {"name": "Elena R.", "teach": "Digital Photography", "learn": "Design", "category": "Art", "rating": 4.8, "image": "skill-photography.jpg", "email": "elena@example.com", "password_hash": "dummy"},
    {"name": "Chloe S.", "teach": "Vinyasa Yoga", "learn": "Medititation", "category": "Fitness", "rating": 5.0, "image": "skill-yoga.jpg", "email": "chloe@example.com", "password_hash": "dummy"},
    {"name": "Sam T.", "teach": "Adobe Illustrator", "learn": "Art", "category": "Design", "rating": 4.6, "image": "skill-illustrator.jpg", "email": "sam@example.com", "password_hash": "dummy"},
    {"name": "Marie L.", "teach": "Beginner French", "learn": "Cooking", "category": "Language", "rating": 4.9, "image": "skill-french.jpg", "email": "marie@example.com", "password_hash": "dummy"},
    {"name": "James W.", "teach": "Startup Pitching", "learn": "Public Speaking", "category": "Business", "rating": 4.8, "image": "skill-startup.jpg", "email": "james@example.com", "password_hash": "dummy"},
    {"name": "Robert B.", "teach": "Personal Finance", "learn": "Investment", "category": "Finance", "rating": 4.7, "image": "skill-finance.jpg", "email": "robert@example.com", "password_hash": "dummy"},
    {"name": "Garry N.", "teach": "Chess Openings", "learn": "Logic", "category": "Strategy", "rating": 5.0, "image": "skill-chess.jpg", "email": "garry@example.com", "password_hash": "dummy"},
    {"name": "Nina P.", "teach": "Ceramics Basics", "learn": "Painting", "category": "Crafts", "rating": 4.9, "image": "skill-ceramics.jpg", "email": "nina@example.com", "password_hash": "dummy"},
    {"name": "Ben C.", "teach": "Wilderness Lore", "learn": "Survival", "category": "Outdoors", "rating": 4.8, "image": "skill-wilderness.jpg", "email": "ben@example.com", "password_hash": "dummy"},
    {"name": "Mark L.", "teach": "Gardening Basics", "learn": "Composting", "category": "Lifestyle", "rating": 4.7, "image": "skill-gardening.jpg", "email": "mark@example.com", "password_hash": "dummy"},
    {"name": "Sophie R.", "teach": "Social Media Marketing", "learn": "Business", "category": "Business", "rating": 4.8, "image": "skill-marketing.jpg", "email": "sophie@example.com", "password_hash": "dummy"},
    {"name": "Tom H.", "teach": "Woodworking 101", "learn": "Crafts", "category": "Crafts", "rating": 4.9, "image": "skill-woodworking.jpg", "email": "tom@example.com", "password_hash": "dummy"},
    {"name": "Emily D.", "teach": "Creative Writing", "learn": "Arts", "category": "Arts", "rating": 5.0, "image": "skill-writing.jpg", "email": "emily@example.com", "password_hash": "dummy"},
    {"name": "Dr. Aris", "teach": "Data Science Basis", "learn": "AI", "category": "Tech", "rating": 4.9, "image": "skill-datascience.jpg", "email": "aris@example.com", "password_hash": "dummy"}
]

def seed_db():
    with Session(engine) as session:
        if session.query(User).count() == 0:
            for data in SEED_DATA:
                user = User(**data)
                session.add(user)
            session.commit()
