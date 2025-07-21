import Database from 'better-sqlite3';
import { BaseEvent } from '@semantest/core';
import { TestResult, SuiteResult, TestRunConfig, TestRunStatus } from '../types/orchestration';

/**
 * Event persistence layer using SQLite
 */
export class EventPersistence {
  private db: Database.Database;

  constructor(dbPath: string = './semantest.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    // Events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);

    // Test runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        run_id TEXT PRIMARY KEY,
        name TEXT,
        config TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time INTEGER,
        end_time INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
    `);

    // Test results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        test_id TEXT PRIMARY KEY,
        run_id TEXT,
        suite_id TEXT,
        status TEXT NOT NULL,
        duration INTEGER NOT NULL,
        error TEXT,
        retries INTEGER DEFAULT 0,
        assertions_passed INTEGER DEFAULT 0,
        assertions_failed INTEGER DEFAULT 0,
        assertions_total INTEGER DEFAULT 0,
        screenshots TEXT,
        logs TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (run_id) REFERENCES test_runs(run_id)
      );

      CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_suite_id ON test_results(suite_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
    `);

    // Suite results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS suite_results (
        suite_id TEXT PRIMARY KEY,
        run_id TEXT,
        duration INTEGER NOT NULL,
        total_tests INTEGER NOT NULL,
        passed_tests INTEGER NOT NULL,
        failed_tests INTEGER NOT NULL,
        skipped_tests INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (run_id) REFERENCES test_runs(run_id)
      );

      CREATE INDEX IF NOT EXISTS idx_suite_results_run_id ON suite_results(run_id);
    `);

    // Event replay log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_replay_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        events_replayed INTEGER NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);
  }

  /**
   * Save an event
   */
  async saveEvent(event: BaseEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO events (id, type, timestamp, payload, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.type,
      event.timestamp,
      JSON.stringify(event.payload),
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  /**
   * Save multiple events
   */
  async saveEvents(events: BaseEvent[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO events (id, type, timestamp, payload, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    const saveMany = this.db.transaction((events: BaseEvent[]) => {
      for (const event of events) {
        stmt.run(
          event.id,
          event.type,
          event.timestamp,
          JSON.stringify(event.payload),
          event.metadata ? JSON.stringify(event.metadata) : null
        );
      }
    });

    saveMany(events);
  }

  /**
   * Get events by time range
   */
  async getEventsByTimeRange(startTime: number, endTime: number): Promise<BaseEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(startTime, endTime) as Array<{
      id: string;
      type: string;
      timestamp: number;
      payload: string;
      metadata: string | null;
    }>;
    
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string, limit: number = 100): Promise<BaseEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE type = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(type, limit) as Array<{
      id: string;
      type: string;
      timestamp: number;
      payload: string;
      metadata: string | null;
    }>;
    
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Save test run
   */
  async saveTestRun(config: TestRunConfig, status: TestRunStatus): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO test_runs (run_id, name, config, status, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      config.runId,
      config.name || null,
      JSON.stringify(config),
      status.status,
      status.startTime || null,
      status.endTime || null
    );
  }

  /**
   * Update test run status
   */
  async updateTestRunStatus(runId: string, status: TestRunStatus): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE test_runs
      SET status = ?, start_time = ?, end_time = ?
      WHERE run_id = ?
    `);

    stmt.run(
      status.status,
      status.startTime || null,
      status.endTime || null,
      runId
    );
  }

  /**
   * Get test run config
   */
  async getTestRunConfig(runId: string): Promise<TestRunConfig | null> {
    const stmt = this.db.prepare(`
      SELECT config FROM test_runs WHERE run_id = ?
    `);

    const row = stmt.get(runId) as { config: string } | undefined;
    if (!row) return null;

    return JSON.parse(row.config);
  }

  /**
   * Save test result
   */
  async saveTestResult(result: TestResult, runId?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO test_results (
        test_id, run_id, status, duration, error, retries,
        assertions_passed, assertions_failed, assertions_total,
        screenshots, logs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      result.testId,
      runId || null,
      result.status,
      result.duration,
      result.error ? JSON.stringify(result.error) : null,
      result.retries,
      result.assertions.passed,
      result.assertions.failed,
      result.assertions.total,
      result.screenshots.length > 0 ? JSON.stringify(result.screenshots) : null,
      result.logs.length > 0 ? JSON.stringify(result.logs) : null
    );
  }

  /**
   * Save suite result
   */
  async saveSuiteResult(result: SuiteResult, runId?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO suite_results (
        suite_id, run_id, duration, total_tests,
        passed_tests, failed_tests, skipped_tests
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      result.suiteId,
      runId || null,
      result.duration,
      result.totalTests,
      result.passedTests,
      result.failedTests,
      result.skippedTests
    );
  }

  /**
   * Get test results by run ID
   */
  async getTestResultsByRun(runId: string): Promise<TestResult[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM test_results WHERE run_id = ?
    `);

    const rows = stmt.all(runId) as Array<{
      test_id: string;
      status: string;
      duration: number;
      error: string | null;
      retries: number;
      assertions_passed: number;
      assertions_failed: number;
      assertions_total: number;
      screenshots: string | null;
      logs: string | null;
    }>;
    
    return rows.map(row => ({
      testId: row.test_id,
      status: row.status as any,
      duration: row.duration,
      error: row.error ? JSON.parse(row.error) : undefined,
      retries: row.retries,
      assertions: {
        passed: row.assertions_passed,
        failed: row.assertions_failed,
        total: row.assertions_total
      },
      screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
      logs: row.logs ? JSON.parse(row.logs) : []
    }));
  }

  /**
   * Get suite results by run ID
   */
  async getSuiteResultsByRun(runId: string): Promise<SuiteResult[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM suite_results WHERE run_id = ?
    `);

    const rows = stmt.all(runId) as Array<{
      suite_id: string;
      duration: number;
      total_tests: number;
      passed_tests: number;
      failed_tests: number;
      skipped_tests: number;
    }>;
    
    return rows.map(row => ({
      suiteId: row.suite_id,
      duration: row.duration,
      totalTests: row.total_tests,
      passedTests: row.passed_tests,
      failedTests: row.failed_tests,
      skippedTests: row.skipped_tests,
      testResults: [] // Would need to be populated separately
    }));
  }

  /**
   * Log event replay
   */
  async logEventReplay(
    startTime: number,
    endTime: number,
    eventsReplayed: number,
    status: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO event_replay_log (start_time, end_time, events_replayed, status, error)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(startTime, endTime, eventsReplayed, status, error || null);
  }

  /**
   * Get event count by type
   */
  async getEventCountByType(type: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM events WHERE type = ?
    `);

    const row = stmt.get(type) as { count: number } | undefined;
    return row?.count || 0;
  }

  /**
   * Clean up old events
   */
  async cleanupOldEvents(beforeTimestamp: number): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM events WHERE timestamp < ?
    `);

    const result = stmt.run(beforeTimestamp);
    return result.changes;
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    totalTestRuns: number;
    totalTestResults: number;
    totalSuiteResults: number;
    databaseSize: number;
  }> {
    const stats = {
      totalEvents: (this.db.prepare('SELECT COUNT(*) as count FROM events').get() as any).count,
      totalTestRuns: (this.db.prepare('SELECT COUNT(*) as count FROM test_runs').get() as any).count,
      totalTestResults: (this.db.prepare('SELECT COUNT(*) as count FROM test_results').get() as any).count,
      totalSuiteResults: (this.db.prepare('SELECT COUNT(*) as count FROM suite_results').get() as any).count,
      databaseSize: 0
    };

    // Get database file size
    const dbInfo = this.db.pragma('page_count') as any;
    const pageSize = this.db.pragma('page_size') as any;
    stats.databaseSize = dbInfo * pageSize;

    return stats;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}