import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

let shootingStarInterval;

const Home = () => {
  const navigate = useNavigate();
  useEffect(() => {
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

  const handleLaunch = () => {
    navigate("/Viewer");
  };

  return (
    <div className="home-container">
      <h1 className="pageTitle">AstroScope</h1>

      <section className="tiles">
        <h2 className="sectionHeader">2D</h2>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">The Galaxy</span>
            <button className="launch-button" onClick={() => navigate("/Viewer/1")}>
              Launch
            </button>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
      </section>

      <section className="tiles">
        <h2 className="sectionHeader">2D and 3D</h2>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">The Moon</span>
            <button className="launch-button" onClick={() => navigate("/Viewer/2")}>
              Launch
            </button>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
        <div className="tileContainer">
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
          <div className="tile">
            <span className="tile-title">Coming soon...</span>
          </div>
        </div>
      </section>
    </div>

  );
};

export default Home;