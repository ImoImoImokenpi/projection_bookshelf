from fastapi import FastAPI, Query, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
import requests
from database import Base, engine, SessionLocal
from models import MyHand, MyBooks, Bookshelf, BookPosition
from sqlalchemy import func

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

# --- 手元の本の表示 ---
@app.get("/myhand")
def get_mybooks(db: Session = Depends(get_db)):
    """手元の本一覧を取得"""
    books = db.query(MyHand).all()
    return {"books": [
        {"id": b.id, "book_id": b.book_id, "title": b.title, "author": b.author, "cover": b.cover}
        for b in books
    ]}

# --- 手元の本の数をカウント ---
@app.get("/myhand/count")
def get_myhand_count(db: Session = Depends(get_db)):
    """現在の手元の本の数を返す"""
    count = db.query(MyHand).count()
    return {"count": count}

# --- 手元の本に本を追加 ---
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
    start, end = (page - 1) * per_page, page * per_page

    return {
        "books": books[start:end],
        "page": page,
        "total_pages": total_pages
    }

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

# --- 手元→棚 追加 ---
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

@app.patch("/bookshelf/update_positions")
def update_positions(payload: dict = Body(...), db: Session = Depends(get_db)):
    """複数の本の位置情報をまとめて更新"""
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

