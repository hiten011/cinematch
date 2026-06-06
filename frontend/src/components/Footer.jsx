import '@styles/footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-floating-content">
        <div>
          <p>Scrolled too far?</p>
          <p>Jump back to the top</p>
        </div>
        <div className="footer-button-padding">
          <a
            className="footer-back-to-top"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <svg
              className="footer-arrow-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 8 12 16" />
              <polyline points="8 12 12 8 16 12" />
            </svg>
          </a>
        </div>
      </div>
      <div className="footer-content">© Cinematch 2025</div>
      <img className="wave" src="/images/footer-curve.svg" alt="" />
    </footer>
  );
}
