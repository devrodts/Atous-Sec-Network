import { AccessControlService } from '../AccessControlService';

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService();
  });

  it('should allow a user that has been added', () => {
    service.addUser('user1');
    expect(service.isAllowed('user1', [])).toBe(true);
  });

  it('should not allow a user that has not been added', () => {
    expect(service.isAllowed('user1', [])).toBe(false);
  });

  it('should allow a user with an allowed role', () => {
    service.addRole('admin');
    expect(service.isAllowed('user2', ['admin'])).toBe(true);
  });

  it('should not allow a user with a non-allowed role', () => {
    service.addRole('editor');
    expect(service.isAllowed('user3', ['viewer'])).toBe(false);
  });

  it('should allow a user if either user ID or role is allowed', () => {
    service.addUser('user4');
    service.addRole('guest');
    expect(service.isAllowed('user4', ['viewer'])).toBe(true);
    expect(service.isAllowed('user5', ['guest'])).toBe(true);
  });

  it('should remove a user correctly', () => {
    service.addUser('user6');
    expect(service.isAllowed('user6', [])).toBe(true);
    service.removeUser('user6');
    expect(service.isAllowed('user6', [])).toBe(false);
  });

  it('should remove a role correctly', () => {
    service.addRole('moderator');
    expect(service.isAllowed('user7', ['moderator'])).toBe(true);
    service.removeRole('moderator');
    expect(service.isAllowed('user7', ['moderator'])).toBe(false);
  });

  it('should clear all allowed users and roles', () => {
    service.addUser('user8');
    service.addRole('tester');
    service.clearAll();
    expect(service.isAllowed('user8', [])).toBe(false);
    expect(service.isAllowed('user9', ['tester'])).toBe(false);
    expect(service.getAllowedUsers()).toEqual([]);
    expect(service.getAllowedRoles()).toEqual([]);
  });

  it('should return all allowed users', () => {
    service.addUser('userA');
    service.addUser('userB');
    expect(service.getAllowedUsers()).toEqual(['userA', 'userB']);
  });

  it('should return all allowed roles', () => {
    service.addRole('roleX');
    service.addRole('roleY');
    expect(service.getAllowedRoles()).toEqual(['roleX', 'roleY']);
  });
});
