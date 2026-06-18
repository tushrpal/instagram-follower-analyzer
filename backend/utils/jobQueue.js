const EventEmitter = require("events");

class JobQueue extends EventEmitter {
  constructor() {
    super();
    // Map<sessionId, { status, messages, error, result, listeners }>
    this.jobs = new Map();
  }

  create(sessionId) {
    this.jobs.set(sessionId, {
      status: "pending",
      messages: [],
      error: null,
      result: null,
      listeners: new Set(),
    });
  }

  subscribe(sessionId, res) {
    const job = this.jobs.get(sessionId);
    if (!job) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: "Job not found" })}\n\n`);
      res.end();
      return;
    }

    // Replay buffered messages so a reconnecting client catches up
    for (const msg of job.messages) {
      res.write(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
    }

    // If already finished, close immediately
    if (job.status === "done") {
      res.write(`event: done\ndata: ${JSON.stringify(job.result)}\n\n`);
      res.end();
      return;
    }
    if (job.status === "error") {
      res.write(`event: error\ndata: ${JSON.stringify({ message: job.error })}\n\n`);
      res.end();
      return;
    }

    job.listeners.add(res);
    res.on("close", () => job.listeners.delete(res));
  }

  progress(sessionId, message) {
    this._emit(sessionId, "progress", { message });
  }

  complete(sessionId, result) {
    const job = this.jobs.get(sessionId);
    if (!job) return;
    job.status = "done";
    job.result = result;
    this._emit(sessionId, "done", result);
    // Close all SSE connections
    for (const res of job.listeners) {
      try { res.end(); } catch {}
    }
    job.listeners.clear();
    // Clean up after 5 minutes
    setTimeout(() => this.jobs.delete(sessionId), 5 * 60 * 1000);
  }

  fail(sessionId, error) {
    const job = this.jobs.get(sessionId);
    if (!job) return;
    job.status = "error";
    job.error = error;
    this._emit(sessionId, "error", { message: error });
    for (const res of job.listeners) {
      try { res.end(); } catch {}
    }
    job.listeners.clear();
    setTimeout(() => this.jobs.delete(sessionId), 5 * 60 * 1000);
  }

  _emit(sessionId, event, data) {
    const job = this.jobs.get(sessionId);
    if (!job) return;
    const msg = { event, data };
    job.messages.push(msg);
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of job.listeners) {
      try { res.write(payload); } catch {}
    }
  }
}

module.exports = new JobQueue();
