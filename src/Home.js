import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import viewerConfig from "./viewerConfig.json";

let shootingStarInterval;

const Home = () => {
  const navigate = useNavigate();
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    // Load viewer configuration
    setViewers(viewerConfig.viewers);
    
    applySpaceTheme();

    // cleanup on component unmount
    return () => {
      stopShootingStars();
      removeBackgroundStars();
    };
  }, []);

  function applySpaceTheme() {
    document.body.style.background =
      "linear-gradient(to right, #09162a, #0d284d, #113b72, #194f99)";
    createBackgroundStars();
    startShootingStars();
  }

  function startShootingStars() {
    shootingStarInterval = setInterval(() => {
      if (Math.random() > 0.75) {
        createShootingStar();
      }
    }, 3000);
  }

  function createBackgroundStars() {
    const totalStars = 200;
    for (let i = 0; i < totalStars; i++) {
      const star = document.createElement("div");
      star.classList.add("backgroundStar");
      const x = Math.random() * window.innerWidth - 20;
      const y = Math.random() * document.documentElement.scrollHeight - 20;
      star.style.left = x + "px";
      star.style.top = y + "px";
      star.style.animationDelay = Math.random() * 5 + "s";
      document.body.appendChild(star);
    }
  }

  function removeBackgroundStars() {
    const stars = document.querySelectorAll(".backgroundStar");
    stars.forEach((star) => {
      document.body.removeChild(star);
    });
  }

  function createShootingStar() {
    const shootingStar = document.createElement("div");
    shootingStar.classList.add("shootingStar");

    let x = Math.random() > 0.5 ? window.innerWidth - 100 : 100;
    let y = Math.random() * (document.documentElement.scrollHeight / 2);

    shootingStar.style.left = x + "px";
    shootingStar.style.top = y + "px";

    if (x > window.innerWidth / 2) {
      shootingStar.style.animation = "shootingLeft 1.5s linear forwards";
      shootingStar.classList.add("left");
    } else {
      shootingStar.style.animation = "shootingRight 1.5s linear forwards";
      shootingStar.classList.add("right");
    }

    document.body.appendChild(shootingStar);

    shootingStar.addEventListener("animationend", () => {
      if (shootingStar.parentNode) {
        shootingStar.parentNode.removeChild(shootingStar);
      }
    });
  }

  function stopShootingStars() {
    clearInterval(shootingStarInterval);
    const shootingStars = document.querySelectorAll(".shootingStar");
    shootingStars.forEach((star) => {
      if (star.parentNode) {
        star.style.animation = "none";
        star.parentNode.removeChild(star);
      }
    });
  }

  // Group viewers by category
  const viewersByCategory = viewers.reduce((acc, viewer) => {
    if (!acc[viewer.category]) {
      acc[viewer.category] = [];
    }
    acc[viewer.category].push(viewer);
    return acc;
  }, {});

  // Render a tile
  const renderTile = (viewer) => {
    if (!viewer.enabled) {
      return (
        <div key={viewer.id} className="tile" style={{
          opacity: 0.5,
          cursor: 'not-allowed'
        }}>
          <div style={{ flex: 1 }}>
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={viewer.id} 
        className="tile"
        style={{
          border: '2px solid rgba(100, 150, 255, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Type badge */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: viewer.has3D 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 2
        }}>
          {viewer.has3D ? '2D + 3D' : '2D'}
        </div>

        <div style={{ flex: 1, paddingRight: '80px' }}>
          <span className="tile-title" style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '22px',
            fontWeight: 'bold'
          }}>
            {viewer.title}
          </span>
          {viewer.description && (
            <span className="tile-description" style={{ 
              fontSize: '13px', 
              color: '#bbb', 
              display: 'block',
              lineHeight: '1.4'
            }}>
              {viewer.description}
            </span>
          )}
        </div>
        
        <button 
          className="launch-button" 
          onClick={() => navigate(`/Viewer/${viewer.id}`)}
          style={{
            minWidth: '100px'
          }}
        >
          🚀 Launch
        </button>
      </div>
    );
  };

  return (
    <div className="home-container">
      <h1 className="pageTitle">AstroScope</h1>
      
      <p style={{
        fontSize: '18px',
        color: '#aaa',
        marginTop: '-20px',
        marginBottom: '40px',
        maxWidth: '800px',
        margin: '-20px auto 40px',
        lineHeight: '1.6'
      }}>
        Explore the cosmos with interactive 2D and 3D space viewers
      </p>

      {/* Stats section */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        marginBottom: '50px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: 'rgba(100, 150, 255, 0.15)',
          padding: '15px 30px',
          borderRadius: '10px',
          border: '2px solid rgba(100, 150, 255, 0.3)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4fa3ff' }}>
            {viewers.filter(v => v.enabled).length}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Active Viewers
          </div>
        </div>
        <div style={{
          background: 'rgba(146, 84, 222, 0.15)',
          padding: '15px 30px',
          borderRadius: '10px',
          border: '2px solid rgba(146, 84, 222, 0.3)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9254de' }}>
            {viewers.filter(v => v.enabled && v.has3D).length}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            3D Experiences
          </div>
        </div>
        <div style={{
          background: 'rgba(255, 100, 100, 0.15)',
          padding: '15px 30px',
          borderRadius: '10px',
          border: '2px solid rgba(255, 100, 100, 0.3)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff6464' }}>
            {viewers.filter(v => !v.enabled).length}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Coming Soon
          </div>
        </div>
      </div>

      {Object.entries(viewersByCategory).map(([category, categoryViewers]) => (
        <section key={category} className="tiles">
          <h2 className="sectionHeader" style={{
            fontSize: '32px',
            marginBottom: '25px',
            color: '#fff',
            textShadow: '0 0 10px rgba(79, 163, 255, 0.5)'
          }}>
            {category}
          </h2>
          {/* Render tiles in rows of 2 */}
          {Array.from({ length: Math.ceil(categoryViewers.length / 2) }, (_, rowIndex) => (
            <div key={rowIndex} className="tileContainer">
              {categoryViewers.slice(rowIndex * 2, rowIndex * 2 + 2).map(renderTile)}
              {/* Fill empty spots in incomplete rows */}
              {rowIndex * 2 + 1 === categoryViewers.length && (
                <div className="tile" style={{
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}>
                  <div style={{ flex: 1 }}>
                    <span className="tile-title">Coming soon...</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export default Home;