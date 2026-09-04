function PageTable({ virtualMemory }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Page Table</h2>
          <p>Virtual → Physical Mapping</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Virtual Page</th>
              <th>Physical Frame</th>
              <th>Present</th>
              <th>Dirty</th>
            </tr>
          </thead>

          <tbody>
            {virtualMemory.map((page) => (
              <tr key={page.virtualPage}>
                <td>VP {page.virtualPage}</td>

                <td>
                  {page.present
                    ? `Frame ${page.physicalFrame}`
                    : "—"}
                </td>

                <td>
                  <span
                    className={
                      page.present
                        ? "table-status yes"
                        : "table-status no"
                    }
                  >
                    {page.present ? "Yes" : "No"}
                  </span>
                </td>

                <td>{page.dirty ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PageTable;