import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

const ShelfWithBooks = () => {
    const svgRef = useRef();
    const [books, setBooks] = useState([]);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: "" });

    useEffect(() => {
        // 仮の本データ
        setBooks([
        { id: 1, cover: "/covers/bookA.jpg", title: "BookA" },
        { id: 2, cover: "/covers/bookB.jpg", title: "BookB" },
        { id: 3, cover: "/covers/bookC.jpg", title: "BookC" },
        ]);
    }, []);

    useEffect(() => {
        const width = 500;
        const height = 590;
        const shelfMargin = 20;
        const numShelves = 3;
        const shelfHeight = 170;  // 棚自体の高さ
        const shelfGap = 20;      // 棚間の空き
        const bookWidth = 80;
        const bookHeight = 120;
        const woodUrl = "/sources/wood_texture.jpg";
        const darkWoodUrl = "/sources/dark_wood_texture.jpg";

        const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height);
        svg.selectAll("*").remove();

        const defs = svg.append("defs");

        // 外枠木目
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

        // 棚内部（暗め）
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

        // 外枠
        svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#frameWood)");

        // 棚描画
        const shelves = [];
        for (let i = 0; i < numShelves; i++) {
        const y = shelfMargin + i * (shelfHeight + shelfGap);
        const shelf = { x: shelfMargin, y, width: width - 2 * shelfMargin, height: shelfHeight, books: [] };
        shelves.push(shelf);

        svg.append("rect")
            .attr("x", shelf.x)
            .attr("y", shelf.y)
            .attr("width", shelf.width)
            .attr("height", shelf.height)
            .attr("fill", "url(#shelfWoodDark)")
            .attr("stroke", "#5a3c1b")
            .attr("stroke-width", 2)
        }

        // 本初期配置（左詰め、段下端に揃える）
        books.forEach((b, i) => {
        const shelfIndex = i % numShelves;
        const shelf = shelves[shelfIndex];
        b.shelfIndex = shelfIndex;
        b.x = shelf.x + shelf.books.length * bookWidth;
        b.y = shelf.y + shelf.height - bookHeight;
        shelf.books.push(b);
        });

        // 本描画
        svg.selectAll("image.book")
        .data(books, d => d.id)
        .join("image")
        .attr("class", "book")
        .attr("xlink:href", d => d.cover)
        .attr("width", bookWidth)
        .attr("height", bookHeight)
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .style("cursor", "grab")
        .on("mouseover", (event, d) => {
            setTooltip({ visible: true, x: event.pageX, y: event.pageY, title: d.title });
        })
        .on("mousemove", (event) => {
            setTooltip(t => ({ ...t, x: event.pageX, y: event.pageY }));
        })
        .on("mouseout", () => setTooltip(t => ({ ...t, visible: false })))
        .call(
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
                const [, pointerY] = d3.pointer(event, svg.node());

                // 最寄り棚判定
                let targetShelf = shelves[d.shelfIndex]; // デフォルトは元の棚
                for (let shelf of shelves) {
                if (pointerY >= shelf.y && pointerY <= shelf.y + shelf.height) {
                    targetShelf = shelf;
                    break;
                }
                }

                // 古い棚から削除
                const oldShelf = shelves[d.shelfIndex];
                oldShelf.books = oldShelf.books.filter(b => b.id !== d.id);

                // 新しい棚に追加
                d.shelfIndex = shelves.indexOf(targetShelf);
                targetShelf.books.push(d);

                // 全棚の本を左詰めで再配置
                shelves.forEach(shelf => {
                shelf.books.forEach((b, idx) => {
                    b.x = shelf.x + idx * bookWidth;
                    b.y = shelf.y + shelf.height - bookHeight;
                });
                });

                // 全本を更新
                svg.selectAll("image.book")
                .data(books, b => b.id)
                .transition()
                .duration(100)
                .attr("x", b => b.x)
                .attr("y", b => b.y);

                d3.select(this).style("cursor", "grab");
            })
        );

    }, [books]);

    return (
        <div style={{ position: "relative" }}>
            <svg ref={svgRef}></svg>
            {tooltip.visible && (
                <div style={{
                position: "absolute",
                top: tooltip.y + 5,
                left: tooltip.x + 5,
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 4,
                pointerEvents: "none",
                fontSize: 14
            }}>
                {tooltip.title}
            </div>
        )}
        </div>
    );
};

export default ShelfWithBooks;




