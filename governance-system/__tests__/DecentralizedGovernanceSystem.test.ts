import { DecentralizedGovernanceSystem, ProposalStatus, VoteType } from '../DecentralizedGovernanceSystem';

describe('DecentralizedGovernanceSystem', () => {
  let system: DecentralizedGovernanceSystem;

  beforeEach(() => {
    system = new DecentralizedGovernanceSystem();
  });

  it('should allow submitting a new proposal', () => {
    const proposalId = system.submitProposal('Upgrade smart contract', 'Details about the upgrade', 'user1');
    expect(proposalId).toBeDefined();
    const proposal = system.getProposal(proposalId);
    expect(proposal).toBeDefined();
    expect(proposal?.title).toBe('Upgrade smart contract');
    expect(proposal?.proposerId).toBe('user1');
    expect(proposal?.status).toBe(ProposalStatus.PENDING);
    expect(proposal?.votesFor).toBe(0);
    expect(proposal?.votesAgainst).toBe(0);
  });

  it('should allow users to vote on a proposal', () => {
    const proposalId = system.submitProposal('New feature implementation', 'Add X functionality', 'user2');

    system.vote(proposalId, 'voter1', VoteType.FOR);
    system.vote(proposalId, 'voter2', VoteType.AGAINST);
    system.vote(proposalId, 'voter3', VoteType.FOR);

    const proposal = system.getProposal(proposalId);
    expect(proposal?.votesFor).toBe(2);
    expect(proposal?.votesAgainst).toBe(1);
  });

  it('should not allow voting on a non-existent proposal', () => {
    expect(() => system.vote('nonExistentProposal', 'voterX', VoteType.FOR))
      .toThrow('Proposal not found');
  });

  it('should not allow a user to vote multiple times on the same proposal', () => {
    const proposalId = system.submitProposal('Change fee structure', '', 'user3');
    system.vote(proposalId, 'voter4', VoteType.FOR);
    expect(() => system.vote(proposalId, 'voter4', VoteType.AGAINST))
      .toThrow('User has already voted on this proposal');
  });

  it('should finalize a proposal based on voting results', () => {
    const proposalId = system.submitProposal('Approve budget', '', 'user4');
    system.vote(proposalId, 'voter5', VoteType.FOR);
    system.vote(proposalId, 'voter6', VoteType.FOR);
    system.vote(proposalId, 'voter7', VoteType.AGAINST);

    system.finalizeProposal(proposalId);

    const proposal = system.getProposal(proposalId);
    expect(proposal?.status).toBe(ProposalStatus.PASSED);
  });

  it('should mark a proposal as FAILED if votes against are higher', () => {
    const proposalId = system.submitProposal('Reject proposal', '', 'user5');
    system.vote(proposalId, 'voter8', VoteType.AGAINST);
    system.vote(proposalId, 'voter9', VoteType.AGAINST);
    system.vote(proposalId, 'voter10', VoteType.FOR);

    system.finalizeProposal(proposalId);

    const proposal = system.getProposal(proposalId);
    expect(proposal?.status).toBe(ProposalStatus.FAILED);
  });

  it('should get all proposals by status', () => {
    system.submitProposal('Proposal A', '', 'uA');
    const proposalBId = system.submitProposal('Proposal B', '', 'uB');
    system.vote(proposalBId, 'vB1', VoteType.FOR);
    system.finalizeProposal(proposalBId);

    const pending = system.getProposalsByStatus(ProposalStatus.PENDING);
    expect(pending.length).toBe(1);
    expect(pending[0].title).toBe('Proposal A');

    const passed = system.getProposalsByStatus(ProposalStatus.PASSED);
    expect(passed.length).toBe(1);
    expect(passed[0].title).toBe('Proposal B');
  });
});
