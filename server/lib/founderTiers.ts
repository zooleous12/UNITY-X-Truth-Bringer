/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Founder Tier Management
 * 
 * Manages founder core users (1-10) and beta testers (11-30)
 */

export interface FounderTierInfo {
  isFounder: boolean;
  isBetaTester: boolean;
  seatNumber: number | null;
  badge: string | null;
  lifetimeFree: boolean;
  betaFreeYearActive: boolean;
}

export class FounderTierManager {
  private readonly FOUNDER_SEATS = 10; // Seats 1-10
  private readonly BETA_TESTER_SEATS = 20; // Seats 11-30
  private readonly BETA_COMPLETION_MILESTONE = 1000; // Users needed to complete beta

  /**
   * Check if a seat number is available
   */
  isSeatAvailable(seatNumber: number, existingSeats: number[]): boolean {
    return !existingSeats.includes(seatNumber);
  }

  /**
   * Get next available founder seat (6-10 public seats)
   */
  getNextFounderSeat(existingSeats: number[]): number | null {
    for (let seat = 6; seat <= this.FOUNDER_SEATS; seat++) {
      if (!existingSeats.includes(seat)) {
        return seat;
      }
    }
    return null;
  }

  /**
   * Get next available beta tester seat (11-30)
   */
  getNextBetaTesterSeat(existingSeats: number[]): number | null {
    for (let seat = 11; seat <= 30; seat++) {
      if (!existingSeats.includes(seat)) {
        return seat;
      }
    }
    return null;
  }

  /**
   * Check if user qualifies for founder tier
   */
  canClaimFounderSeat(userCount: number): boolean {
    return userCount <= this.FOUNDER_SEATS;
  }

  /**
   * Check if user qualifies for beta tester tier
   */
  canClaimBetaTesterSeat(userCount: number): boolean {
    return userCount > this.FOUNDER_SEATS && userCount <= 30;
  }

  /**
   * Check if beta program has completed
   */
  isBetaComplete(totalUsers: number): boolean {
    return totalUsers >= this.BETA_COMPLETION_MILESTONE;
  }

  /**
   * Calculate days remaining in beta free year
   */
  getBetaFreeYearDaysRemaining(betaFreeYearEnd: Date | null): number {
    if (!betaFreeYearEnd) return 0;
    
    const now = new Date();
    const end = new Date(betaFreeYearEnd);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Generate founder badge text
   */
  getFounderBadge(seatNumber: number, seatType: string): string {
    if (seatNumber >= 1 && seatNumber <= 10) {
      return `Core User #${seatNumber}`;
    } else if (seatNumber >= 11 && seatNumber <= 30) {
      return `Beta Tester #${seatNumber}`;
    }
    return '';
  }

  /**
   * Get tier benefits description
   */
  getTierBenefits(userTier: string): string[] {
    if (userTier === 'founder_core') {
      return [
        'FREE FOR LIFE - No subscription fees, ever',
        'Design Team Role - Help shape product direction',
        'All features unlocked - Academic tier ($39/month value)',
        'Unlimited processing - No usage limits',
        'Priority support - Direct founder access',
        'Exclusive Core User badge',
      ];
    } else if (userTier === 'beta_tester') {
      return [
        '1 YEAR FREE after beta completion',
        'Full Academic tier access ($468 value)',
        'Beta Tester badge + recognition',
        'Influence product development',
        'Priority feature requests',
        'Special community channel access',
      ];
    }
    return [];
  }

  /**
   * Calculate progress to beta completion
   */
  getBetaProgress(currentUsers: number): {
    current: number;
    target: number;
    percentage: number;
    remaining: number;
  } {
    return {
      current: currentUsers,
      target: this.BETA_COMPLETION_MILESTONE,
      percentage: Math.round((currentUsers / this.BETA_COMPLETION_MILESTONE) * 100),
      remaining: Math.max(0, this.BETA_COMPLETION_MILESTONE - currentUsers),
    };
  }

  /**
   * Unlock beta free year for a user
   */
  unlockBetaFreeYear(): {
    betaFreeYearStart: Date;
    betaFreeYearEnd: Date;
  } {
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1); // 1 year from now

    return {
      betaFreeYearStart: start,
      betaFreeYearEnd: end,
    };
  }

  /**
   * Check if user should have access (founder or active beta free year)
   */
  hasSpecialAccess(
    userTier: string,
    lifetimeFree: boolean,
    betaFreeYearEnd: Date | null
  ): boolean {
    // Founders have lifetime access
    if (userTier === 'founder_core' && lifetimeFree) {
      return true;
    }

    // Beta testers with active free year
    if (userTier === 'beta_tester' && betaFreeYearEnd) {
      const now = new Date();
      return now < betaFreeYearEnd;
    }

    return false;
  }
}

// Export singleton instance
export const founderTierManager = new FounderTierManager();
