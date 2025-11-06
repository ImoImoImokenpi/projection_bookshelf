import React, { useState } from "react";

function Hand({ myHand, setMyHand }) {
    const [open, setOpen] = useState(false);

    const handleDragStart = (e, book) => {
        e.dataTransfer.setData("bookId", book.id);

        const img = new Image();
        img.src = book.cover || "/no-image.png";
        img.width = 40;
        img.height = 60;
        e.dataTransfer.setDragImage(img, 20, 30);
    };

    const handleRemove = async(bookId) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/myhand/remove/${bookId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(`削除失敗: ${res.status}`);

            // 成功したらフロント側も更新
            setMyHand((prev) => prev.filter((b) => b.id !== bookId));
            console.log("✅ 手元の本削除成功:", bookId);
        } catch (err) {
            console.error("❌ 手元の本削除エラー:", err);
            alert("削除に失敗しました");
        }
    };

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
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}
            onClick={() => setOpen(!open)}
        >
            ✋ {myHand.length}
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
            {myHand.length === 0 ? (
                <p>手元の本はありません</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {myHand.map((b) => (
                    <li
                    key={String(b.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, b)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        padding: "8px 0",
                        cursor: "grab",
                        position: "relative",
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
                        {b.title.length > 25 ? b.title.slice(0, 25) + "…" : b.title}
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                        {b.author || "著者不明"}
                        </p>
                    </div>

                    {/* 削除ボタン */}
                    <button
                        onClick={() => handleRemove(b.id)}
                        style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "#e74c3c",
                        color: "#fff",
                        fontSize: "12px",
                        cursor: "pointer",
                        lineHeight: "18px",
                        textAlign: "center",
                        padding: 0,
                        }}
                    >
                        ×
                    </button>
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
