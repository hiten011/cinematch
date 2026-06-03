import '@styles/index.css';

export default function Spinner({ fullPage = true }) {
  if (!fullPage) return <div className="spinner" style={{ width: '3rem', height: '3rem' }} />;
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}
