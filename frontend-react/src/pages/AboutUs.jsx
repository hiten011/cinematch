import { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/footer.css';
import '@styles/about-us.css';

export default function AboutUs() {
  const [flipped, setFlipped]       = useState(null);
  const [showCredits, setShowCredits] = useState(false);

  useEffect(() => {
    const handler = () => setFlipped(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const flipCard = (num, e) => {
    e.stopPropagation();
    setFlipped((prev) => (prev === num ? null : num));
  };

  const creators = [
    {
      id: 1,
      img: 'images/creator1.PNG',
      alt: 'Creator 1 : Josheen',
      name: 'JOSHEEN',
      role: '(Lead UI/UX Designer & Frontend Developer)',
      quote: '"Current search history: remove image bg"',
    },
    {
      id: 2,
      img: 'images/creator2.PNG',
      alt: 'Creator 2 : Joe',
      name: 'JOE',
      role: '(Lead Backend and API Integration Specialist)',
      quote: '"Zzz Zzz Zzz"',
    },
    {
      id: 3,
      img: 'images/creator3.PNG',
      alt: 'Creator 3 : Liri',
      name: 'LIRI',
      role: '(Frontend & Backend Integration Officer)',
      quote: '"Stu(dying)."',
    },
    {
      id: 4,
      img: 'images/creator4.PNG',
      alt: 'Creator 4 : Hiten',
      name: 'HITEN',
      role: '(Backend Developer and Database Manager)',
      quote: '"Guys, I fixed that bug...but now we have another one."',
    },
  ];

  return (
    <>
      <NavBar />
      <main id="about-us">
        <svg viewBox="0 0 500 70" className="curved-svg">
          <path id="curve" d="M60,100 Q250,-50 450,100" fill="transparent" />
          <text className="curved-text">
            <textPath href="#curve" startOffset="50%" textAnchor="middle">
              MEET THE CREATORS
            </textPath>
          </text>
        </svg>

        <div className="cards-box">
          {creators.map((c) => (
            <div
              key={c.id}
              className={`card${flipped === c.id ? ' flipped' : ''}`}
              onClick={(e) => flipCard(c.id, e)}
            >
              <div className="card-frontside">
                <img src={c.img} alt={c.alt} className="creator-img" />
              </div>
              <div className="card-backside">
                <div className="backside-content">
                  <p><b>{c.name}</b></p><br />
                  <p>{c.role}</p><br />
                  <p><i>{c.quote}</i></p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="member-box">
          <div className="message-box">
            <h2>Hello Stranger!</h2>
            <p>We are a team of four passionate students (and friends) who collaborated on this project as part of our university course on Web and Database Design (UoA).</p>
            <p>Cinematch is like that friend who always knows what movie you&apos;re in the mood for. No more scrolling for hours. We kept things simple, smooth and <span className="emphasis">hopefully</span> bug-free.</p>
            <p>Some of us worked on the front-end, others on the back-end and database but in the end, we built something that&apos;s fun and easy to use.</p>
            <p>Thank you for visiting Cinematch — we hope you enjoy exploring it as much as we enjoyed building it!</p>
          </div>
        </div>

        <div className="credits-button" onClick={() => setShowCredits(true)}>
          <span>Credits</span>
        </div>

        {showCredits && (
          <div className="cr-card" onClick={() => setShowCredits(false)}>
            <div className="cr-card-content" onClick={(e) => e.stopPropagation()}>
              <div className="cr-card-header">
                <h2>Image Credits</h2>
                <button type="button" className="close-button" onClick={() => setShowCredits(false)}>×</button>
              </div>
              <div className="cr-text">
                <p>We would like to acknowledge the following sources for images used in our project:</p>
                <ul>
                  <li>Creator cards: generated using <u>@not_darkly picrew template</u></li>
                  <li>Movie posters and thumbnails: fetched from <u>TMDB api</u></li>
                  <li>Most icons: free icons from <u>flaticon authors</u></li>
                  <li>Sign up/login page landscapes: taken from <u>vecteezy</u></li>
                  <li>Some other ui elements including icons and bg images were created by us</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
