/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - SM-2 Spaced Repetition Algorithm
 * 
 * Implements SuperMemo 2 algorithm for optimal flashcard scheduling
 */

export enum CardDifficulty {
  EASY = 5,
  MEDIUM = 3,
  HARD = 1,
}

export interface CardReview {
  timestamp: Date;
  difficultyRating: number; // 1-5 scale
  timeTaken: number; // seconds
  correct: boolean;
}

export interface CardSchedule {
  cardId: number;
  nextReview: Date;
  interval: number; // days until next review
  easinessFactor: number; // SM-2 easiness factor
  repetitions: number; // number of times reviewed
  currentStreak: number; // consecutive correct answers
}

export class SpacedRepetitionScheduler {
  private readonly defaultEasiness = 2.5;
  private readonly minEasiness = 1.3;

  /**
   * Initialize schedule for a new flashcard
   */
  initializeCard(cardId: number): CardSchedule {
    return {
      cardId,
      nextReview: new Date(),
      interval: 1,
      easinessFactor: this.defaultEasiness,
      repetitions: 0,
      currentStreak: 0,
    };
  }

  /**
   * Record a review and update schedule using SM-2 algorithm
   * 
   * @param schedule - Current card schedule
   * @param difficultyRating - 1-5 rating (1=hard, 5=easy)
   * @param correct - Whether answer was correct
   * @returns Updated schedule
   */
  recordReview(
    schedule: CardSchedule,
    difficultyRating: number,
    correct: boolean
  ): CardSchedule {
    // Update streak
    const currentStreak = correct ? schedule.currentStreak + 1 : 0;

    // Calculate new interval using SM-2
    let newInterval: number;
    let newRepetitions = schedule.repetitions;

    if (schedule.repetitions === 0) {
      // First review
      newInterval = 1;
      newRepetitions = 1;
    } else if (schedule.repetitions === 1) {
      // Second review
      newInterval = 3;
      newRepetitions = 2;
    } else {
      // Subsequent reviews
      newRepetitions = schedule.repetitions + 1;
      newInterval = Math.round(schedule.interval * schedule.easinessFactor);
    }

    // Update easiness factor (SM-2 formula)
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // where q is the quality rating (0-5)
    const q = difficultyRating;
    let newEasiness = schedule.easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEasiness = Math.max(this.minEasiness, newEasiness);

    // Adjust interval based on correctness
    if (!correct && schedule.repetitions > 1) {
      newRepetitions = 1;
      newInterval = 1;
    }

    // Ensure minimum interval
    newInterval = Math.max(1, newInterval);

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
      cardId: schedule.cardId,
      nextReview,
      interval: newInterval,
      easinessFactor: newEasiness,
      repetitions: newRepetitions,
      currentStreak,
    };
  }

  /**
   * Get cards that are due for review
   */
  getCardsDueForReview(schedules: CardSchedule[]): number[] {
    const now = new Date();
    return schedules
      .filter(schedule => schedule.nextReview <= now)
      .map(schedule => schedule.cardId);
  }

  /**
   * Get learning forecast for next N days
   */
  getLearningForecast(schedules: CardSchedule[], days: number = 14): Map<string, number> {
    const forecast = new Map<string, number>();
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + i);
      const dateKey = targetDate.toISOString().split('T')[0];

      const dueCount = schedules.filter(schedule => {
        const reviewDate = new Date(schedule.nextReview);
        return reviewDate.toISOString().split('T')[0] === dateKey;
      }).length;

      forecast.set(dateKey, dueCount);
    }

    return forecast;
  }

  /**
   * Calculate retention rate for a card
   */
  calculateRetention(correctCount: number, incorrectCount: number): number {
    const total = correctCount + incorrectCount;
    if (total === 0) return 0;
    return (correctCount / total) * 100;
  }

  /**
   * Get recommended difficulty rating based on performance
   */
  getRecommendedDifficulty(timeTaken: number, averageTime: number): CardDifficulty {
    if (timeTaken <= averageTime * 0.7) {
      return CardDifficulty.EASY;
    } else if (timeTaken <= averageTime * 1.3) {
      return CardDifficulty.MEDIUM;
    } else {
      return CardDifficulty.HARD;
    }
  }
}

// Export singleton instance
export const spacedRepetitionScheduler = new SpacedRepetitionScheduler();
