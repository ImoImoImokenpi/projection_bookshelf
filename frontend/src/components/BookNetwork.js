import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const BookNetwork = ({ books = [] }) => {
  const svgRef = useRef();
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- ノードとリンクを取得 ---
  useEffect(() => {
    if (books && books.length > 0) {
      const generatedNodes = books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        cover: b.cover || "",
        extra: b.extra || {}, // ローカルデータで詳細情報を渡す場合
      }));
      setNodes(generatedNodes);
      setLinks([]); // ローカル表示の場合はリンク未計算
    } else {
      fetchNetwork();
    }
  }, [books]);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/books/network");
      const data = await res.json();
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setLinks(Array.isArray(data.links) ? data.links : []);
    } catch (err) {
      console.error("ネットワークデータ取得エラー:", err);
      setNodes([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  // --- D3描画 ---
  useEffect(() => {
    if (!nodes.length || !links.length) return;

    const width = 900;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g");

    const colorScale = d3.scaleLinear().domain([0.55, 1.0]).range(["#ccc", "#2196f3"]);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => 300 * (1 - (d.similarity || 0.2)))
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => colorScale(d.similarity || 0))
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", (d) => 1 + (d.similarity || 0) * 3);

    const node = g
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("xlink:href", (d) => d.cover || "https://via.placeholder.com/60x90?text=No+Cover")
      .attr("width", 60)
      .attr("height", 90)
      .attr("rx", 5)
      .attr("cursor", "pointer")
      .on("click", (event, d) => setSelectedBook(d))
      .on("mouseover", function () {
        d3.select(this).transition().attr("width", 70).attr("height", 105);
      })
      .on("mouseout", function () {
        d3.select(this).transition().attr("width", 60).attr("height", 90);
      });

    const label = g
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text("")
      .attr("font-size", 10)
      .attr("dy", 105)
      .attr("text-anchor", "middle");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source?.x || 0)
        .attr("y1", (d) => d.source?.y || 0)
        .attr("x2", (d) => d.target?.x || 0)
        .attr("y2", (d) => d.target?.y || 0);
      node.attr("x", (d) => (d.x || 0) - 30).attr("y", (d) => (d.y || 0) - 45);
      label.attr("x", (d) => d.x || 0).attr("y", (d) => (d.y || 0) + 55);
    });

    svg.call(
      d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    );

    return () => simulation.stop();
  }, [nodes, links]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        background: "linear-gradient(to bottom right, #fdfdfd, #f0f0f0)",
      }}
    >
      {loading && <p>Loading network...</p>}
      <svg
        ref={svgRef}
        width={900}
        height={600}
        style={{
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      ></svg>

      {selectedBook && (
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "16px",
            width: "350px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <img
            src={selectedBook.cover}
            alt={selectedBook.title}
            style={{ width: "80px", height: "110px", borderRadius: "4px" }}
          />
          <h3 style={{ margin: "8px 0 4px" }}>{selectedBook.title}</h3>
          <p style={{ fontSize: "0.9em", color: "#555", margin: "2px 0" }}>
            著者: {selectedBook.author || "Unknown"}
          </p>
          {selectedBook.extra && (
            <>
              <p style={{ fontSize: "0.8em", color: "#777", margin: "2px 0" }}>
                カテゴリ: {selectedBook.extra.categories || "不明"}
              </p>
              <p style={{ fontSize: "0.8em", color: "#777", margin: "2px 0" }}>
                出版社: {selectedBook.extra.publisher || "不明"}
              </p>
              <p style={{ fontSize: "0.8em", color: "#777", margin: "2px 0" }}>
                出版日: {selectedBook.extra.publishedDate || "不明"}
              </p>
              <p style={{ fontSize: "0.8em", color: "#555", marginTop: "6px" }}>
                {selectedBook.extra.description || "説明なし"}
              </p>
            </>
          )}
          <button
            onClick={() => setSelectedBook(null)}
            style={{
              marginTop: "10px",
              padding: "4px 10px",
              background: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default BookNetwork;
