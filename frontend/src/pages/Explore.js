import React, { useEffect, useState } from "react";
import Layout from "../components/Layout"; 
import BookNetwork from "../components/BookNetwork";

const Explore = () => {
    const [books, setBooks] = useState([]);
    const [myHand, setMyHand] = useState([]); // 手元の本
            
    useEffect(() => {
        fetchMyHand();
    }, []);
        
    const fetchMyHand = async () => {
        try {
        const res = await fetch("http://127.0.0.1:8000/myhand");
        const data = await res.json();
        setMyHand(data.books || []);
        } catch (err) {
        console.error("手元本取得エラー:", err);
        }
    };

    useEffect(() => {
        const fetchBooks = async () => {
        try {
            const res = await fetch("http://localhost:8000/bookshelf/books");
            const data = await res.json();
            setBooks(data.books || []); // ← null対策も追加
        } catch (err) {
            console.error("本棚本取得エラー:", err);
        }
        };
        fetchBooks();
    }, []);

    return (
        <Layout myHand={myHand} setMyHand={setMyHand}>
            <h1>My本棚ネットワーク</h1>
            <BookNetwork books={books} />

        </Layout>
    );
};

export default Explore;
