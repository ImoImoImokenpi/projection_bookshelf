import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Hand from "../components/Hand";

function Search() {
    const [query, setQuery] = useState("");
    const [books, setBooks] = useState([]);
    const [myHand, setMyHand] = useState([]); // 手元の本
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const perPage = 20;

    // 初回ロードで手元本を取得
    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/myhand");
            const data = await res.json();
            setMyHand(data.books || []);
        } catch (err) {
            console.error("手元本取得エラー:", err);
        }
    };

    // --- 検索 ---
    const handleSearch = async (p = 1) => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/search_books?q=${encodeURIComponent(query)}&page=${p}&per_page=${perPage}`
            );
            const data = await res.json();
            const validBooks = (data.books || []).filter(b => b.id);
            setBooks(validBooks);
            setPage(data.page || p);
            setTotalPages(data.total_pages || 1);
        } catch (error) {
            console.error("検索エラー:", error);
        }
        setLoading(false);
    };

    // --- 手元に追加 ---
    const addToMyHand = async (book) => {
        if (!book.id) {
            alert("書籍IDが見つかりません。");
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/add_to_myhand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(book),
            });
            const data = await res.json();
            alert(data.message || "手元に追加しました！");
            fetchMyBooks();
        } catch (error) {
            console.error("保存エラー:", error);
            alert("サーバーへの保存に失敗しました。");
        }
    };

    const viewDetails = (book) => {
        alert(
            `📘 タイトル: ${book.title}\n` +
            `👤 著者: ${book.author}\n` +
            `ID: ${book.id}\n` +
            `ISBN-13: ${book.isbn_13 || "不明"}\n` +
            `ISBN-10: ${book.isbn_10 || "不明"}`
        );
    };

    return (
        <div style={{ position: "relative" }}>
            <Navbar myHand={myHand} setMyHand={setMyHand} />
            <h1>本を探す</h1>

            {/* 検索フォーム */}
            <div style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder="書名で検索..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ padding: "8px", width: "300px", border: "1px solid #ccc", borderRadius: "5px", marginRight: "10px" }}
                />
                <button
                    onClick={() => handleSearch(1)}
                    style={{ padding: "8px 16px", borderRadius: "5px", border: "none", backgroundColor: "#007bff", color: "white", cursor: "pointer" }}
                >
                    検索
                </button>
            </div>

            {loading ? (
                <p>検索中...</p>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
                        {books.length === 0 ? (
                            <p>検索結果がありません。</p>
                        ) : (
                            books.map((book) => (
                                <div key={book.id} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "10px", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", transition: "transform 0.2s" }}>
                                    {book.cover ? (
                                        <img
                                            src={book.cover}
                                            alt={book.title}
                                            style={{ width: "100px", height: "150px", objectFit: "cover", borderRadius: "5px" }}
                                            onError={(e) => (e.target.style.display = "none")}
                                        />
                                    ) : (
                                        <div style={{ width: "100px", height: "150px", backgroundColor: "#f0f0f0", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: "12px" }}>
                                            No Image
                                        </div>
                                    )}
                                    <h3 style={{ fontSize: "14px", marginTop: "10px" }}>{book.title}</h3>
                                    <p style={{ fontSize: "12px", color: "#555" }}>{book.author}</p>

                                    <div style={{ marginTop: "10px" }}>
                                        <button
                                            onClick={() => viewDetails(book)}
                                            style={{ marginRight: "6px", padding: "5px 10px", borderRadius: "5px", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                        >
                                            詳細
                                        </button>
                                        <button
                                            onClick={() => addToMyHand(book)}
                                            style={{ padding: "5px 10px", borderRadius: "5px", border: "none", backgroundColor: "#28a745", color: "white", cursor: "pointer" }}
                                        >
                                            ＋ 手元に入れる
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ページネーション */}
                    {books.length > 0 && (
                        <div style={{ marginTop: "20px", textAlign: "center" }}>
                            <button onClick={() => handleSearch(page - 1)} disabled={page <= 1} style={{ marginRight: "10px" }}>前へ</button>
                            <span>{page} / {totalPages}</span>
                            <button onClick={() => handleSearch(page + 1)} disabled={page >= totalPages} style={{ marginLeft: "10px" }}>次へ</button>
                        </div>
                    )}
                </>
            )}

            {/* 右下フローティング */}
            <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
                <Hand myHand={myHand} setMyHand={setMyHand} />
            </div>
        </div>
    );
}

export default Search;
