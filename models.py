from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from pydantic import EmailStr

class UserBase(SQLModel):
    name: str = Field(index=True)
    teach: Optional[str] = None
    learn: Optional[str] = None
    category: Optional[str] = "Community"
    rating: float = 4.5
    image: Optional[str] = None

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str

class UserCreate(UserBase):
    email: EmailStr
    password: str

class UserRead(UserBase):
    id: int
    email: EmailStr

class LoginRequest(SQLModel):
    email: EmailStr
    password: str

from datetime import datetime

class UserUpdate(SQLModel):
    teach: Optional[str] = None
    learn: Optional[str] = None
    image: Optional[str] = None

class MessageBase(SQLModel):
    content: str
    sender_id: int = Field(foreign_key="user.id", index=True)
    receiver_id: int = Field(foreign_key="user.id", index=True)

class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    id: int
    timestamp: datetime

class NotificationAcknowledgment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    target_id: int = Field(index=True)
