from fastapi import FastAPI, Query, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
import requests, time, json, os
from functools import lru_cache
from database import Base, engine, SessionLocal
from models import MyHand, MyBooks, Bookshelf, BookPosition
from sqlalchemy import func
from sentence_transformers import SentenceTransformer, util
import numpy as np

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

# --- GoogleAPI ---
GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

CACHE_FILE = "book_cache.json"

# --- 手元の本の取得 ---
@app.get("/myhand")
def get_mybooks(db: Session = Depends(get_db)):
    """手元の本一覧を取得"""
    books = db.query(MyHand).all()
    return {"books": [
        {"id": b.id, "book_id": b.book_id, "title": b.title, "author": b.author, "cover": b.cover}
        for b in books
    ]}

# --- 手元の本をカウント ---
@app.get("/myhand/count")
def get_myhand_count(db: Session = Depends(get_db)):
    """現在の手元の本の数を返す"""
    count = db.query(MyHand).count()
    return {"count": count}

# --- 手元の本に追加 ---
@app.post("/add_to_myhand")
def add_to_myhand(book: dict, db: Session = Depends(get_db)):
    """手元の本をSQLiteに保存（IDベース）"""
    book_id = book.get("id")
    if not book_id:
        raise HTTPException(status_code=400, detail="書籍IDが必要です")

    existing = db.query(MyHand).filter(MyHand.book_id == book_id).first()
    if existing:
        return {"message": "すでに手元にあります"}

    new_book = MyHand(
        book_id=book_id,
        title=book.get("title"),
        author=book.get("author"),
        cover=book.get("cover"),
    )
    db.add(new_book)
    db.commit()
    return {"message": "手元に追加しました"}

@app.delete("/myhand/remove/{book_id}")
def remove_myhand_book(book_id: int, db: Session = Depends(get_db)):
    """
    手元の本 (MyHand) を削除
    """
    book = db.query(MyHand).filter(MyHand.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="本が見つかりません")
    
    db.delete(book)
    db.commit()

    # 削除後の手元の本リストも返す
    books = db.query(MyHand).all()
    return {
        "status": "success",
        "deleted_book_id": book_id,
        "books": [
            {"id": b.id, "book_id": b.book_id, "title": b.title, "author": b.author, "cover": b.cover}
            for b in books
        ]
    }

