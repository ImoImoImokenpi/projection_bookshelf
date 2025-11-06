import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const ShelfWithBooks = ({ bookshelf, setBookshelf, myHand, setMyHand }) => {
    // ---------- Refs ----------
    const svgRef = useRef();
    const containerRef = useRef();
    const bookshelfRef = useRef(bookshelf);
    const myHandRef = useRef(myHand);

    // ---------- State ----------
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: "" });
    const [selectedBook, setSelectedBook] = useState(null); // 詳細用

    // ---------- 定数 ----------
    const WIDTH = 500;
    const HEIGHT = 590;

    const NUM_SHELVES = 3;
    const SHELF_MARGIN = 20;
    const SHELF_HEIGHT = 170;
    const SHELF_GAP = 20;

    const BOOK_WIDTH = 80;
    const BOOK_HEIGHT = 120;

    const WOOD_URL = "/sources/wood_texture.jpg";
    const DARK_WOOD_URL = "/sources/dark_wood_texture.jpg";

    // ---------- Refs更新 ----------
    useEffect(() => { bookshelfRef.current = bookshelf; }, [bookshelf]);
    useEffect(() => { myHandRef.current = myHand; }, [myHand]);

    // ---------- 初回のみ本棚データ取得 ----------
    useEffect(() => {
        const fetchBookshelf = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/bookshelf/books");
                if (!res.ok) throw new Error(`status ${res.status}`);
                const data = await res.json();
                console.log("API結果:", data.books);
                setBookshelf(Array.isArray(data?.books) ? data.books : []);
            } catch (err) {
                console.warn("本棚取得に失敗:", err);
                setBookshelf([]);
            }
        };
        fetchBookshelf();
    }, [setBookshelf]);

    // ---------- D3描画 ----------
    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr("width", WIDTH)
            .attr("height", HEIGHT);
        svg.selectAll("*").remove();

        // 木目定義
        const defs = svg.append("defs");
        defs.append("pattern")
            .attr("id", "frameWood")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .append("image")
            .attr("href", WOOD_URL)
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .attr("preserveAspectRatio", "xMidYMid slice");

        defs.append("pattern")
            .attr("id", "shelfWoodDark")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", WIDTH - 2 * SHELF_MARGIN)
            .attr("height", SHELF_HEIGHT)
            .append("image")
            .attr("href", DARK_WOOD_URL)
            .attr("width", WIDTH - 2 * SHELF_MARGIN)
            .attr("height", SHELF_HEIGHT)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("opacity", 0.35);

        svg.append("rect")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .attr("fill", "url(#frameWood)");

        // 棚を生成
        const shelves = [];
        for (let i = 0; i < NUM_SHELVES; i++) {
            const y = SHELF_MARGIN + i * (SHELF_HEIGHT + SHELF_GAP);
            shelves.push({ x: SHELF_MARGIN, y, width: WIDTH - 2 * SHELF_MARGIN, height: SHELF_HEIGHT, books: [] });

            svg.append("rect")
                .attr("x", SHELF_MARGIN)
                .attr("y", y)
                .attr("width", WIDTH - 2 * SHELF_MARGIN)
                .attr("height", SHELF_HEIGHT)
                .attr("fill", "url(#shelfWoodDark)")
                .attr("stroke", "#5a3c1b")
                .attr("stroke-width", 2);
        }

        // 本を棚に割り当て
        bookshelf.forEach((b) => {
            const idx = Math.max(0, Math.min(NUM_SHELVES - 1, b.shelfIndex || 0));
            shelves[idx].books.push(b);
        });

        // 左詰め・下揃え配置
        shelves.forEach((shelf) => {
            shelf.books.forEach((b, i) => {
                if (b.x == null || b.y == null) {
                    b.x = shelf.x + i * BOOK_WIDTH;
                    b.y = shelf.y + shelf.height - BOOK_HEIGHT;
                }
            });
        });

        const bookDraw = svg
            .selectAll("image.book")
            .data(bookshelf, (d) => d.id)
            .join("image")
            .attr("class", "book")
            .attr("xlink:href", (d) => d.cover)
            .attr("width", BOOK_WIDTH)
            .attr("height", BOOK_HEIGHT)
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .style("cursor", "grab")
            .on("mouseover", (event, d) =>
                setTooltip({ visible: true, x: event.pageX, y: event.pageY, title: d.title })
            )
            .on("mousemove", (event) =>
                setTooltip((t) => ({ ...t, x: event.pageX, y: event.pageY }))
            )
            .on("mouseout", () => setTooltip((t) => ({ ...t, visible: false })));

        let dragStartTime = 0;
        let placeholderRect = null;

        // 本を棚間でドラッグ可能
        bookDraw.call(
            d3.drag()
                .on("start", function () {
                    dragStartTime = Date.now();
                    d3.select(this).raise().style("cursor", "grabbing");
                })
                .on("drag", function (event, d) {
                    d.x = event.x - BOOK_WIDTH / 2;
                    d.y = event.y - BOOK_HEIGHT / 2;
                    d3.select(this).attr("x", d.x).attr("y", d.y);

                    // ---------- プレイスホルダー表示 ----------
                    const [pointerX, pointerY] = d3.pointer(event, svg.node());

                    const targetShelf = shelves.find((s) => {
                        const shelfCenter = s.y + s.height / 2;
                        const verticalTolerance = BOOK_HEIGHT * 0.8; // ← 縦方向の反応範囲
                        return (
                            pointerY >= shelfCenter - verticalTolerance &&
                            pointerY <= shelfCenter + verticalTolerance
                        );
                    });

                    // 棚に該当しない場合は、プレイスホルダーを削除して終了
                    if (!targetShelf) {
                        if (placeholderRect) {
                            placeholderRect.remove();
                            placeholderRect = null;
                        }
                        return;
                    }

                    const relativeX = pointerX - targetShelf.x;
                    const insertIndex = Math.min(
                        targetShelf.books.length,
                        Math.max(0, Math.floor(relativeX / BOOK_WIDTH))
                    );

                    // プレイスホルダーを描画
                    if (!placeholderRect) {
                        placeholderRect = svg.append("rect")
                            .attr("class", "placeholder")
                            .attr("fill", "rgba(0, 123, 255, 0.3)")
                            .attr("stroke", "#007bff")
                            .attr("stroke-dasharray", "4 2")
                            .attr("width", BOOK_WIDTH)
                            .attr("height", BOOK_HEIGHT);
                        }

                        placeholderRect
                            .attr("x", targetShelf.x + insertIndex * BOOK_WIDTH)
                            .attr("y", targetShelf.y + targetShelf.height - BOOK_HEIGHT);
                        
                        const otherBooks = targetShelf.books.filter((b) => b.id !== d.id);

                        otherBooks.forEach((b, i) => {
                            const newIndex =
                                i >= insertIndex ? i + 1 : i;
                                
                            d3.select(svgRef.current)
                            .selectAll("image.book")
                            .filter((imgData) => imgData.id === b.id)
                            .transition()
                            .duration(150)
                            .attr("x", targetShelf.x + newIndex * BOOK_WIDTH);
                        });
                    })
                    .on("end", async function (event, d) {
                        d3.select(this).style("cursor", "grab");

                        // ---------- プレイスホルダー削除 ----------
                        if (placeholderRect) {
                            placeholderRect.remove();
                            placeholderRect = null;
                        }

                        const dt = Date.now() - dragStartTime;
                        if (dt < 200) { // クリック判定
                            setSelectedBook(d);
                            return;
                        }

                        const [pointerX, pointerY] = d3.pointer(event, svg.node());
                        let targetShelf = shelves.find((s) => pointerY >= s.y && pointerY <= s.y + s.height) || shelves[0];
                        shelves.forEach((s) => {
                            s.books = s.books.filter((b) => b.id !== d.id);
                        });

                        const relativeX = pointerX - targetShelf.x;
                        const insertIndex = Math.min(
                            targetShelf.books.length,
                            Math.max(0, Math.floor(relativeX / BOOK_WIDTH))
                        );

                        d.shelfIndex = shelves.indexOf(targetShelf);
                        targetShelf.books.splice(insertIndex, 0, d);

                        // 棚内再配置
                        shelves.forEach((s) => {
                            s.books.forEach((b, i) => {
                                b.x = s.x + i * BOOK_WIDTH;
                                b.y = s.y + s.height - BOOK_HEIGHT;
                                b.shelfIndex = shelves.indexOf(s);
                                b.orderIndex = i;
                            });
                        });

                        setBookshelf(shelves.flatMap((s) => s.books));

                    try {
                        const updates = shelves.flatMap((s) =>
                            s.books.map((b, i) => ({
                                mybook_id: b.id,
                                shelf_index: b.shelfIndex,
                                order_index: i,
                                x: b.x,
                                y: b.y,
                            }))
                        );

                        const res = await fetch("http://127.0.0.1:8000/bookshelf/update_positions", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ positions: updates }),
                        });

                        if (!res.ok) throw new Error(`位置更新失敗: ${res.status}`);
                        const result = await res.json();
                        console.log("✅ 位置情報更新成功:", result);
                    } catch (err) {
                        console.error("❌ 位置情報更新エラー:", err);
                    }
                })
        );

    }, [bookshelf, setBookshelf]);

    // ---------- 手元→棚 ドロップ処理 ----------
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleDrop = async (e) => {
            e.preventDefault();
            console.log("🔥 drop detected");

            const bookId = e.dataTransfer.getData("bookId");
            const myHand = myHandRef.current;
            const bookshelf = bookshelfRef.current;

            const newBook = myHand.find((b) => String(b.id) === String(bookId));
            if (!newBook) { console.log("⚠️ 手元に存在しない本"); return; }
            if (bookshelf.some((b) => String(b.book_id) === String(newBook.book_id))) { console.log("⚠️ 既に本棚にある"); return; }

            try {
                const res = await fetch("http://127.0.0.1:8000/bookshelf/add_book", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ book_id: newBook.book_id || newBook.id, shelf_id: 1 }),
                });

                if (!res.ok) throw new Error(`登録失敗: ${res.status}`);
                const data = await res.json();

                const addedBook = {
                    id: data.book.id,
                    book_id: data.book.book_id,
                    title: data.book.title,
                    author: data.book.author,
                    cover: data.book.cover,
                    shelfIndex: data.book.position.shelfIndex,
                };

                setBookshelf((prev) => [...prev, addedBook]);
                setMyHand((prev) => prev.filter((b) => String(b.id) !== String(bookId)));
                console.log("✅ DB登録成功:", data);
            } catch (err) {
                console.error("DB登録エラー", err);
            }
        };

        const onDragOver = (e) => e.preventDefault();
        container.addEventListener("dragover", onDragOver);
        container.addEventListener("drop", handleDrop);

        return () => {
            container.removeEventListener("dragover", onDragOver);
            container.removeEventListener("drop", handleDrop)
        };
    }, [setBookshelf, setMyHand]);

    // ---------- 描画 ----------
    return (
        <div style={{ position: "relative" }} ref={containerRef}>
            <svg ref={svgRef}></svg>

            {tooltip.visible && (
                <div
                    style={{
                        position: "absolute",
                        top: tooltip.y - containerRef.current.getBoundingClientRect().top + 5,
                        left: tooltip.x - containerRef.current.getBoundingClientRect().left + 5,
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: 4,
                        pointerEvents: "none",
                        fontSize: 14,
                    }}
                >
                    {tooltip.title}
                </div>
            )}

            {/* 詳細モーダル */}
            {selectedBook && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.4)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2000,
                        backdropFilter: "blur(2px)",
                    }}
                    onClick={() => setSelectedBook(null)}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "10px",
                            padding: "16px",
                            width: "min(90vw, 260px)",
                            position: "relative",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                            textAlign: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 閉じるボタン */}
                        <button
                            onClick={() => setSelectedBook(null)}
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                            }}
                        >
                            ×
                        </button>
                            
                        {/* 本の画像 */}
                        <img
                            src={selectedBook.cover}
                            alt={selectedBook.title}
                            style={{ 
                                width: "80%", 
                                borderRadius: "6px", 
                                marginBottom: "10px",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.15)", 
                            }}
                        />
                        
                        {/* タイトル・著者 */}
                        <h4 style={{ fontSize: "16px", margin: "8px 0" }}>{selectedBook.title}</h4>
                        <p style={{ color: "#666", fontSize: "13px", marginBottom: "14px" }}>
                            {selectedBook.author || "著者不明"}
                        </p>

                        {/* 削除ボタン */}
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch(
                                        `http://127.0.0.1:8000/bookshelf/remove/${selectedBook.id}`,
                                        { method: "DELETE" }
                                    );

                                    if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
                                    console.log("✅ 削除成功");

                                    setBookshelf((prev) => {
                                        const remaining = prev.filter((b) => b.id !== selectedBook.id);

                                        // 棚の再配置
                                        const shelves = [];
                                        for (let i = 0; i < NUM_SHELVES; i++) {
                                            shelves.push({
                                                x: SHELF_MARGIN,
                                                y: SHELF_MARGIN + i * (SHELF_HEIGHT + SHELF_GAP),
                                                width: WIDTH - 2 * SHELF_MARGIN,
                                                height: SHELF_HEIGHT,
                                                books: [],
                                            });
                                        }

                                        remaining.forEach((b) => {
                                            const idx = Math.max(0, Math.min(NUM_SHELVES - 1, b.shelfIndex || 0));
                                            shelves[idx].books.push(b);
                                        });

                                        shelves.forEach((s, shelfIdx) => {
                                            s.books.forEach((b, i) => {
                                                b.x = s.x + i * BOOK_WIDTH;
                                                b.y = s.y + s.height - BOOK_HEIGHT;
                                                b.shelfIndex = shelfIdx;
                                                b.orderIndex = i;
                                            });
                                        });

                                        const updatedBooks = shelves.flatMap((s) => s.books);

                                        const updates = updatedBooks.map((b) => ({
                                            mybook_id: b.id,
                                            shelf_index: b.shelfIndex,
                                            order_index: b.orderIndex,
                                            x: b.x,
                                            y: b.y,
                                        }));

                                        fetch("http://127.0.0.1:8000/bookshelf/update_positions", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ positions: updates }),
                                        })
                                            .then((r) => r.json())
                                            .then((r) => console.log("📦 棚位置再更新:", r))
                                            .catch((err) => console.error("位置更新失敗:", err));

                                        return updatedBooks;
                                    });

                                    setSelectedBook(null);
                                } catch (err) {
                                    console.error("❌ 削除エラー:", err);
                                }
                            }}
                            style={{
                                marginTop: "15px",
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#e74c3c",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "15px",
                                transition: "background 0.3s",
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#c0392b")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#e74c3c")}
                        >
                            📕 本棚から外す
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShelfWithBooks;