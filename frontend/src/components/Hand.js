import React, { useState } from "react";

function Hand({ myBooks }) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: "relative" }}>
            {/* フローティングボタン */}
            <div
                style={{
                    cursor: "pointer",
                    fontSize: "20px",
                    padding: "10px 15px",
                    backgroundColor: "#ff4800",
                    color: "white",
                    borderRadius: "50%",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                }}
                onClick={() => setOpen(!open)}
            >
                ✋ {myBooks.length}
            </div>

            {/* 展開リスト */}
            {open && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        bottom: "50px",
                        width: "250px",
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        padding: "10px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        zIndex: 100,
                    }}
                >
                    {myBooks.length === 0 ? (
                        <p>手元の本はありません</p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {myBooks.map((b) => (
                                <li
                                    key={String(b.id)} // ID を文字列化して厳密比較対応
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        borderBottom: "1px solid #eee",
                                        padding: "8px 0",
                                    }}
                                >
                                    {/* 表紙画像 */}
                                    {b.cover ? (
                                        <img
                                            src={b.cover}
                                            alt={b.title}
                                            style={{
                                                width: "40px",
                                                height: "60px",
                                                objectFit: "cover",
                                                borderRadius: "4px",
                                                marginRight: "10px",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: "40px",
                                                height: "60px",
                                                backgroundColor: "#f0f0f0",
                                                borderRadius: "4px",
                                                marginRight: "10px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#999",
                                                fontSize: "10px",
                                            }}
                                        >
                                            No Img
                                        </div>
                                    )}

                                    {/* 書籍情報 */}
                                    <div style={{ flex: 1 }}>
                                        <p
                                            style={{
                                                margin: "0 0 4px",
                                                fontSize: "13px",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {b.title.length > 25
                                                ? b.title.slice(0, 25) + "…"
                                                : b.title}
                                        </p>
                                        <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                                            {b.author}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default Hand;
