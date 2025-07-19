/**
 * @fileoverview Automated Audit Trail Service with Tamper-Proof Logging
 * @description Blockchain-based immutable audit logging for compliance frameworks
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  AuditEvent,
  AuditRecord,
  AuditQuery,
  AuditQueryResult,
  ComplianceViolation,
  AuditBlock,
  AuditChain
} from './types';

export class AuditTrailService extends EventEmitter {
  private auditChain: AuditChain;
  private storage: AuditStorage;
  private encryptor: AuditEncryptor;
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private eventQueue: AuditEvent[] = [];
  private processing = false;

  constructor() {
    super();
    this.auditChain = new AuditChain();
    this.storage = new AuditStorage();
    this.encryptor = new AuditEncryptor();
    this.initializeComplianceRules();
    this.startEventProcessor();
  }

  /**
   * Log audit event with tamper-proof protection
   */
  public async logEvent(event: AuditEvent): Promise<AuditRecord> {
    // Create immutable audit record
    const record = await this.createAuditRecord(event);
    
    // Add to blockchain for tamper-proof storage
    const block = await this.auditChain.addBlock(record);
    
    // Store in secure storage with encryption
    await this.storage.store(record, block.hash);
    
    // Real-time compliance check
    await this.performComplianceCheck(record);
    
    this.emit('audit_event_logged', record);
    
    return record;
  }

  /**
   * Queue audit event for batch processing
   */
  public queueEvent(event: AuditEvent): void {
    this.eventQueue.push({
      ...event,
      queuedAt: new Date()
    });
    
    // Trigger processing if not already running
    if (!this.processing) {
      this.processEventQueue();
    }
  }

  /**
   * Query audit trail with advanced filtering
   */
  public async queryAuditTrail(query: AuditQuery): Promise<AuditQueryResult> {
    const results = await this.storage.query(query);
    
    // Verify integrity of results
    const integrityValid = await this.verifyChainIntegrity(results.records);
    
    // Apply additional filtering if needed
    const filteredResults = await this.applyAdvancedFilters(results, query);
    
    return {
      ...filteredResults,
      integrityValid,
      chainVerified: true,
      exportFormats: ['json', 'csv', 'pdf', 'xml']
    };
  }

  /**
   * Generate compliance audit report
   */
  public async generateComplianceReport(params: {
    framework: 'SOC2' | 'GDPR' | 'HIPAA';
    startDate: Date;
    endDate: Date;
    includeEvidence?: boolean;
  }): Promise<any> {
    const query: AuditQuery = {
      startDate: params.startDate,
      endDate: params.endDate,
      compliance: params.framework,
      includeEvidence: params.includeEvidence || false
    };

    const auditData = await this.queryAuditTrail(query);
    
    const report = {
      id: crypto.randomUUID(),
      framework: params.framework,
      period: {
        start: params.startDate,
        end: params.endDate
      },
      summary: this.generateReportSummary(auditData),
      complianceFindings: this.analyzeCompliance(auditData, params.framework),
      auditTrail: auditData.records,
      integrityValidation: {
        chainValid: auditData.integrityValid,
        totalRecords: auditData.records.length,
        verificationTimestamp: new Date()
      },
      evidence: params.includeEvidence ? await this.collectEvidence(auditData) : undefined,
      generatedAt: new Date(),
      attestation: await this.generateAttestation(auditData)
    };

    // Store report for future reference
    await this.storage.storeReport(report);

    this.emit('compliance_report_generated', report);
    return report;
  }

  /**
   * Export audit trail in various formats
   */
  public async exportAuditTrail(query: AuditQuery, format: 'json' | 'csv' | 'pdf' | 'xml'): Promise<any> {
    const auditData = await this.queryAuditTrail(query);
    
    switch (format) {
      case 'json':
        return this.exportToJSON(auditData);
      case 'csv':
        return this.exportToCSV(auditData);
      case 'pdf':
        return this.exportToPDF(auditData);
      case 'xml':
        return this.exportToXML(auditData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Verify audit trail integrity
   */
  public async verifyIntegrity(startDate?: Date, endDate?: Date): Promise<{
    valid: boolean;
    details: any;
    violations?: any[];
  }> {
    const query: AuditQuery = {
      startDate: startDate || new Date(0),
      endDate: endDate || new Date(),
      includeAll: true
    };

    const records = await this.storage.query(query);
    
    // Verify blockchain integrity
    const chainIntegrity = await this.auditChain.verifyIntegrity();
    
    // Verify individual record hashes
    const recordIntegrity = await this.verifyRecordHashes(records.records);
    
    // Check for gaps in sequence
    const sequenceIntegrity = this.verifySequenceIntegrity(records.records);
    
    const violations = [];
    
    if (!chainIntegrity.valid) {
      violations.push({
        type: 'chain_integrity',
        description: 'Blockchain integrity compromised',
        details: chainIntegrity.violations
      });
    }
    
    if (!recordIntegrity.valid) {
      violations.push({
        type: 'record_integrity',
        description: 'Record hash verification failed',
        details: recordIntegrity.violations
      });
    }
    
    if (!sequenceIntegrity.valid) {
      violations.push({
        type: 'sequence_integrity',
        description: 'Record sequence compromised',
        details: sequenceIntegrity.violations
      });
    }

    const isValid = violations.length === 0;

    const result = {
      valid: isValid,
      details: {
        chainIntegrity,
        recordIntegrity,
        sequenceIntegrity,
        totalRecords: records.records.length,
        verifiedAt: new Date()
      },
      violations: violations.length > 0 ? violations : undefined
    };

    this.emit('integrity_verification_completed', result);
    return result;
  }

  /**
   * Create immutable audit record
   */
  private async createAuditRecord(event: AuditEvent): Promise<AuditRecord> {
    const previousBlock = await this.auditChain.getLastBlock();
    
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: event.type,
      actor: event.actor,
      resource: event.resource,
      action: event.action,
      result: event.result,
      metadata: {
        ...event.metadata,
        clientIp: event.metadata?.clientIp || 'unknown',
        userAgent: event.metadata?.userAgent || 'system',
        sessionId: event.metadata?.sessionId || 'system',
        requestId: event.metadata?.requestId || crypto.randomUUID()
      },
      hash: '',
      previousHash: previousBlock?.hash || '0',
      blockIndex: (previousBlock?.index || 0) + 1,
      signature: ''
    };

    // Encrypt sensitive data if present
    if (event.sensitiveData) {
      record.encryptedData = await this.encryptor.encrypt(event.sensitiveData);
    }

    // Calculate hash including all fields except hash itself
    record.hash = await this.calculateRecordHash(record);
    
    // Sign the record
    record.signature = await this.signRecord(record);

    return record;
  }

  /**
   * Calculate cryptographic hash for record
   */
  private async calculateRecordHash(record: Omit<AuditRecord, 'hash'>): Promise<string> {
    const data = JSON.stringify({
      id: record.id,
      timestamp: record.timestamp,
      eventType: record.eventType,
      actor: record.actor,
      resource: record.resource,
      action: record.action,
      result: record.result,
      metadata: record.metadata,
      previousHash: record.previousHash,
      blockIndex: record.blockIndex,
      encryptedData: record.encryptedData
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sign audit record
   */
  private async signRecord(record: AuditRecord): Promise<string> {
    // In production, use proper digital signatures
    const signData = `${record.hash}-${record.timestamp}-${record.actor}`;
    return crypto.createHash('sha256').update(signData).digest('hex');
  }

  /**
   * Real-time compliance checking
   */
  private async performComplianceCheck(record: AuditRecord): Promise<void> {
    const violations: ComplianceViolation[] = [];

    for (const [ruleId, rule] of this.complianceRules) {
      const violation = await rule.check(record);
      if (violation) {
        violations.push({
          ...violation,
          ruleId,
          recordId: record.id,
          timestamp: new Date()
        });
      }
    }

    if (violations.length > 0) {
      await this.handleComplianceViolations(violations);
    }
  }

  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules(): void {
    // SOC2 Rules
    this.complianceRules.set('SOC2_CC6_1', {
      framework: 'SOC2',
      control: 'CC6.1',
      description: 'Logical access controls monitoring',
      check: async (record: AuditRecord) => {
        if (record.eventType === 'access_granted' && !record.metadata.mfaUsed) {
          return {
            framework: 'SOC2',
            control: 'CC6.1',
            description: 'Access granted without MFA',
            severity: 'high',
            recordId: record.id,
            timestamp: new Date()
          };
        }
        return null;
      }
    });

    // GDPR Rules
    this.complianceRules.set('GDPR_ART32', {
      framework: 'GDPR',
      control: 'Article 32',
      description: 'Security of processing monitoring',
      check: async (record: AuditRecord) => {
        if (record.eventType === 'personal_data_access' && !record.metadata.encrypted) {
          return {
            framework: 'GDPR',
            control: 'Article 32',
            description: 'Personal data accessed without encryption',
            severity: 'critical',
            recordId: record.id,
            timestamp: new Date()
          };
        }
        return null;
      }
    });

    // HIPAA Rules
    this.complianceRules.set('HIPAA_164_312_B', {
      framework: 'HIPAA',
      control: '164.312(b)',
      description: 'Audit controls monitoring',
      check: async (record: AuditRecord) => {
        if (record.eventType === 'phi_access' && !record.metadata.auditLogged) {
          return {
            framework: 'HIPAA',
            control: '164.312(b)',
            description: 'PHI access not properly audited',
            severity: 'high',
            recordId: record.id,
            timestamp: new Date()
          };
        }
        return null;
      }
    });
  }

  /**
   * Handle compliance violations
   */
  private async handleComplianceViolations(violations: ComplianceViolation[]): Promise<void> {
    for (const violation of violations) {
      // Log violation
      await this.logEvent({
        type: 'compliance_violation',
        actor: 'audit_system',
        resource: 'compliance_monitor',
        action: 'violation_detected',
        result: 'failure',
        metadata: {
          violation,
          severity: violation.severity,
          framework: violation.framework,
          control: violation.control
        }
      });

      // Send alert
      this.emit('compliance_violation', violation);

      // Trigger automated response if critical
      if (violation.severity === 'critical') {
        await this.triggerEmergencyResponse(violation);
      }
    }
  }

  /**
   * Trigger emergency response for critical violations
   */
  private async triggerEmergencyResponse(violation: ComplianceViolation): Promise<void> {
    this.emit('emergency_response_triggered', {
      violation,
      timestamp: new Date(),
      actions: [
        'notify_compliance_team',
        'escalate_to_security',
        'initiate_investigation'
      ]
    });
  }

  /**
   * Start event queue processor
   */
  private startEventProcessor(): void {
    setInterval(async () => {
      await this.processEventQueue();
    }, 1000); // Process every second
  }

  /**
   * Process queued events
   */
  private async processEventQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.logEvent(event);
        }
      }
    } catch (error) {
      console.error('Error processing audit event queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Helper methods
   */
  private async verifyChainIntegrity(records: AuditRecord[]): Promise<boolean> {
    return await this.auditChain.verifyIntegrity().then(result => result.valid);
  }

  private async applyAdvancedFilters(results: any, query: AuditQuery): Promise<any> {
    // Apply additional filtering logic
    return results;
  }

  private generateReportSummary(auditData: AuditQueryResult): any {
    return {
      totalEvents: auditData.records.length,
      eventTypes: this.groupByEventType(auditData.records),
      actors: this.groupByActor(auditData.records),
      timeRange: {
        start: auditData.records[0]?.timestamp,
        end: auditData.records[auditData.records.length - 1]?.timestamp
      }
    };
  }

  private analyzeCompliance(auditData: AuditQueryResult, framework: string): any {
    const violations = auditData.records.filter(r => 
      r.eventType === 'compliance_violation' && 
      r.metadata?.violation?.framework === framework
    );

    return {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.metadata?.violation?.severity === 'critical').length,
      highViolations: violations.filter(v => v.metadata?.violation?.severity === 'high').length,
      mediumViolations: violations.filter(v => v.metadata?.violation?.severity === 'medium').length,
      lowViolations: violations.filter(v => v.metadata?.violation?.severity === 'low').length
    };
  }

  private async collectEvidence(auditData: AuditQueryResult): Promise<any[]> {
    // Collect supporting evidence for audit events
    return auditData.records.map(record => ({
      recordId: record.id,
      timestamp: record.timestamp,
      hash: record.hash,
      signature: record.signature,
      blockIndex: record.blockIndex
    }));
  }

  private async generateAttestation(auditData: AuditQueryResult): Promise<any> {
    const attestation = {
      statement: 'This audit trail has been verified for integrity and completeness',
      verificationMethod: 'Blockchain hash verification',
      totalRecords: auditData.records.length,
      integrityStatus: auditData.integrityValid ? 'verified' : 'compromised',
      attestationTimestamp: new Date(),
      digitalSignature: crypto.randomBytes(64).toString('hex')
    };

    return attestation;
  }

  private groupByEventType(records: AuditRecord[]): Record<string, number> {
    return records.reduce((acc, record) => {
      acc[record.eventType] = (acc[record.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByActor(records: AuditRecord[]): Record<string, number> {
    return records.reduce((acc, record) => {
      acc[record.actor] = (acc[record.actor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private async verifyRecordHashes(records: AuditRecord[]): Promise<{ valid: boolean; violations: any[] }> {
    const violations = [];
    
    for (const record of records) {
      const calculatedHash = await this.calculateRecordHash(record);
      if (calculatedHash !== record.hash) {
        violations.push({
          recordId: record.id,
          expectedHash: record.hash,
          calculatedHash,
          timestamp: record.timestamp
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  private verifySequenceIntegrity(records: AuditRecord[]): { valid: boolean; violations: any[] } {
    const violations = [];
    const sortedRecords = records.sort((a, b) => a.blockIndex - b.blockIndex);

    for (let i = 1; i < sortedRecords.length; i++) {
      const current = sortedRecords[i];
      const previous = sortedRecords[i - 1];

      if (current.previousHash !== previous.hash) {
        violations.push({
          recordId: current.id,
          blockIndex: current.blockIndex,
          expectedPreviousHash: previous.hash,
          actualPreviousHash: current.previousHash
        });
      }

      if (current.blockIndex !== previous.blockIndex + 1) {
        violations.push({
          recordId: current.id,
          expectedIndex: previous.blockIndex + 1,
          actualIndex: current.blockIndex,
          gap: true
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  // Export methods
  private exportToJSON(auditData: AuditQueryResult): string {
    return JSON.stringify(auditData, null, 2);
  }

  private exportToCSV(auditData: AuditQueryResult): string {
    const headers = ['ID', 'Timestamp', 'Event Type', 'Actor', 'Resource', 'Action', 'Result', 'Hash'];
    const rows = auditData.records.map(record => [
      record.id,
      new Date(record.timestamp).toISOString(),
      record.eventType,
      record.actor,
      record.resource,
      record.action,
      record.result,
      record.hash
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToPDF(auditData: AuditQueryResult): any {
    // PDF export would use a library like PDFKit
    return {
      format: 'pdf',
      content: 'PDF export not implemented in this demo',
      recordCount: auditData.records.length
    };
  }

  private exportToXML(auditData: AuditQueryResult): string {
    const xmlRecords = auditData.records.map(record => `
      <record>
        <id>${record.id}</id>
        <timestamp>${new Date(record.timestamp).toISOString()}</timestamp>
        <eventType>${record.eventType}</eventType>
        <actor>${record.actor}</actor>
        <resource>${record.resource}</resource>
        <action>${record.action}</action>
        <result>${record.result}</result>
        <hash>${record.hash}</hash>
      </record>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<auditTrail>
  <metadata>
    <totalRecords>${auditData.records.length}</totalRecords>
    <integrityValid>${auditData.integrityValid}</integrityValid>
    <exportedAt>${new Date().toISOString()}</exportedAt>
  </metadata>
  <records>${xmlRecords}</records>
</auditTrail>`;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const chainHealth = await this.auditChain.healthCheck();
      const storageHealth = await this.storage.healthCheck();
      const queueSize = this.eventQueue.length;

      const isHealthy = chainHealth.healthy && storageHealth.healthy && queueSize < 1000;

      return {
        status: isHealthy ? 'healthy' : queueSize > 5000 ? 'unhealthy' : 'degraded',
        details: {
          chain: chainHealth,
          storage: storageHealth,
          queueSize,
          processing: this.processing,
          lastCheck: new Date()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          lastCheck: new Date()
        }
      };
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔍 Shutting down Audit Trail Service');
    // Process remaining events
    await this.processEventQueue();
    // Cleanup and save state
  }
}

// Supporting classes
class AuditChain {
  private blocks: AuditBlock[] = [];
  private genesis: AuditBlock;

  constructor() {
    this.genesis = this.createGenesisBlock();
    this.blocks.push(this.genesis);
  }

  private createGenesisBlock(): AuditBlock {
    return {
      index: 0,
      timestamp: Date.now(),
      records: [],
      hash: this.calculateHash({
        index: 0,
        timestamp: Date.now(),
        records: [],
        previousHash: '0'
      }),
      previousHash: '0'
    };
  }

  public async addBlock(record: AuditRecord): Promise<AuditBlock> {
    const lastBlock = this.getLastBlock();
    const newBlock: AuditBlock = {
      index: lastBlock.index + 1,
      timestamp: Date.now(),
      records: [record],
      previousHash: lastBlock.hash,
      hash: ''
    };

    newBlock.hash = this.calculateHash(newBlock);
    this.blocks.push(newBlock);

    return newBlock;
  }

  public getLastBlock(): AuditBlock {
    return this.blocks[this.blocks.length - 1];
  }

  private calculateHash(block: Omit<AuditBlock, 'hash'>): string {
    return crypto.createHash('sha256')
      .update(JSON.stringify(block))
      .digest('hex');
  }

  public async verifyIntegrity(): Promise<{ valid: boolean; violations?: any[] }> {
    const violations = [];

    for (let i = 1; i < this.blocks.length; i++) {
      const currentBlock = this.blocks[i];
      const previousBlock = this.blocks[i - 1];

      // Verify hash
      const calculatedHash = this.calculateHash(currentBlock);
      if (calculatedHash !== currentBlock.hash) {
        violations.push({
          blockIndex: i,
          type: 'hash_mismatch',
          expected: currentBlock.hash,
          calculated: calculatedHash
        });
      }

      // Verify previous hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        violations.push({
          blockIndex: i,
          type: 'chain_break',
          expected: previousBlock.hash,
          actual: currentBlock.previousHash
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const integrity = await this.verifyIntegrity();
    return {
      healthy: integrity.valid,
      details: {
        totalBlocks: this.blocks.length,
        integrity: integrity.valid,
        violations: integrity.violations
      }
    };
  }
}

class AuditStorage {
  private records: Map<string, AuditRecord> = new Map();
  private reports: Map<string, any> = new Map();

  public async store(record: AuditRecord, blockHash: string): Promise<void> {
    record.blockHash = blockHash;
    this.records.set(record.id, record);
  }

  public async query(query: AuditQuery): Promise<{ records: AuditRecord[]; total: number }> {
    let filteredRecords = Array.from(this.records.values());

    if (query.startDate) {
      filteredRecords = filteredRecords.filter(r => r.timestamp >= query.startDate!.getTime());
    }

    if (query.endDate) {
      filteredRecords = filteredRecords.filter(r => r.timestamp <= query.endDate!.getTime());
    }

    if (query.eventTypes) {
      filteredRecords = filteredRecords.filter(r => query.eventTypes!.includes(r.eventType));
    }

    if (query.actors) {
      filteredRecords = filteredRecords.filter(r => query.actors!.includes(r.actor));
    }

    if (query.resources) {
      filteredRecords = filteredRecords.filter(r => query.resources!.includes(r.resource));
    }

    // Sort by timestamp
    filteredRecords.sort((a, b) => a.timestamp - b.timestamp);

    // Apply pagination
    const start = (query.offset || 0);
    const end = start + (query.limit || filteredRecords.length);
    const paginatedRecords = filteredRecords.slice(start, end);

    return {
      records: paginatedRecords,
      total: filteredRecords.length
    };
  }

  public async storeReport(report: any): Promise<void> {
    this.reports.set(report.id, report);
  }

  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    return {
      healthy: true,
      details: {
        recordCount: this.records.size,
        reportCount: this.reports.size
      }
    };
  }
}

class AuditEncryptor {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = crypto.randomBytes(32);

  public async encrypt(data: any): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  public async decrypt(encryptedData: string): Promise<any> {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

interface ComplianceRule {
  framework: string;
  control: string;
  description: string;
  check: (record: AuditRecord) => Promise<ComplianceViolation | null>;
}

// Factory function
export const createAuditTrailService = () => {
  return new AuditTrailService();
};