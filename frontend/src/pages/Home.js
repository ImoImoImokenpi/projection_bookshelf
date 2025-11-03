import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar"; 
import ShelfWithBooks from "../components/ShelfWithBooks"; 
import Hand from "../components/Hand";

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
        <div style={{ position: "relative" }}>
            {/* Navbar に myHand と setMyHand を渡す */}
            <Navbar myHand={myHand} setMyHand={setMyHand} />

            <h1>My本棚</h1> 

            {/* ShelfWithBooks に myHand と setMyHand を渡す */}
            <ShelfWithBooks 
                bookshelf={bookshelf} 
                setBookshelf={setBookshelf} 
                myHand={myHand} 
                setMyHand={setMyHand} 
            />

            {/* 右下フローティング表示 */}
            <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
                <Hand myHand={myHand} setMyHand={setMyHand} />
            </div>
        </div>
    );
}; 

export default Home;
