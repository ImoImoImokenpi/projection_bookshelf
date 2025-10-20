from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# --- 手元の本テーブル ---
class MyBook(Base):
    __tablename__ = "my_books"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(String, unique=True, nullable=True)
    title = Column(String)
    author = Column(String)
    cover = Column(String)

# --- 本棚テーブル ---
class Bookshelf(Base):
    __tablename__ = "bookshelves"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)


# from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
# from sqlalchemy.orm import relationship

# class Book(Base):
#     __tablename__ = "books"
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     isbn = Column(String, unique=True, nullable=False)
#     title = Column(String, nullable=True)
#     author = Column(String, nullable=True)
#     cover_url = Column(String, nullable=True)

#     positions = relationship("BookPosition", back_populates="book", cascade="all, delete-orphan")

# class Bookshelf(Base):
#     __tablename__ = "bookshelves"
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     name = Column(String, nullable=False)
#     description = Column(String, nullable=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())

#     positions = relationship("BookPosition", back_populates="bookshelf", cascade="all, delete-orphan")

# class BookPosition(Base):
#     __tablename__ = "book_positions"
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     bookshelf_id = Column(Integer, ForeignKey("bookshelves.id", ondelete="CASCADE"), nullable=False)
#     book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
#     x = Column(Float, nullable=True)
#     y = Column(Float, nullable=True)
#     z = Column(Float, nullable=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())

#     bookshelf = relationship("Bookshelf", back_populates="positions")
#     book = relationship("Book", back_populates="positions")

# # データベース作成例
# if __name__ == "__main__":
#     engine = create_engine("sqlite:///mybookshelf.db", echo=True)
#     Base.metadata.create_all(engine)
