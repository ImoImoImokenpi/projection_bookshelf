import React, { useState, useEffect } from "react"; 
import Navbar from "../components/Navbar"; 
import ShelfWithBooks from "../components/ShelfWithBooks"; 
import Hand from "../components/Hand";

const Home = () => { 
    const [myBooks, setMyBooks] = useState([]);

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/mybooks");
            const data = await res.json();
            setMyBooks(data.books || []);
        } catch (err) {
            console.error("手元本取得エラー:", err);
        }
    };
    
    return ( 
        <div style={{ position: "relative" }}>
            <Navbar myBooks={myBooks} />

            <h1>プロジェクション本棚</h1> 

            {/* ShelfWithBooks に myBooks と setMyBooks を渡す */}
            <ShelfWithBooks myBooks={myBooks} setMyBooks={setMyBooks} />

            {/* 右下フローティング表示 */}
            <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
                <Hand myBooks={myBooks} setMyBooks={setMyBooks} />
            </div>
        </div>
    );
}; 

export default Home;
