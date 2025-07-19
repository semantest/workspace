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
 * @fileoverview Test Card Component for Mobile App
 * @author Semantest Team
 * @module components/ui/TestCard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OfflineTestData } from '../../services/offline/OfflineManager';

interface TestCardProps {
  test: OfflineTestData;
  onPress: (testId: string) => void;
  onExecute: (testId: string) => void;
  onEdit?: (testId: string) => void;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

export const TestCard: React.FC<TestCardProps> = ({
  test,
  onPress,
  onExecute,
  onEdit,
  compact = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return styles.statusSynced;
      case 'local':
        return styles.statusLocal;
      case 'pending':
        return styles.statusPending;
      case 'error':
        return styles.statusError;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return 'cloud-done';
      case 'local':
        return 'smartphone';
      case 'pending':
        return 'sync';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => onPress(test.id)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
            {test.name}
          </Text>
          <View style={[styles.statusBadge, getStatusColor(test.syncStatus)]}>
            <Icon 
              name={getStatusIcon(test.syncStatus)} 
              size={12} 
              color="#fff" 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>{test.syncStatus}</Text>
          </View>
        </View>
        {onEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(test.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="edit" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {!compact && (
        <Text style={styles.description} numberOfLines={2}>
          {test.description || 'No description available'}
        </Text>
      )}

      <View style={styles.metadata}>
        <View style={styles.metadataItem}>
          <Icon name="play-circle-outline" size={16} color="#666" />
          <Text style={styles.metadataText}>
            {test.config.steps.length} steps
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Icon name="check-circle-outline" size={16} color="#666" />
          <Text style={styles.metadataText}>
            {test.config.assertions.length} assertions
          </Text>
        </View>
        {test.lastRunAt && (
          <View style={styles.metadataItem}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.metadataText}>
              {formatDate(test.lastRunAt)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.executeButton]}
          onPress={() => onExecute(test.id)}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.executeButtonText}>Run Test</Text>
        </TouchableOpacity>
        
        <View style={styles.actionMetrics}>
          {test.lastRunStatus && (
            <View style={[
              styles.lastRunStatus,
              test.lastRunStatus === 'passed' ? styles.statusPassed : styles.statusFailed
            ]}>
              <Icon 
                name={test.lastRunStatus === 'passed' ? 'check' : 'close'} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.lastRunText}>{test.lastRunStatus}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardCompact: {
    padding: 12,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
  },
  statusSynced: {
    backgroundColor: '#4CAF50',
  },
  statusLocal: {
    backgroundColor: '#2196F3',
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusError: {
    backgroundColor: '#F44336',
  },
  statusDefault: {
    backgroundColor: '#9E9E9E',
  },
  editButton: {
    padding: 4,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  executeButton: {
    backgroundColor: '#007AFF',
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  executeButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  actionMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastRunStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPassed: {
    backgroundColor: '#4CAF50',
  },
  statusFailed: {
    backgroundColor: '#F44336',
  },
  lastRunText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
});