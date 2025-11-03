from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

# --- 手元の本テーブル ---
class MyHand(Base):
    __tablename__ = "my_hand"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(String, unique=True, nullable=True)  # 外部IDやISBNなど
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    cover = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# --- の本テーブル ---
class MyBooks(Base):
    __tablename__ = "my_books"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(String, unique=True, nullable=True)  # 外部IDやISBNなど
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    cover = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 本棚に置かれている場合のリレーション
    positions = relationship("BookPosition", back_populates="mybook", cascade="all, delete-orphan")


# --- 本棚テーブル ---
class Bookshelf(Base):
    __tablename__ = "bookshelves"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 本棚内の本の座標
    positions = relationship("BookPosition", back_populates="bookshelf", cascade="all, delete-orphan")


# --- 本棚内の本の座標テーブル ---
class BookPosition(Base):
    __tablename__ = "book_positions"

    id = Column(Integer, primary_key=True, index=True)
    bookshelf_id = Column(Integer, ForeignKey("bookshelves.id", ondelete="CASCADE"), nullable=False)
    mybook_id = Column(Integer, ForeignKey("my_books.id", ondelete="CASCADE"), nullable=False)
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    shelf_index = Column(Integer, nullable=True)  # 棚番号
    order_index = Column(Integer, nullable=True)  # 棚内の順序
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bookshelf = relationship("Bookshelf", back_populates="positions")
    mybook = relationship("MyBooks", back_populates="positions")
