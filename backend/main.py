from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import requests

from database import Base, engine, SessionLocal
from models import MyBook, Bookshelf

# --- DB初期化 ---
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS設定（開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

# --- 手元本取得 ---
@app.get("/mybooks")
def get_mybooks(db: Session = Depends(get_db)):
    """手元の本一覧を取得"""
    books = db.query(MyBook).all()
    return {"books": [
        {"id": b.book_id, "title": b.title, "author": b.author, "cover": b.cover}
        for b in books
    ]}

@app.get("/mybooks/count")
def get_mybook_count(db: Session = Depends(get_db)):
    """現在の手元の本の数を返す"""
    count = db.query(MyBook).count()
    return {"count": count}

# --- 書籍検索 ---
@app.get("/search_books")
def search_books(q: str = Query(...), page: int = 1, per_page: int = 20):
    """Google Books APIから書籍を検索（IDベース）"""
    try:
        params = {"q": q, "maxResults": 40}  # まず40冊取得
        res = requests.get(GOOGLE_BOOKS_API, params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

    books = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        book_id = item.get("id")
        if not book_id:
            continue
        books.append({
            "id": book_id,
            "title": info.get("title", "不明"),
            "author": ", ".join(info.get("authors", [])) if "authors" in info else "不明",
            "cover": info.get("imageLinks", {}).get("thumbnail"),
            "isbn_13": next((i["identifier"] for i in info.get("industryIdentifiers", []) if i["type"]=="ISBN_13"), None),
            "isbn_10": next((i["identifier"] for i in info.get("industryIdentifiers", []) if i["type"]=="ISBN_10"), None),
        })

    # ページネーション
    total_pages = (len(books) + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    paged_books = books[start:end]

    return {
        "books": paged_books,
        "page": page,
        "total_pages": total_pages
    }

# --- 手元に追加 ---
@app.post("/add_to_mybooks")
def add_to_mybooks(book: dict, db: Session = Depends(get_db)):
    """手元の本をSQLiteに保存（IDベース）"""
    book_id = book.get("id")
    if not book_id:
        raise HTTPException(status_code=400, detail="書籍IDが必要です")

    existing = db.query(MyBook).filter(MyBook.book_id == book_id).first()
    if existing:
        return {"message": "すでに手元にあります"}

    new_book = MyBook(
        book_id=book_id,
        title=book.get("title"),
        author=book.get("author"),
        cover=book.get("cover"),
    )
    db.add(new_book)
    db.commit()
    return {"message": "手元に追加しました"}
