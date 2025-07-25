import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import {
  GovernanceConfig,
  Proposal,
  Vote,
  VotingResult,
  ProposalCreationResult,
  ProposalInfo,
  DelegatedVote,
  DelegationResult,
  ExecutionResult,
  GovernanceAnalytics,
  ParticipationMetrics,
  ProposalStatus,
  VotingTally,
  SecurityValidation,
  AuditLog,
  GovernanceEvent,
  RateLimit,
  ProposalFilter,
  VoteFilter,
  TokenBalance,
  GovernanceRole,
  TreasuryOperation
} from './types';

export class DecentralizedGovernanceSystem extends EventEmitter {
  private config: GovernanceConfig;
  private web3Provider?: ethers.Provider;
  private signer?: ethers.Signer;
  private proposals: Map<string, ProposalInfo>;
  private votes: Map<string, Vote[]>; // proposalId -> votes
  private delegations: Map<string, DelegatedVote[]>; // delegator -> delegations
  private rateLimits: Map<string, RateLimit>;
  private cache: LRUCache<string, any>;
  private auditLogs: AuditLog[];
  private isInitialized: boolean = false;
  private proposalTimers: Map<string, NodeJS.Timeout>;
  private executionQueue: Map<string, NodeJS.Timeout>;

  constructor(config: GovernanceConfig) {
    super();
    this.config = config;
    this.proposals = new Map();
    this.votes = new Map();
    this.delegations = new Map();
    this.rateLimits = new Map();
    this.cache = new LRUCache({ max: 1000 });
    this.auditLogs = [];
    this.proposalTimers = new Map();
    this.executionQueue = new Map();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Web3 provider
      this.web3Provider = new ethers.JsonRpcProvider(this.config.web3Provider);
      
      // Create signer for transactions
      if (process.env.GOVERNANCE_PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.GOVERNANCE_PRIVATE_KEY, this.web3Provider);
      }

      this.isInitialized = true;
      this.emit('system:initialized', { timestamp: Date.now() });
      
      this.logAudit('SYSTEM_INITIALIZED', 'SYSTEM', 'LOW', {
        config: this.config
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('system:error', { error: errorMessage, timestamp: Date.now() });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.proposalTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.executionQueue.values()) {
      clearTimeout(timer);
    }
    
    // Clear caches and state
    this.cache.clear();
    this.proposals.clear();
    this.votes.clear();
    this.delegations.clear();
    this.rateLimits.clear();
    
    this.isInitialized = false;
    this.emit('system:shutdown', { timestamp: Date.now() });
  }

  // Proposal Management
  async createProposal(proposal: Proposal): Promise<ProposalCreationResult> {
    // Validate proposal
    await this.validateProposal(proposal);
    
    // Check rate limits
    if (!this.checkRateLimit(proposal.proposer, 'CREATE_PROPOSAL')) {
      throw new Error('Rate limit exceeded for proposal creation');
    }

    // Create proposal info
    const proposalInfo: ProposalInfo = {
      ...proposal,
      status: 'PENDING',
      createdAt: Date.now(),
      totalVotes: 0,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      quorumReached: false,
      executed: false,
      cancelled: false
    };

    this.proposals.set(proposal.id, proposalInfo);
    this.votes.set(proposal.id, []);

    // Schedule proposal activation
    if (proposal.startTime > Date.now()) {
      const timer = setTimeout(() => {
        this.activateProposal(proposal.id);
      }, proposal.startTime - Date.now());
      this.proposalTimers.set(proposal.id, timer);
    } else {
      // Activate immediately if start time is now or in the past
      await this.activateProposal(proposal.id);
    }

    const result: ProposalCreationResult = {
      proposalId: proposal.id,
      status: 'PENDING',
      blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
      transactionHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      gasUsed: Math.floor(Math.random() * 200000) + 100000
    };

    this.logAudit('PROPOSAL_CREATED', proposal.proposer, 'MEDIUM', {
      proposalId: proposal.id,
      category: proposal.category,
      stakingRequirement: proposal.stakingRequirement
    });

    this.emit('proposal:created', { proposal: proposalInfo, result });
    return result;
  }

