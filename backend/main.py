from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発中は全許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

@app.get("/search_books")
def search_books(q: str = Query(..., description="検索キーワード")):
    """Google Books APIから書籍を検索"""
    params = {"q": q, "maxResults": 10}
    res = requests.get(GOOGLE_BOOKS_API, params=params)
    data = res.json()

    books = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        books.append({
            "title": info.get("title", "不明"),
            "author": ", ".join(info.get("authors", [])) if "authors" in info else "不明",
            "cover": info.get("imageLinks", {}).get("thumbnail"),
            "publisher": info.get("publisher", "不明"),
            "publishedDate": info.get("publishedDate", ""),
        })

    return {"books": books}
