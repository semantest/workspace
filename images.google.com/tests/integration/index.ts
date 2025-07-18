/*
                        Semantest - Integration Tests Index
                        Security Integration Test Suite

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Security Integration Test Suite
export * from './security-integration.test';
export * from './cross-module-integration.test';
export * from './infrastructure-security.test';
export * from './module-boundary-security.test';

// Test Configuration
export const SECURITY_TEST_CONFIG = {
    timeout: 30000,
    retries: 3,
    coverage: {
        threshold: 80,
        collectFrom: [
            'src/**/*.ts',
            'domain/**/*.ts',
            'application/**/*.ts',
            'infrastructure/**/*.ts'
        ]
    },
    security: {
        validateInputs: true,
        validateOutputs: true,
        validateBoundaries: true,
        validateAccessControl: true,
        validateDataFlow: true
    }
} as const;