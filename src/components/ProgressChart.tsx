// F:\StudyBuddy\src\components\ProgressChart.tsx
// ============================================
// PROGRESS CHART COMPONENT
// Displays study progress in a chart format
// ============================================

import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { SubjectProgress } from '../types';

interface ProgressChartProps {
  data: SubjectProgress[];
  type: 'bar' | 'line' | 'pie';
}

const { width: screenWidth } = Dimensions.get('window');

export const ProgressChart: React.FC<ProgressChartProps> = ({ data, type }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No progress data available</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#6366F1',
    },
  };

  if (type === 'bar') {
    const barData = {
      labels: data.map(item => item.subject.substring(0, 3)),
      datasets: [
        {
          data: data.map(item => item.total_minutes / 60), // Convert to hours
        },
      ],
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Study Hours by Subject</Text>
        <BarChart
          data={barData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="h"
        />
      </View>
    );
  }

  if (type === 'line') {
    const lineData = {
      labels: data.map(item => item.subject.substring(0, 3)),
      datasets: [
        {
          data: data.map(item => item.accuracy_rate),
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Accuracy Rate by Subject</Text>
        <LineChart
          data={lineData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
          yAxisSuffix="%"
        />
      </View>
    );
  }

  if (type === 'pie') {
    const pieData = data.map((item, index) => ({
      name: item.subject,
      population: item.total_minutes,
      color: [
        '#6366F1',
        '#8B5CF6',
        '#EC4899',
        '#F59E0B',
        '#10B981',
        '#EF4444',
      ][index % 6],
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Study Time Distribution</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 10]}
          absolute
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});