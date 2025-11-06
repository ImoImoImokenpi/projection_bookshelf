import React from "react";
import Navbar from "./Navbar";
import Hand from "./Hand";

const Layout = ({ myHand, setMyHand, children }) => {
    return (
        <div style={{ position: "relative", height: "130vh", overflow: "hidden" }}>
        <Navbar myHand={myHand} setMyHand={setMyHand} />

        {/* メインコンテンツ */}
        <div style={{ width: "100%", height: "100%", boxSizing: "border-box" }}>
            {children}
        </div>

        {/* 右下フローティング */}
        <div style={{ position: "fixed", right: "20px", bottom: "20px", zIndex: 100 }}>
            <Hand myHand={myHand} setMyHand={setMyHand} />
        </div>
        </div>
    );
};

export default Layout;
