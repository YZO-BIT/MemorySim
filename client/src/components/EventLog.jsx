function EventLog({ events }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Event Log</h2>
          <p>Simulation Events</p>
        </div>
      </div>

      <div className="event-list">
        {events.map((event, index) => (
          <div className="event" key={index}>
            <span className="event-time">{event.time}</span>

            <span className={`event-type ${event.type.toLowerCase()}`}>
              {event.type.replace("_", " ")}
            </span>

            <span className="event-message">
              {event.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventLog;