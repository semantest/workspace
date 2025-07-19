/*
                     @semantest/mobile-app

 Copyright (C) 2025-today  Semantest Team

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Execution Result Card Component for Mobile App
 * @author Semantest Team
 * @module components/ui/ExecutionResultCard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TestExecutionResult } from '../../services/testing/test-execution.service';

interface ExecutionResultCardProps {
  result: TestExecutionResult;
  onPress?: (result: TestExecutionResult) => void;
  onViewScreenshots?: (screenshots: any[]) => void;
  compact?: boolean;
}

export const ExecutionResultCard: React.FC<ExecutionResultCardProps> = ({
  result,
  onPress,
  onViewScreenshots,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [screenshotModalVisible, setScreenshotModalVisible] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'skipped':
        return '#FF9800';
      case 'timeout':
        return '#9C27B0';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'check-circle';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'skip-next';
      case 'timeout':
        return 'timer';
      case 'error':
        return 'warning';
      default:
        return 'help';
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const passedSteps = result.steps.filter(step => step.status === 'passed').length;
  const failedSteps = result.steps.filter(step => step.status === 'failed').length;
  const passedAssertions = result.assertions.filter(assertion => assertion.passed).length;
  const failedAssertions = result.assertions.filter(assertion => !assertion.passed).length;

  const handleScreenshotPress = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    setScreenshotModalVisible(true);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => onPress?.(result)}
        activeOpacity={0.8}
      >
        <View style={styles.headerContent}>
          <View style={styles.statusContainer}>
            <Icon
              name={getStatusIcon(result.status)}
              size={24}
              color={getStatusColor(result.status)}
            />
            <Text style={[styles.status, { color: getStatusColor(result.status) }]}>
              {result.status.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.metaInfo}>
            <Text style={styles.runId}>Run #{result.runId.split('_')[1]}</Text>
            <Text style={styles.duration}>{formatDuration(result.duration)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.summary}>
        <Text style={styles.timestamp}>{formatDate(result.startTime)}</Text>
        
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{passedSteps}/{result.steps.length}</Text>
            <Text style={styles.metricLabel}>Steps</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{passedAssertions}/{result.assertions.length}</Text>
            <Text style={styles.metricLabel}>Assertions</Text>
          </View>
          {result.errors.length > 0 && (
            <View style={styles.metric}>
              <Text style={[styles.metricValue, styles.errorValue]}>{result.errors.length}</Text>
              <Text style={styles.metricLabel}>Errors</Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.details}>
          {/* Steps Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Steps</Text>
            {result.steps.map((step, index) => (
              <View key={step.stepId} style={styles.stepItem}>
                <Icon
                  name={getStatusIcon(step.status)}
                  size={16}
                  color={getStatusColor(step.status)}
                />
                <Text style={styles.stepText}>
                  {index + 1}. {step.description}
                </Text>
                <Text style={styles.stepDuration}>
                  {formatDuration(step.duration)}
                </Text>
              </View>
            ))}
          </View>

          {/* Assertions Section */}
          {result.assertions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assertions</Text>
              {result.assertions.map((assertion) => (
                <View key={assertion.assertionId} style={styles.assertionItem}>
                  <Icon
                    name={assertion.passed ? 'check' : 'close'}
                    size={16}
                    color={assertion.passed ? '#4CAF50' : '#F44336'}
                  />
                  <Text style={styles.assertionText}>{assertion.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Screenshots Section */}
          {result.screenshots && result.screenshots.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Screenshots</Text>
                {onViewScreenshots && (
                  <TouchableOpacity
                    onPress={() => onViewScreenshots(result.screenshots)}
                    style={styles.viewAllButton}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {result.screenshots.slice(0, 5).map((screenshot, index) => (
                  <TouchableOpacity
                    key={screenshot.id}
                    onPress={() => handleScreenshotPress(screenshot)}
                    style={styles.screenshotThumbnail}
                  >
                    {screenshot.base64Data && (
                      <Image
                        source={{ uri: `data:image/png;base64,${screenshot.base64Data}` }}
                        style={styles.screenshotImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={styles.screenshotName} numberOfLines={1}>
                      {screenshot.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Memory</Text>
                <Text style={styles.performanceValue}>
                  {Math.max(...result.performance.memoryUsage)}MB
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>CPU</Text>
                <Text style={styles.performanceValue}>
                  {Math.max(...result.performance.cpuUsage)}%
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Battery</Text>
                <Text style={styles.performanceValue}>
                  {result.performance.batteryUsage}%
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>FPS</Text>
                <Text style={styles.performanceValue}>
                  {result.performance.renderingMetrics.frameRate}
                </Text>
              </View>
            </View>
          </View>

          {/* Errors Section */}
          {result.errors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Errors</Text>
              {result.errors.map((error, index) => (
                <View key={index} style={styles.errorItem}>
                  <Icon name="error" size={16} color="#F44336" />
                  <Text style={styles.errorText}>{error.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Screenshot Modal */}
      <Modal
        visible={screenshotModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setScreenshotModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setScreenshotModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {selectedScreenshot && selectedScreenshot.base64Data && (
                <Image
                  source={{ uri: `data:image/png;base64,${selectedScreenshot.base64Data}` }}
                  style={styles.fullScreenshot}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.screenshotTitle}>
                {selectedScreenshot?.name}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerContent: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runId: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  duration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  expandButton: {
    padding: 4,
  },
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorValue: {
    color: '#F44336',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  stepDuration: {
    fontSize: 12,
    color: '#666',
  },
  assertionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  assertionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  screenshotThumbnail: {
    width: 80,
    marginRight: 12,
  },
  screenshotImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  screenshotName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  performanceItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    backgroundColor: '#FFF3F3',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    alignItems: 'center',
  },
  fullScreenshot: {
    width: '100%',
    height: '70%',
    borderRadius: 8,
  },
  screenshotTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
});