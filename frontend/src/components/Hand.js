import React, { useState } from "react";

function Hand({ myBooks }) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{
            position: "fixed",
            right: "20px",
            bottom: "20px",
            zIndex: 1000,
        }}>
            {/* ボタン */}
            <div
                onClick={() => setOpen(!open)}
                style={{
                    cursor: "pointer",
                    fontSize: "24px",
                    padding: "10px 15px",
                    backgroundColor: "#ff6f61",
                    color: "white",
                    borderRadius: "50px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                }}
            >
                📚 {myBooks.length}
            </div>

            {/* ドロップダウン */}
            {open && (
                <div style={{
                    position: "absolute",
                    bottom: "60px",
                    right: 0,
                    width: "250px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "white",
                    color: "black",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                    padding: "10px",
                }}>
                    {myBooks.length === 0 ? (
                        <p style={{ margin: 0 }}>手元の本はありません</p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {myBooks.map((b, i) => (
                                <li key={i} style={{ padding: "5px 0", borderBottom: "1px solid #eee" }}>
                                    {b.title} - {b.author}
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
