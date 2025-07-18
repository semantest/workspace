import * as ss from 'simple-statistics';

/**
 * Time series analysis for predictive analytics
 */
export class TimeSeriesAnalyzer {
  async analyze(data: Array<{ timestamp: Date; value: number }>): Promise<TimeSeriesAnalysis> {
    if (data.length === 0) {
      return {
        trend: 'stable',
        seasonality: false,
        mean: 0,
        stdDev: 0,
        forecast: []
      };
    }
    
    const values = data.map(d => d.value);
    
    return {
      trend: this.detectTrend(values),
      seasonality: this.detectSeasonality(data),
      mean: ss.mean(values),
      stdDev: ss.standardDeviation(values),
      forecast: this.generateForecast(data)
    };
  }
  
  async identifyTrends(data: any[]): Promise<TrendAnalysis> {
    const values = data.map(d => d.value || d);
    const timestamps = data.map((d, i) => d.timestamp || i);
    
    // Calculate linear regression
    const regression = ss.linearRegression(
      timestamps.map((t, i) => [i, values[i]])
    );
    
    // Determine trend direction
    const trendDirection = regression.m > 0.1 ? 'increasing' :
                          regression.m < -0.1 ? 'decreasing' : 'stable';
    
    // Calculate trend strength
    const rSquared = this.calculateRSquared(values, regression);
    
    return {
      direction: trendDirection,
      strength: rSquared,
      slope: regression.m,
      intercept: regression.b,
      predictions: this.generateTrendPredictions(regression, values.length)
    };
  }
  
  private detectTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const firstThird = values.slice(0, Math.floor(values.length / 3));
    const lastThird = values.slice(Math.floor(2 * values.length / 3));
    
    const firstMean = ss.mean(firstThird);
    const lastMean = ss.mean(lastThird);
    
    const change = (lastMean - firstMean) / firstMean;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
  
  private detectSeasonality(data: Array<{ timestamp: Date; value: number }>): boolean {
    if (data.length < 24) return false; // Need at least 24 data points
    
    // Simple seasonality detection using autocorrelation
    const values = data.map(d => d.value);
    const periods = [7, 30, 365]; // Weekly, monthly, yearly
    
    for (const period of periods) {
      if (values.length >= period * 2) {
        const correlation = this.autocorrelation(values, period);
        if (correlation > 0.7) return true;
      }
    }
    
    return false;
  }
  
  private autocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;
    
    const n = values.length - lag;
    const mean = ss.mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  private generateForecast(
    data: Array<{ timestamp: Date; value: number }>
  ): Array<{ timestamp: Date; value: number; confidence: number }> {
    if (data.length < 3) return [];
    
    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp.getTime());
    
    // Simple linear forecast
    const regression = ss.linearRegression(
      values.map((v, i) => [i, v])
    );
    
    const forecast: Array<{ timestamp: Date; value: number; confidence: number }> = [];
    const lastTimestamp = timestamps[timestamps.length - 1];
    const avgInterval = (lastTimestamp - timestamps[0]) / (timestamps.length - 1);
    
    // Generate 5 future points
    for (let i = 1; i <= 5; i++) {
      const futureIndex = values.length + i - 1;
      const predictedValue = regression.m * futureIndex + regression.b;
      const confidence = Math.max(0, 1 - (i * 0.1)); // Decrease confidence over time
      
      forecast.push({
        timestamp: new Date(lastTimestamp + avgInterval * i),
        value: Math.max(0, predictedValue),
        confidence
      });
    }
    
    return forecast;
  }
  
  private calculateRSquared(values: number[], regression: any): number {
    const mean = ss.mean(values);
    let ssTotal = 0;
    let ssResidual = 0;
    
    values.forEach((value, i) => {
      const predicted = regression.m * i + regression.b;
      ssTotal += Math.pow(value - mean, 2);
      ssResidual += Math.pow(value - predicted, 2);
    });
    
    return ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
  }
  
  private generateTrendPredictions(
    regression: any,
    currentLength: number
  ): number[] {
    const predictions: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const futureIndex = currentLength + i;
      predictions.push(regression.m * futureIndex + regression.b);
    }
    
    return predictions;
  }
  
  identifySeasonality(data: any[]): SeasonalityAnalysis {
    const values = data.map(d => d.value || d);
    
    return {
      hasSeasonality: this.detectSeasonality(
        data.map((d, i) => ({ 
          timestamp: new Date(i * 86400000), 
          value: d.value || d 
        }))
      ),
      period: this.detectPeriod(values),
      strength: this.calculateSeasonalityStrength(values),
      type: 'multiplicative' // or 'additive'
    };
  }
  
  private detectPeriod(values: number[]): number {
    // Simplified period detection
    const periods = [7, 30, 365];
    let maxCorrelation = 0;
    let detectedPeriod = 0;
    
    for (const period of periods) {
      if (values.length >= period * 2) {
        const correlation = this.autocorrelation(values, period);
        if (correlation > maxCorrelation) {
          maxCorrelation = correlation;
          detectedPeriod = period;
        }
      }
    }
    
    return detectedPeriod;
  }
  
  private calculateSeasonalityStrength(values: number[]): number {
    const period = this.detectPeriod(values);
    if (period === 0) return 0;
    
    return this.autocorrelation(values, period);
  }
}

// Types
export interface TimeSeriesAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: boolean;
  mean: number;
  stdDev: number;
  forecast: Array<{ timestamp: Date; value: number; confidence: number }>;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  slope: number;
  intercept: number;
  predictions: number[];
}

export interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  period: number;
  strength: number;
  type: 'additive' | 'multiplicative';
}