import React from "react"; 
import Navbar from "../components/Navbar"; 
import ShelfWithBooks from "../components/ShelfWithBooks"; 
import Hand from "../components/Hand";

const BigShelf = ({ myBooks, setMyBooks }) => { 
    return ( 
        <div style={{ position: "relative" }}>
            <Navbar myBooks={myBooks} />
            <h1>プロジェクション本棚</h1> 
            <ShelfWithBooks />

            {/* 右下フローティング表示 */}
            <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
                <Hand myBooks={myBooks} />
            </div>
        </div>
    );
}; 

export default BigShelf;
