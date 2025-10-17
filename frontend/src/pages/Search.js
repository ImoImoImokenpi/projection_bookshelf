import React, { useState } from "react";
import Navbar from "../components/Navbar"; 
import Hand from "../components/Hand";

function Search({ myBooks, setMyBooks }) {
    const [query, setQuery] = useState("");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/search_books?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setBooks(data.books || []);
        } catch (error) {
            console.error("検索エラー:", error);
        }
        setLoading(false);
    };

    const addToMyBooks = (book) => {
        if (!myBooks.some(b => b.isbn === book.isbn)) {
            setMyBooks([...myBooks, book]);
        }
    };

    const viewDetails = (book) => {
        alert(`タイトル: ${book.title}\n著者: ${book.author}\nISBN: ${book.isbn}`);
    };

    return (
        <div style={{ position: "relative" }}>
            <Navbar myBooks={myBooks} />
            <h1>本を探す</h1>

            <div style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder="書名で検索..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        padding: "8px",
                        width: "300px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        marginRight: "10px",
                    }}
                />
                <button
                    onClick={handleSearch}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "5px",
                        border: "none",
                        backgroundColor: "#007bff",
                        color: "white",
                        cursor: "pointer",
                    }}
                >
                    検索
                </button>
            </div>

            {loading ? (
                <p>検索中...</p>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "20px",
                    }}
                >
                    {books.length === 0 ? (
                        <p>検索結果がありません。</p>
                    ) : (
                        books.map((book, index) => (
                            <div
                                key={index}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "10px",
                                    padding: "10px",
                                    textAlign: "center",
                                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                                }}
                            >
                                {book.cover ? (
                                    <img
                                        src={book.cover}
                                        alt={book.title}
                                        style={{ width: "100px", height: "150px", objectFit: "cover" }}
                                        onError={(e) => (e.target.style.display = "none")}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100px",
                                            height: "150px",
                                            backgroundColor: "#f0f0f0",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#888",
                                            fontSize: "12px",
                                        }}
                                    >
                                        No Image
                                    </div>
                                )}
                                <h3 style={{ fontSize: "14px", marginTop: "10px" }}>{book.title}</h3>
                                <p style={{ fontSize: "12px", color: "#555" }}>{book.author}</p>
                                <div>
                                    <button onClick={() => viewDetails(book)}>詳細を見る</button>
                                    <button onClick={() => addToMyBooks(book)}>手元に入れる</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 右下フローティング */}
            <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
                <Hand myBooks={myBooks} />
            </div>
        </div>
    );
}

export default Search;
