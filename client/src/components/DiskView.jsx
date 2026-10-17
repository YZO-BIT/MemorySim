function DiskView({ diskPages = 20 }) {
  const displayCount = Math.min(Math.max(1, diskPages), 24);
  const pages = Array.from({ length: displayCount }, (_, index) => index);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Database Disk</h2>
          <p>Database Pages on Storage ({diskPages} total)</p>
        </div>
      </div>

      <div className="disk-grid">
        {pages.map((page) => (
          <div className="disk-page" key={page}>
            <span>Page</span>
            <strong>{page}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DiskView;