import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Search from "./pages/Search";

function App() {
  // 全ページで共有する手元の本
  const [myBooks, setMyBooks] = useState([]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home myBooks={myBooks} setMyBooks={setMyBooks} />} />
        <Route path="/Search" element={<Search myBooks={myBooks} setMyBooks={setMyBooks} />} />
        <Route path="/Explore" element={<Explore myBooks={myBooks} setMyBooks={setMyBooks}/>} />
      </Routes>
    </Router>
  );
}

export default App;

