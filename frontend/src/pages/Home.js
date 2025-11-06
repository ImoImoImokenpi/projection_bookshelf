import React, { useState, useEffect } from "react";
import Layout from "../components/Layout"
import ShelfWithBooks from "../components/ShelfWithBooks"; 


const Home = () => {
    const [bookshelf, setBookshelf] = useState([]);
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

    return ( 
        <Layout myHand={myHand} setMyHand={setMyHand}>
            <h1>My本棚</h1>

            <ShelfWithBooks 
                bookshelf={bookshelf} 
                setBookshelf={setBookshelf} 
                myHand={myHand} 
                setMyHand={setMyHand} 
            />
        </Layout>
    );
}; 

export default Home;