# --- 書籍の検索 ---
@app.get("/search_books")
def search_books(q: str = Query(...), page: int = 1, per_page: int = 20):
    """Google Books APIから書籍を検索（ページ対応）"""
    try:
        start_index = (page - 1) * per_page
        params = {
            "q": q,
            "maxResults": per_page,
            "startIndex": start_index,
        }
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

    # Google Books APIには全件数が明示されないことが多いため仮で1000冊までとする
    total_pages = min((1000 // per_page), 50)

    return {
        "books": books,
        "page": page,
        "total_pages": total_pages
    }

# --- 本棚の本の取得 ---
@app.get("/bookshelf/books")
def get_bookshelf_books(db: Session = Depends(get_db)):
    results = (
        db.query(MyBooks, BookPosition)
        .join(BookPosition, MyBooks.id == BookPosition.mybook_id)
        .all()
    )

    books = []
    for book, pos in results:
        books.append({
            "id": book.id,
            "book_id": book.book_id,
            "title": book.title,
            "author": book.author,
            "cover": book.cover,
            "x": pos.x,
            "y": pos.y,
            "shelfIndex": pos.shelf_index,
            "orderIndex": pos.order_index,
        })
    return {"books": books}

# --- 手元→棚に移動 ---
@app.post("/bookshelf/add_book")
def add_book_to_shelf(
    book_id: str = Body(..., embed=True),  # MyHand側のbook_id
    shelf_id: int = Body(..., embed=True),  # 追加する本棚ID
    db: Session = Depends(get_db)
):
    
    # --- 手元の本を取得 ---
    hand_book = db.query(MyHand).filter(MyHand.book_id == book_id).first()
    if not hand_book:
        raise HTTPException(status_code=404, detail="手元の本が見つかりません")

    # --- MyBooksに登録済みかチェック ---
    existing = db.query(MyBooks).filter(MyBooks.book_id == book_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="既に本棚に登録済みです")

    # --- MyBooksに追加 ---
    new_book = MyBooks(
        book_id=hand_book.book_id,
        title=hand_book.title,
        author=hand_book.author,
        cover=hand_book.cover
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    # --- BookPositionを作成 ---
    # 初期値: x=0, y=0, shelf_index=0, order_index=0
    new_position = BookPosition(
        bookshelf_id=shelf_id,
        mybook_id=new_book.id,
        x=0.0,
        y=0.0,
        shelf_index=0,
        order_index=0
    )
    db.add(new_position)

    # --- 手元から削除 ---
    db.delete(hand_book)

    db.commit()

    return {
        "message": "本を本棚に移動しました",
        "book": {
            "id": new_book.id,
            "book_id": new_book.book_id,
            "title": new_book.title,
            "author": new_book.author,
            "cover": new_book.cover,
            "position": {
                "x": new_position.x,
                "y": new_position.y,
                "shelfIndex": new_position.shelf_index,
                "orderIndex": new_position.order_index
            }
        }
    }

# --- 本棚上の位置を更新 ---
@app.patch("/bookshelf/update_positions")
def update_positions(payload: dict = Body(...), db: Session = Depends(get_db)):
    positions = payload.get("positions", [])
    if not positions:
        raise HTTPException(status_code=400, detail="positionsが空です")

    for p in positions:
        pos = db.query(BookPosition).filter(BookPosition.mybook_id == p["mybook_id"]).first()
        if not pos:
            continue
        pos.shelf_index = p["shelf_index"]
        pos.order_index = p["order_index"]
        pos.x = p["x"]
        pos.y = p["y"]

    db.commit()
    return {"message": f"{len(positions)}件の位置を更新しました"}

@app.delete("/bookshelf/remove/{book_id}")
def remove_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(BookPosition).filter(BookPosition.mybook_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return {"message": "Book removed successfully", "book_id": book_id}


# --- キャッシュファイルをロード ---
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        book_cache = json.load(f)
else:
    book_cache = {}

def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(book_cache, f, ensure_ascii=False, indent=2)

@lru_cache(maxsize=256)
def fetch_book_info(title, author=""):
    """Google Books APIから追加情報を取得（キャッシュ対応）"""
    key = f"{title}_{author}".strip()
    if key in book_cache:
        return book_cache[key]

    query = f"{title} {author}".strip()
    url = f"{GOOGLE_BOOKS_API}?q={query}"
    try:
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        if "items" not in data:
            return {}
        info = data["items"][0]["volumeInfo"]
        extra = {
            "description": info.get("description", ""),
            "categories": ", ".join(info.get("categories", [])),
            "publisher": info.get("publisher", ""),
            "publishedDate": info.get("publishedDate", ""),
        }
        book_cache[key] = extra
        save_cache()
        time.sleep(0.1)  # rate limit対策
        return extra
    except Exception:
        return {}
    
# --- GET でもネットワークを取得できるように変更 ---
@app.get("/books/network")
def get_book_network(db: Session = Depends(get_db)):
    books = db.query(MyBooks).all()
    if not books:
        raise HTTPException(status_code=404, detail="No books found")

    enriched_texts = []
    for b in books:
        extra = fetch_book_info(b.title, b.author or "")
        text = (
            f"Title: {b.title}. Author: {b.author or 'Unknown'}. "
            f"Category: {extra.get('categories', '')}. "
            f"Publisher: {extra.get('publisher', '')}. "
            f"Published: {extra.get('publishedDate', '')}. "
            f"Description: {extra.get('description', '') or 'No description available.'}"
        )
        enriched_texts.append(text)

    embeddings = model.encode(enriched_texts, convert_to_tensor=True, normalize_embeddings=True)
    sim_matrix = util.cos_sim(embeddings, embeddings).cpu().numpy()

    nodes = [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "cover": b.cover or "https://via.placeholder.com/80x110?text=No+Cover",
        }
        for b in books
    ]

    links = []
    threshold = 0.55
    for i in range(len(books)):
        for j in range(i + 1, len(books)):
            sim = float(sim_matrix[i][j])
            if sim > threshold:
                links.append({
                    "source": books[i].id,
                    "target": books[j].id,
                    "similarity": round(sim, 3)
                })

    return {"nodes": nodes, "links": links}
