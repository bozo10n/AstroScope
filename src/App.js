// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Viewer from "./Viewer"; // move your current 2D/3D viewer code here
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/viewer/:id" element={<Viewer />} />
      </Routes>
    </Router>
  );
}

export default App;
