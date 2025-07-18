/*
                        Semantest - Pinterest Infrastructure Adapters
                        Pinterest API Adapter

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import axios, { AxiosResponse } from 'axios';
import { PinMetadata } from '../../domain/entities/pin.entity';
import { BoardMetadata } from '../../domain/entities/board.entity';

export interface PinterestApiConfig {
    accessToken: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
}

/**
 * Pinterest API Adapter
 * 
 * Handles communication with Pinterest API for retrieving
 * pin and board information.
 */
export class PinterestApiAdapter {
    private readonly config: Required<PinterestApiConfig>;

    constructor(config: PinterestApiConfig) {
        this.config = {
            baseUrl: 'https://api.pinterest.com/v5',
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }

    /**
     * Get pin details by ID
     */
    async getPinDetails(pinId: string): Promise<any> {
        const url = `${this.config.baseUrl}/pins/${pinId}`;
        const response = await this.makeRequest(url);
        return response.data;
    }

    /**
     * Get board details by ID
     */
    async getBoardDetails(boardId: string): Promise<any> {
        const url = `${this.config.baseUrl}/boards/${boardId}`;
        const response = await this.makeRequest(url);
        return response.data;
    }

    /**
     * Make HTTP request with retry logic
     */
    private async makeRequest(url: string, retryCount = 0): Promise<AxiosResponse> {
        try {
            const response = await axios.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'User-Agent': 'Semantest Pinterest API Client/1.0.0',
                    'Accept': 'application/json'
                }
            });

            return response;
        } catch (error) {
            if (retryCount < this.config.maxRetries) {
                await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(url, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}