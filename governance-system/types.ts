// Decentralized Governance System Types and Interfaces

export type VotingType = 'SIMPLE_MAJORITY' | 'ABSOLUTE_MAJORITY' | 'SUPERMAJORITY' | 'UNANIMOUS' | 'QUADRATIC';
export type ProposalStatus = 'PENDING' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED';
export type ProposalCategory = 'TECHNICAL_UPGRADE' | 'PARAMETER_CHANGE' | 'TREASURY' | 'GOVERNANCE' | 'EMERGENCY' | 'GENERAL';
export type GovernanceRole = 'ADMIN' | 'PROPOSER' | 'VOTER' | 'DELEGATE' | 'AUDITOR' | 'EXECUTOR';
export type QuorumType = 'PERCENTAGE' | 'ABSOLUTE' | 'WEIGHTED';

// Core Configuration
export interface GovernanceConfig {
  tokenContractAddress: string;
  web3Provider: string;
  networkId: number;
  minProposalStake: number;
  votingPeriod: number; // seconds
  executionDelay: number; // seconds
  quorumPercentage: number;
  proposalThreshold: number;
  enableDelegation: boolean;
  enableQuadraticVoting: boolean;
  maxProposalsPerUser?: number;
  rateLimitPeriod?: number;
  treasuryAddress?: string;
}

// Proposal System
export interface QuorumRequirement {
  type: QuorumType;
  value: number;
}

export interface ProposalAction {
  target: string;
  data: string;
  value: number;
  description: string;
  gasLimit?: number;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  category: ProposalCategory;
  proposer: string;
  votingType: VotingType;
  startTime: number;
  endTime: number;
  executionTime: number;
  stakingRequirement: number;
  quorumRequirement: QuorumRequirement;
  actions: ProposalAction[];
  signature?: string;
  metadata?: Record<string, any>;
}

export interface ProposalCreationResult {
  proposalId: string;
  status: ProposalStatus;
  blockNumber: number;
  transactionHash: string;
  gasUsed?: number;
}

export interface ProposalInfo extends Proposal {
  status: ProposalStatus;
  createdAt: number;
  totalVotes: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumReached: boolean;
  executed: boolean;
  cancelled: boolean;
}

// Voting System
export interface Vote {
  proposalId: string;
  voter: string;
  support: boolean; // true = for, false = against
  weight: number;
  quadraticWeight?: number;
  reason?: string;
  timestamp: number;
  isDelegated?: boolean;
  delegator?: string;
  signature?: string;
}

export interface VotingTally {
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotes: number;
  participationRate: number;
  quorumReached: boolean;
}

export interface VotingResult {
  success: boolean;
  voteWeight: number;
  quadraticWeight?: number;
  transactionHash?: string;
  currentTally: VotingTally;
  isDelegated?: boolean;
  error?: string;
}

// Delegation System
export interface DelegatedVote {
  delegator: string;
  delegate: string;
  proposalId?: string; // If undefined, applies to all proposals
  weight: number;
  expirationTime?: number;
  revocable: boolean;
  timestamp: number;
}

export interface DelegationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Governance Token
export interface GovernanceToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  circulatingSupply: number;
}

export interface TokenBalance {
  address: string;
  balance: number;
  votingPower: number;
  delegatedPower: number;
  lockedBalance: number;
}

// Execution System
export interface ExecutionResult {
  success: boolean;
  executedActions: ProposalAction[];
  failedActions: ProposalAction[];
  transactionHashes: string[];
  gasUsed: number;
  error?: string;
}

// Analytics and Metrics
export interface GovernanceAnalytics {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  failedProposals: number;
  executedProposals: number;
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  averageVotingWeight: number;
  proposalsByCategory: Record<ProposalCategory, number>;
  votingPatterns: {
    averageTimeToVote: number;
    delegationRate: number;
    quadraticVotingUsage: number;
  };
  treasuryMetrics: {
    balance: number;
    totalAllocated: number;
    pendingAllocations: number;
  };
}

export interface ParticipationMetrics {
  uniqueVoters: number;
  averageParticipation: number;
  topVoters: Array<{
    address: string;
    totalVotes: number;
    averageWeight: number;
    participationRate: number;
  }>;
  engagementTrends: Array<{
    period: string;
    participation: number;
    proposals: number;
    votes: number;
  }>;
  delegationMetrics: {
    totalDelegations: number;
    activeDelegations: number;
    topDelegates: Array<{
      address: string;
      delegatedWeight: number;
      delegatorCount: number;
    }>;
  };
}

// DAO Operations
export interface TreasuryOperation {
  id: string;
  type: 'ALLOCATION' | 'WITHDRAWAL' | 'INVESTMENT' | 'BURN';
  amount: number;
  recipient?: string;
  purpose: string;
  proposalId: string;
  executedAt?: number;
  transactionHash?: string;
}

export interface DAOMetrics {
  treasuryBalance: number;
  totalMembers: number;
  activeMembers: number;
  governanceParticipation: number;
  tokenDistribution: {
    giniCoefficient: number;
    top10Concentration: number;
    medianHolding: number;
  };
}

// Security and Validation
export interface SecurityValidation {
  signatureValid: boolean;
  addressValid: boolean;
  stakingValid: boolean;
  timingValid: boolean;
  rateLimitValid: boolean;
  permissionValid: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target?: string;
  timestamp: number;
  blockNumber: number;
  transactionHash?: string;
  details: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Events and Notifications
export interface GovernanceEvent {
  type: 'PROPOSAL_CREATED' | 'VOTE_CAST' | 'PROPOSAL_EXECUTED' | 'DELEGATION_UPDATED' | 'QUORUM_REACHED';
  proposalId?: string;
  actor: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface GovernanceNotification {
  id: string;
  type: 'PROPOSAL_EXPIRING' | 'QUORUM_NEEDED' | 'EXECUTION_READY' | 'DELEGATION_EXPIRED';
  recipient: string;
  proposalId?: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  timestamp: number;
  read: boolean;
}

// Advanced Features
export interface MultiSigRequirement {
  threshold: number;
  signers: string[];
  timelock?: number;
}

export interface ConditionalExecution {
  conditions: Array<{
    type: 'TIME_DELAY' | 'APPROVAL_COUNT' | 'EXTERNAL_CONDITION';
    parameter: any;
  }>;
  met: boolean;
}

export interface CrossChainProposal extends Proposal {
  targetChains: string[];
  bridgeContracts: string[];
  crossChainActions: Record<string, ProposalAction[]>;
}

// Governance Frameworks
export interface GovernanceFramework {
  name: string;
  version: string;
  votingMechanisms: VotingType[];
  quorumTypes: QuorumType[];
  delegationSupported: boolean;
  treasuryManagement: boolean;
  multiSigSupport: boolean;
  upgradeability: boolean;
}

// Query and Filter Interfaces
export interface ProposalFilter {
  status?: ProposalStatus[];
  category?: ProposalCategory[];
  proposer?: string;
  startDate?: number;
  endDate?: number;
  hasQuorum?: boolean;
}

export interface VoteFilter {
  proposalId?: string;
  voter?: string;
  support?: boolean;
  timeRange?: [number, number];
  minWeight?: number;
}

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Rate Limiting
export interface RateLimit {
  address: string;
  action: string;
  count: number;
  windowStart: number;
  windowSize: number;
  limit: number;
}

// Smart Contract Integration
export interface ContractCall {
  contract: string;
  method: string;
  parameters: any[];
  gasEstimate: number;
}

export interface ContractDeployment {
  bytecode: string;
  constructor: any[];
  gasEstimate: number;
}