  async getQueuedProposals(): Promise<ProposalInfo[]> {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'ACTIVE')
      .sort((a, b) => a.startTime - b.startTime);
  }

  async getActiveProposals(): Promise<ProposalInfo[]> {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'ACTIVE' && Date.now() >= p.startTime && Date.now() <= p.endTime);
  }

  async getAllProposals(): Promise<ProposalInfo[]> {
    return Array.from(this.proposals.values());
  }

  async getProposalsByUser(user: string): Promise<ProposalInfo[]> {
    return Array.from(this.proposals.values())
      .filter(p => p.proposer === user);
  }

  // Voting System
  async castVote(vote: Vote): Promise<VotingResult> {
    const proposal = this.proposals.get(vote.proposalId);
    if (!proposal) {
      return { success: false, error: 'Proposal not found', voteWeight: 0, currentTally: this.getEmptyTally() };
    }

    // Validate voting conditions
    const validation = await this.validateVote(vote, proposal);
    if (!validation.success) {
      return { success: false, error: validation.error, voteWeight: 0, currentTally: this.getEmptyTally() };
    }

    // Check for existing vote
    const existingVotes = this.votes.get(vote.proposalId) || [];
    const hasVoted = existingVotes.some(v => v.voter === vote.voter && !v.isDelegated);
    if (hasVoted) {
      return { success: false, error: 'Voter has already voted', voteWeight: 0, currentTally: this.getEmptyTally() };
    }

    // Process quadratic voting if enabled
    if (this.config.enableQuadraticVoting && vote.quadraticWeight) {
      vote.quadraticWeight = Math.sqrt(vote.weight);
    }

    // Add vote
    existingVotes.push(vote);
    this.votes.set(vote.proposalId, existingVotes);

    // Update proposal tallies
    this.updateProposalTally(vote.proposalId);

    const currentTally = this.calculateTally(vote.proposalId);
    
    const result: VotingResult = {
      success: true,
      voteWeight: vote.weight,
      quadraticWeight: vote.quadraticWeight,
      transactionHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      currentTally,
      isDelegated: vote.isDelegated
    };

    this.logAudit('VOTE_CAST', vote.voter, 'LOW', {
      proposalId: vote.proposalId,
      support: vote.support,
      weight: vote.weight,
      isDelegated: vote.isDelegated
    });

    this.emit('vote:cast', { vote, result, currentTally });
    return result;
  }

  async delegateVote(delegation: DelegatedVote): Promise<DelegationResult> {
    // Validate delegation
    if (!this.config.enableDelegation) {
      return { success: false, error: 'Delegation is not enabled' };
    }

    const delegatorDelegations = this.delegations.get(delegation.delegator) || [];
    delegatorDelegations.push(delegation);
    this.delegations.set(delegation.delegator, delegatorDelegations);

    const result: DelegationResult = {
      success: true,
      transactionHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    };

    this.logAudit('DELEGATION_CREATED', delegation.delegator, 'LOW', {
      delegate: delegation.delegate,
      weight: delegation.weight,
      proposalId: delegation.proposalId
    });

    this.emit('delegation:created', { delegation, result });
    return result;
  }

  // Proposal Execution
  async executeProposal(proposalId: string): Promise<ExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Check if proposal can be executed
    if (proposal.status !== 'PASSED') {
      return {
        success: false,
        executedActions: [],
        failedActions: proposal.actions,
        transactionHashes: [],
        gasUsed: 0,
        error: 'Proposal is not in PASSED status'
      };
    }

    if (Date.now() < proposal.executionTime) {
      return {
        success: false,
        executedActions: [],
        failedActions: proposal.actions,
        transactionHashes: [],
        gasUsed: 0,
        error: 'Execution delay period not yet passed'
      };
    }

    // Execute actions
    const executedActions = [];
    const failedActions = [];
    const transactionHashes = [];
    let totalGasUsed = 0;

    for (const action of proposal.actions) {
      try {
        // Simulate action execution
        const txHash = await this.executeAction(action);
        executedActions.push(action);
        transactionHashes.push(txHash);
        totalGasUsed += action.gasLimit || 50000;
      } catch (error) {
        failedActions.push(action);
      }
    }

    const success = executedActions.length > 0 && failedActions.length === 0;
    
    if (success) {
      proposal.status = 'EXECUTED';
      proposal.executed = true;
    }

    const result: ExecutionResult = {
      success,
      executedActions,
      failedActions,
      transactionHashes,
      gasUsed: totalGasUsed,
      error: failedActions.length > 0 ? 'Some actions failed to execute' : undefined
    };

    this.logAudit('PROPOSAL_EXECUTED', 'SYSTEM', success ? 'LOW' : 'HIGH', {
      proposalId,
      executedActions: executedActions.length,
      failedActions: failedActions.length,
      success
    });

    this.emit('proposal:executed', { proposalId, result });
    return result;
  }

  // Analytics and Metrics
  async getGovernanceAnalytics(): Promise<GovernanceAnalytics> {
    const allProposals = Array.from(this.proposals.values());
    const allVotes = Array.from(this.votes.values()).flat();
    
    const proposalsByCategory = allProposals.reduce((acc, proposal) => {
      acc[proposal.category] = (acc[proposal.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueVoters = new Set(allVotes.map(vote => vote.voter)).size;
    const totalWeight = allVotes.reduce((sum, vote) => sum + vote.weight, 0);

    return {
      totalProposals: allProposals.length,
      activeProposals: allProposals.filter(p => p.status === 'ACTIVE').length,
      passedProposals: allProposals.filter(p => p.status === 'PASSED').length,
      failedProposals: allProposals.filter(p => p.status === 'FAILED').length,
      executedProposals: allProposals.filter(p => p.executed).length,
      totalVotes: allVotes.length,
      uniqueVoters,
      participationRate: uniqueVoters / Math.max(this.getTotalEligibleVoters(), 1),
      averageVotingWeight: totalWeight / Math.max(allVotes.length, 1),
      proposalsByCategory,
      votingPatterns: {
        averageTimeToVote: this.calculateAverageTimeToVote(allVotes),
        delegationRate: this.calculateDelegationRate(),
        quadraticVotingUsage: this.calculateQuadraticUsage(allVotes)
      },
      treasuryMetrics: {
        balance: await this.getTreasuryBalance(),
        totalAllocated: 0,
        pendingAllocations: 0
      }
    };
  }

  async getParticipationMetrics(): Promise<ParticipationMetrics> {
    const allVotes = Array.from(this.votes.values()).flat();
    const voterStats = this.calculateVoterStats(allVotes);
    const delegationStats = this.calculateDelegationStats();

    return {
      uniqueVoters: voterStats.uniqueVoters,
      averageParticipation: voterStats.averageParticipation,
      topVoters: voterStats.topVoters,
      engagementTrends: this.calculateEngagementTrends(),
      delegationMetrics: delegationStats
    };
  }

  // DAO Operations
  async getTreasuryBalance(): Promise<number> {
    // Simulate treasury balance
    return Math.floor(Math.random() * 10000000) + 1000000; // 1M - 11M tokens
  }

  async getTotalTokenSupply(): Promise<number> {
    // Simulate total token supply
    return 100000000; // 100M tokens
  }

  private getTotalTokenSupplySync(): number {
    // Synchronous version for internal calculations
    return 100000000; // 100M tokens
  }

  async getTokenBalance(address: string): Promise<number> {
    // Simulate user token balance based on address for consistency
    const addressHash = parseInt(address.slice(-4), 16);
    return Math.floor(addressHash * 100) + 50000; // 50K-100K+ tokens based on address
  }

  async getVotingPower(address: string): Promise<number> {
    const balance = await this.getTokenBalance(address);
    const delegatedPower = this.calculateDelegatedPower(address);
    return balance + delegatedPower;
  }

  async getUserRoles(address: string): Promise<GovernanceRole[]> {
    // Simulate user roles based on their activities
    const roles: GovernanceRole[] = ['VOTER'];
    
    const userProposals = Array.from(this.proposals.values()).filter(p => p.proposer === address);
    if (userProposals.length > 0) {
      roles.push('PROPOSER');
    }

    const userDelegations = this.delegations.get(address) || [];
    if (userDelegations.length > 0) {
      roles.push('DELEGATE');
    }

    // Admin role for demonstration
    if (address === '0xabcdef1234567890123456789012345678901234') {
      roles.push('ADMIN');
    }

    return roles;
  }

  async hasRole(address: string, role: GovernanceRole): Promise<boolean> {
    const userRoles = await this.getUserRoles(address);
    return userRoles.includes(role);
  }

  // Security and Validation
  async validateProposalSignature(proposal: any): Promise<boolean> {
    // Simplified signature validation for demo
    return proposal.signature !== undefined && proposal.signature.length > 10;
  }

  // Private Helper Methods
  private async validateProposal(proposal: Proposal): Promise<void> {
    // Validate timing
    if (proposal.startTime <= Date.now() - 60000) { // Allow 1 minute grace period
      throw new Error('Proposal validation failed: Start time must be in the future');
    }

    if (proposal.endTime <= proposal.startTime) {
      throw new Error('Proposal validation failed: End time must be after start time');
    }

    if (proposal.executionTime <= proposal.endTime) {
      throw new Error('Proposal validation failed: Execution time must be after voting end time');
    }

    // Validate staking requirement
    if (proposal.stakingRequirement < this.config.minProposalStake) {
      throw new Error('Proposal validation failed: Insufficient staking requirement');
    }

    // Validate description length
    if (proposal.description.length < 50) {
      throw new Error('Proposal validation failed: Description too short');
    }

    // Validate actions
    if (proposal.actions.length === 0) {
      throw new Error('Proposal validation failed: At least one action is required');
    }
  }

  private async validateVote(vote: Vote, proposal: ProposalInfo): Promise<{ success: boolean; error?: string }> {
    // Check if proposal is active and in voting period
    if (proposal.status !== 'ACTIVE') {
      return { success: false, error: 'Proposal is not active' };
    }

    if (Date.now() < proposal.startTime || Date.now() > proposal.endTime) {
      return { success: false, error: 'Voting period has ended or not started' };
    }

    // Check voting power
    const votingPower = await this.getVotingPower(vote.voter);
    if (vote.weight > votingPower) {
      return { success: false, error: 'Vote weight exceeds voting power' };
    }

    return { success: true };
  }

  private async activateProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      proposal.status = 'ACTIVE';
      
      // Schedule voting end
      const endTimer = setTimeout(() => {
        this.endVoting(proposalId);
      }, proposal.endTime - Date.now());
      this.proposalTimers.set(`${proposalId}_end`, endTimer);

      this.emit('proposal:activated', { proposalId, proposal });
    }
  }

  private async endVoting(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (proposal && proposal.status === 'ACTIVE') {
      const tally = this.calculateTally(proposalId);
      
      // Determine if proposal passed
      const passed = this.determineProposalOutcome(proposal, tally);
      proposal.status = passed ? 'PASSED' : 'FAILED';
      proposal.quorumReached = tally.quorumReached;

      if (passed) {
        // Schedule execution
        const executionDelay = Math.max(0, proposal.executionTime - Date.now());
        const executionTimer = setTimeout(() => {
          this.executeProposal(proposalId);
        }, executionDelay);
        this.executionQueue.set(proposalId, executionTimer);
      }

      this.emit('proposal:voting_ended', { proposalId, proposal, tally, passed });
    }
  }

  private updateProposalTally(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    const tally = this.calculateTally(proposalId);
    
    if (proposal) {
      proposal.totalVotes = tally.totalVotes;
      proposal.forVotes = tally.forVotes;
      proposal.againstVotes = tally.againstVotes;
      proposal.abstainVotes = tally.abstainVotes;
      proposal.quorumReached = tally.quorumReached;
    }
  }

  private calculateTally(proposalId: string): VotingTally {
    const votes = this.votes.get(proposalId) || [];
    const proposal = this.proposals.get(proposalId);
    
    let forVotes = 0;
    let againstVotes = 0;
    let abstainVotes = 0;

    votes.forEach(vote => {
      const weight = this.config.enableQuadraticVoting && vote.quadraticWeight 
        ? vote.quadraticWeight 
        : vote.weight;
        
      if (vote.support) {
        forVotes += weight;
      } else {
        againstVotes += weight;
      }
    });

    const totalVotes = forVotes + againstVotes + abstainVotes;
    const totalSupply = this.getTotalTokenSupplySync();
    const participationRate = totalVotes / totalSupply;
    
    const quorumMet = proposal 
      ? this.checkQuorumRequirement(proposal, totalVotes, totalSupply)
      : false;

    return {
      forVotes,
      againstVotes,
      abstainVotes,
      totalVotes,
      participationRate,
      quorumReached: quorumMet
    };
  }

  private checkQuorumRequirement(proposal: ProposalInfo, totalVotes: number, totalSupply: number): boolean {
    const { type, value } = proposal.quorumRequirement;
    
    switch (type) {
      case 'PERCENTAGE':
        return (totalVotes / totalSupply) >= value;
      case 'ABSOLUTE':
        return totalVotes >= value;
      case 'WEIGHTED':
        // Simplified weighted quorum
        return (totalVotes / totalSupply) >= (value * this.config.quorumPercentage);
      default:
        return false;
    }
  }

  private determineProposalOutcome(proposal: ProposalInfo, tally: VotingTally): boolean {
    if (!tally.quorumReached) {
      return false;
    }

    switch (proposal.votingType) {
      case 'SIMPLE_MAJORITY':
        return tally.forVotes > tally.againstVotes;
      case 'ABSOLUTE_MAJORITY':
        return tally.forVotes > (tally.totalVotes / 2);
      case 'SUPERMAJORITY':
        return tally.forVotes >= (tally.totalVotes * 0.67);
      case 'UNANIMOUS':
        return tally.againstVotes === 0 && tally.forVotes > 0;
      default:
        return tally.forVotes > tally.againstVotes;
    }
  }

  private async executeAction(action: any): Promise<string> {
    // Simulate action execution
    if (action.target === '0x0000000000000000000000000000000000000000') {
      throw new Error('Invalid target address');
    }
    
    if (action.value > 1000000) {
      throw new Error('Value too high');
    }

    return '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private checkRateLimit(address: string, action: string): boolean {
    const key = `${address}_${action}`;
    const now = Date.now();
    const windowSize = this.config.rateLimitPeriod || 3600000; // 1 hour default
    const limit = this.config.maxProposalsPerUser || 2; // Reduced from 5 to 2 for testing

    const rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit || now - rateLimit.windowStart > windowSize) {
      // New window
      this.rateLimits.set(key, {
        address,
        action,
        count: 1,
        windowStart: now,
        windowSize,
        limit
      });
      return true;
    }

    if (rateLimit.count >= limit) {
      return false;
    }

    rateLimit.count++;
    return true;
  }

  private logAudit(action: string, actor: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', details: Record<string, any>): void {
    const auditLog: AuditLog = {
      id: uuidv4(),
      action,
      actor,
      timestamp: Date.now(),
      blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
      details,
      riskLevel
    };

    this.auditLogs.push(auditLog);
    
    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  private getEmptyTally(): VotingTally {
    return {
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotes: 0,
      participationRate: 0,
      quorumReached: false
    };
  }

  private getTotalEligibleVoters(): number {
    return 10000; // Simulate total eligible voters
  }

  private calculateAverageTimeToVote(votes: Vote[]): number {
    // Simulate average time to vote
    return Math.floor(Math.random() * 3600) + 1800; // 30 minutes to 2 hours
  }

  private calculateDelegationRate(): number {
    const totalDelegations = Array.from(this.delegations.values()).flat().length;
    return totalDelegations / Math.max(this.getTotalEligibleVoters(), 1);
  }

  private calculateQuadraticUsage(votes: Vote[]): number {
    const quadraticVotes = votes.filter(v => v.quadraticWeight !== undefined).length;
    return quadraticVotes / Math.max(votes.length, 1);
  }

  private calculateVoterStats(votes: Vote[]): any {
    const voterMap = new Map<string, { votes: number; totalWeight: number }>();
    
    votes.forEach(vote => {
      const stats = voterMap.get(vote.voter) || { votes: 0, totalWeight: 0 };
      stats.votes++;
      stats.totalWeight += vote.weight;
      voterMap.set(vote.voter, stats);
    });

    const topVoters = Array.from(voterMap.entries())
      .map(([address, stats]) => ({
        address,
        totalVotes: stats.votes,
        averageWeight: stats.totalWeight / stats.votes,
        participationRate: stats.votes / Math.max(this.proposals.size, 1)
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 10);

    return {
      uniqueVoters: voterMap.size,
      averageParticipation: voterMap.size / Math.max(this.getTotalEligibleVoters(), 1),
      topVoters
    };
  }

  private calculateDelegationStats(): any {
    const allDelegations = Array.from(this.delegations.values()).flat();
    const activeDelegations = allDelegations.filter(d => !d.expirationTime || d.expirationTime > Date.now());
    
    const delegateMap = new Map<string, { weight: number; count: number }>();
    activeDelegations.forEach(delegation => {
      const stats = delegateMap.get(delegation.delegate) || { weight: 0, count: 0 };
      stats.weight += delegation.weight;
      stats.count++;
      delegateMap.set(delegation.delegate, stats);
    });

    const topDelegates = Array.from(delegateMap.entries())
      .map(([address, stats]) => ({
        address,
        delegatedWeight: stats.weight,
        delegatorCount: stats.count
      }))
      .sort((a, b) => b.delegatedWeight - a.delegatedWeight)
      .slice(0, 5);

    return {
      totalDelegations: allDelegations.length,
      activeDelegations: activeDelegations.length,
      topDelegates
    };
  }

  private calculateEngagementTrends(): any[] {
    // Simulate engagement trends over time
    const periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    return periods.map(period => ({
      period,
      participation: Math.random() * 0.4 + 0.1, // 10-50%
      proposals: Math.floor(Math.random() * 20) + 5,
      votes: Math.floor(Math.random() * 200) + 50
    }));
  }

  private calculateDelegatedPower(address: string): number {
    const delegatedToUser = Array.from(this.delegations.values())
      .flat()
      .filter(d => d.delegate === address && (!d.expirationTime || d.expirationTime > Date.now()));
    
    return delegatedToUser.reduce((sum, delegation) => sum + delegation.weight, 0);
  }
}
