function DiskView() {
  const pages = Array.from({ length: 20 }, (_, index) => index);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Database Disk</h2>
          <p>Database Pages on Storage</p>
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