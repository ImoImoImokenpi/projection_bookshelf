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

    // 📦 棚データ取得
    useEffect(() => {
        const fetchBookshelf = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/bookshelf/books");
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json();
            const books = Array.isArray(data?.books) ? data.books : [];
            setBookshelf(books);
        } catch (err) {
            console.warn("本棚取得に失敗:", err);
            setBookshelf([]);
        }
        };
        fetchBookshelf();
    }, [setBookshelf]);

    // 📚 D3で棚＋本を描画
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
            shelves.push({
                x: shelfMargin,
                y,
                width: width - 2 * shelfMargin,
                height: shelfHeight,
                books: [],
            });

            svg.append("rect")
                .attr("x", shelfMargin)
                .attr("y", y)
                .attr("width", width - 2 * shelfMargin)
                .attr("height", shelfHeight)
                .attr("fill", "url(#shelfWoodDark)")
                .attr("stroke", "#5a3c1b")
                .attr("stroke-width", 2);
            }

        // 各本を対応する棚に割り当て
        bookshelf.forEach((b) => {
            const idx = Math.max(0, Math.min(numShelves - 1, b.shelfIndex || 0));
            shelves[idx].books.push(b);
        });

        // 本の位置を整列（左詰め＋下揃え）
        shelves.forEach((shelf) => {
            shelf.books.forEach((b, i) => {
                b.x = shelf.x + i * bookWidth;
                b.y = shelf.y + shelf.height - bookHeight;
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
            
            bookDraw.call(
                d3.drag()
                    .on("start", function (event, d) {
                        d3.select(this).raise().style("cursor", "grabbing");
                    })
                    .on("drag", function (event, d) {
                        d.x = event.x - bookWidth / 2;
                        d.y = event.y - bookHeight / 2;
                        d3.select(this).attr("x", d.x).attr("y", d.y);
                    })
                    .on("end", function (event, d) {
                        const [pointerX, pointerY] = d3.pointer(event, svg.node());

                        /// 落とした棚を判定
                        let targetShelf = shelves.find(
                            (s) => pointerY >= s.y && pointerY <= s.y + s.height
                        ) || shelves[0];

                        // 古い棚から削除
                        shelves.forEach((s) => {
                            s.books = s.books.filter((b) => b.id !== d.id);
                        });

                        // ドロップ位置をもとに挿入位置を計算（左詰め・下揃え前提）
                        const relativeX = pointerX - targetShelf.x;
                        const insertIndex = Math.min(
                            targetShelf.books.length,
                            Math.max(0, Math.floor(relativeX / bookWidth))
                        );

                        // 棚内で順序を挿入
                        d.shelfIndex = shelves.indexOf(targetShelf);
                        targetShelf.books.splice(insertIndex, 0, d);

                        // 各棚の本を左詰め・下揃えに再配置
                        shelves.forEach((shelf) => {
                            shelf.books.forEach((b, i) => {
                                b.x = shelf.x + i * bookWidth;
                                b.y = shelf.y + shelf.height - bookHeight;
                            });
                        });
                        
                         // 再描画
                        const newBookshelf = shelves.flatMap((s) => s.books);
                        setBookshelf([...newBookshelf]);

                        d3.select(this).style("cursor", "grab");
                    })
            );

        // 🖐️ 手元からドロップ
        const container = containerRef.current;
        container.ondragover = (e) => e.preventDefault();
        container.ondrop = (e) => {
            e.preventDefault();
            const bookId = e.dataTransfer.getData("bookId");
            const newBook = myHand.find((b) => String(b.id) === String(bookId));
            if (!newBook || bookshelf.some((b) => String(b.id) === String(newBook.id))) return;

            const addedBook = {
                ...newBook,
                shelfIndex: 0,
            };
            setBookshelf((prev) => [...prev, addedBook]);
            setMyHand((prev) => prev.filter((b) => b.id !== bookId));
        };
    }, [bookshelf, myHand, setBookshelf, setMyHand]);

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
