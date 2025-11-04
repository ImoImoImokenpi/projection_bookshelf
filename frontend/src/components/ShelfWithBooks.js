import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const ShelfWithBooks = ({ bookshelf, setBookshelf, myHand, setMyHand }) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: "" });

    const width = 500, height = 590;
    const shelfMargin = 20, numShelves = 3, shelfHeight = 170, shelfGap = 20;
    const bookWidth = 80, bookHeight = 120;
    const woodUrl = "/sources/wood_texture.jpg";
    const darkWoodUrl = "/sources/dark_wood_texture.jpg";

    // --- 最新の hand/shelf を参照するための useRef ---
    const bookshelfRef = useRef(bookshelf);
    const myHandRef = useRef(myHand);
    useEffect(() => { bookshelfRef.current = bookshelf; }, [bookshelf]);
    useEffect(() => { myHandRef.current = myHand; }, [myHand]);

    // 📦 初回のみ: 本棚データ取得
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

    // 📚 D3で棚＋本を描画（bookshelfが変わるたび再描画）
    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
        svg.selectAll("*").remove();

        // 木目定義
        const defs = svg.append("defs");
        defs.append("pattern")
            .attr("id", "frameWood")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", width)
            .attr("height", height)
            .append("image")
            .attr("href", woodUrl)
            .attr("width", width)
            .attr("height", height)
            .attr("preserveAspectRatio", "xMidYMid slice");

        defs.append("pattern")
            .attr("id", "shelfWoodDark")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", width - 2 * shelfMargin)
            .attr("height", shelfHeight)
            .append("image")
            .attr("href", darkWoodUrl)
            .attr("width", width - 2 * shelfMargin)
            .attr("height", shelfHeight)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("opacity", 0.35);

        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "url(#frameWood)");

        // 棚を生成
        const shelves = [];
        for (let i = 0; i < numShelves; i++) {
            const y = shelfMargin + i * (shelfHeight + shelfGap);
            shelves.push({ x: shelfMargin, y, width: width - 2 * shelfMargin, height: shelfHeight, books: [] });

        svg.append("rect")
            .attr("x", shelfMargin)
            .attr("y", y)
            .attr("width", width - 2 * shelfMargin)
            .attr("height", shelfHeight)
            .attr("fill", "url(#shelfWoodDark)")
            .attr("stroke", "#5a3c1b")
            .attr("stroke-width", 2);
        }

        // 本を棚に割り当て
        bookshelf.forEach((b) => {
            const idx = Math.max(0, Math.min(numShelves - 1, b.shelfIndex || 0));
            shelves[idx].books.push(b);
        });

        // 左詰め・下揃え配置
        shelves.forEach((shelf) => {
            shelf.books.forEach((b, i) => {
                if (b.x == null || b.y == null) {
                    b.x = shelf.x + i * bookWidth;
                    b.y = shelf.y + shelf.height - bookHeight;
                }
            });
        });

        const bookDraw = svg
            .selectAll("image.book")
            .data(bookshelf, (d) => d.id)
            .join("image")
            .attr("class", "book")
            .attr("xlink:href", (d) => d.cover)
            .attr("width", bookWidth)
            .attr("height", bookHeight)
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

        // 本を棚間でドラッグ可能
        bookDraw.call(
        d3.drag()
            .on("start", function () {
                d3.select(this).raise().style("cursor", "grabbing");
            })
            .on("drag", function (event, d) {
                d.x = event.x - bookWidth / 2;
                d.y = event.y - bookHeight / 2;
                d3.select(this).attr("x", d.x).attr("y", d.y);
            })
            .on("end", async function (event, d) {
                const [pointerX, pointerY] = d3.pointer(event, svg.node());
                let targetShelf = shelves.find((s) => pointerY >= s.y && pointerY <= s.y + s.height) || shelves[0];

                // 古い棚から削除
                shelves.forEach((s) => {
                    s.books = s.books.filter((b) => b.id !== d.id);
                });

                // 挿入位置計算
                const relativeX = pointerX - targetShelf.x;
                const insertIndex = Math.min(
                    targetShelf.books.length,
                    Math.max(0, Math.floor(relativeX / bookWidth))
                );

                d.shelfIndex = shelves.indexOf(targetShelf);
                targetShelf.books.splice(insertIndex, 0, d);

                // 再配置
                shelves.forEach(s => {
                    s.books.forEach((b, i) => {
                    b.x = s.x + i * bookWidth;
                    b.y = s.y + s.height - bookHeight;
                    b.shelfIndex = shelves.indexOf(s);
                    b.orderIndex = i;
                    });
                });

                setBookshelf(shelves.flatMap((s) => s.books));

                d3.select(this).style("cursor", "grab");

                try {
                    // ✅ 棚全体の位置を一括更新
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

    },[bookshelf]);

    // 🖐️ 手元→棚 ドロップ処理（初回のみ登録）
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
            if (!newBook){ console.log("⚠️ 手元に存在しない本"); return; }
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

        container.addEventListener("dragover", (e) => e.preventDefault());
        container.addEventListener("drop", handleDrop);

        return () => {
            container.removeEventListener("drop", handleDrop)
        };
    }, [setBookshelf, setMyHand]);

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
        </div>
    );
};

export default ShelfWithBooks;
