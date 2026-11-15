import React from "react";

function EventLog({ events = [] }) {
  const groups = [];
  let lastTime = null;

  events.forEach((event) => {
    if (event.time !== lastTime) {
      groups.push({ time: event.time, items: [] });
      lastTime = event.time;
    }
    groups[groups.length - 1].items.push(event);
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Event Audit Log</h2>
          <p>
            {events.length} event{events.length !== 1 ? "s" : ""} captured from the simulator kernel
          </p>
        </div>
      </div>

      <div className="event-list">
        {events.length === 0 ? (
          <div className="event-empty">No events recorded yet. Run a simulation to populate the audit log.</div>
        ) : (
          groups.map((group) => (
            <React.Fragment key={group.time}>
              <div className="event-group-label">{group.time}</div>

              {group.items.map((event, index) => (
                <div className="event event-row" key={index}>
                  <span className={`event-type ${event.type.toLowerCase()}`}>
                    {event.type.replace(/_/g, " ")}
                  </span>

                  <span className="event-message">{event.message}</span>
                </div>
              ))}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

export default EventLog;
