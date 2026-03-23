/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Achievement System
 */

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  category: 'streak' | 'volume' | 'accuracy' | 'time' | 'variety';
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_card',
    name: 'First Step',
    description: 'Study your first flashcard',
    icon: '🎬',
    target: 1,
    category: 'volume',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    icon: '⚔️',
    target: 7,
    category: 'streak',
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Study 100 flashcards in one day',
    icon: '💯',
    target: 100,
    category: 'volume',
  },
  {
    id: 'accuracy_master',
    name: 'Accuracy Master',
    description: 'Achieve 95% accuracy in a session',
    icon: '🎯',
    target: 95,
    category: 'accuracy',
  },
  {
    id: 'knowledge_keeper',
    name: 'Knowledge Keeper',
    description: 'Complete 50 study sessions',
    icon: '📚',
    target: 50,
    category: 'volume',
  },
  {
    id: 'speed_reader',
    name: 'Speed Reader',
    description: 'Complete a session in under 15 minutes',
    icon: '⚡',
    target: 1,
    category: 'time',
  },
  {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Study for 100 total hours',
    icon: '🏆',
    target: 100,
    category: 'time',
  },
  {
    id: 'multi_tasker',
    name: 'Multi-Tasker',
    description: 'Study 5 different subjects',
    icon: '🎓',
    target: 5,
    category: 'variety',
  },
];

export class AchievementManager {
  /**
   * Check if achievement should be unlocked based on user stats
   */
  checkAchievement(
    achievementId: string,
    currentProgress: number
  ): boolean {
    const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (!achievement) return false;
    
    return currentProgress >= achievement.target;
  }

  /**
   * Calculate progress percentage for an achievement
   */
  calculateProgress(achievementId: string, currentValue: number): number {
    const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (!achievement) return 0;
    
    const progress = Math.min(100, Math.round((currentValue / achievement.target) * 100));
    return progress;
  }

  /**
   * Get achievements that should be checked after a study session
   */
  getAchievementsToCheck(sessionData: {
    cardsStudied: number;
    accuracy: number;
    durationMinutes: number;
    streakDays: number;
    totalSessions: number;
    totalHours: number;
    subjectsCount: number;
  }): Array<{ achievementId: string; currentValue: number }> {
    return [
      { achievementId: 'first_card', currentValue: sessionData.cardsStudied },
      { achievementId: 'week_warrior', currentValue: sessionData.streakDays },
      { achievementId: 'century_club', currentValue: sessionData.cardsStudied },
      { achievementId: 'accuracy_master', currentValue: sessionData.accuracy },
      { achievementId: 'knowledge_keeper', currentValue: sessionData.totalSessions },
      { achievementId: 'speed_reader', currentValue: sessionData.durationMinutes <= 15 ? 1 : 0 },
      { achievementId: 'dedicated_learner', currentValue: sessionData.totalHours },
      { achievementId: 'multi_tasker', currentValue: sessionData.subjectsCount },
    ];
  }

  /**
   * Get newly unlocked achievements
   */
  getNewlyUnlocked(
    checks: Array<{ achievementId: string; currentValue: number }>,
    existingAchievements: Set<string>
  ): string[] {
    const newlyUnlocked: string[] = [];

    for (const check of checks) {
      if (existingAchievements.has(check.achievementId)) {
        continue; // Already unlocked
      }

      if (this.checkAchievement(check.achievementId, check.currentValue)) {
        newlyUnlocked.push(check.achievementId);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get achievement by ID
   */
  getAchievement(achievementId: string): AchievementDefinition | undefined {
    return ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
  }

  /**
   * Get all achievements with progress
   */
  getAllWithProgress(userStats: {
    cardsStudied: number;
    streakDays: number;
    totalSessions: number;
    totalHours: number;
    subjectsCount: number;
    bestAccuracy: number;
    fastestSession: number;
  }): Array<AchievementDefinition & { progress: number; unlocked: boolean }> {
    return ACHIEVEMENT_DEFINITIONS.map(achievement => {
      let currentValue = 0;

      switch (achievement.id) {
        case 'first_card':
        case 'century_club':
          currentValue = userStats.cardsStudied;
          break;
        case 'week_warrior':
          currentValue = userStats.streakDays;
          break;
        case 'accuracy_master':
          currentValue = userStats.bestAccuracy;
          break;
        case 'knowledge_keeper':
          currentValue = userStats.totalSessions;
          break;
        case 'speed_reader':
          currentValue = userStats.fastestSession <= 15 ? 1 : 0;
          break;
        case 'dedicated_learner':
          currentValue = userStats.totalHours;
          break;
        case 'multi_tasker':
          currentValue = userStats.subjectsCount;
          break;
      }

      const progress = this.calculateProgress(achievement.id, currentValue);
      const unlocked = this.checkAchievement(achievement.id, currentValue);

      return {
        ...achievement,
        progress,
        unlocked,
      };
    });
  }
}

// Export singleton
export const achievementManager = new AchievementManager();
