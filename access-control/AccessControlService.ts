export class AccessControlService {
    private allowedUsers: Set<string>;
    private allowedRoles: Set<string>;

    constructor() {
        this.allowedUsers = new Set();
        this.allowedRoles = new Set();
    }

    /**
     * Adds a user to the list of allowed users.
     * @param userId The ID of the user to allow.
     */
    public addUser(userId: string): void {
        this.allowedUsers.add(userId);
    }

    /**
     * Removes a user from the list of allowed users.
     * @param userId The ID of the user to remove.
     */
    public removeUser(userId: string): void {
        this.allowedUsers.delete(userId);
    }

    /**
     * Adds a role to the list of allowed roles.
     * @param role The role to allow.
     */
    public addRole(role: string): void {
        this.allowedRoles.add(role);
    }

    /**
     * Removes a role from the list of allowed roles.
     * @param role The role to remove.
     */
    public removeRole(role: string): void {
        this.allowedRoles.delete(role);
    }

    /**
     * Checks if a user is allowed based on their ID or roles.
     * @param userId The ID of the user.
     * @param roles An array of roles the user belongs to.
     * @returns True if the user is allowed, false otherwise.
     */
    public isAllowed(userId: string, roles: string[]): boolean {
        if (this.allowedUsers.has(userId)) {
            return true;
        }
        for (const role of roles) {
            if (this.allowedRoles.has(role)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clears all allowed users and roles.
     */
    public clearAll(): void {
        this.allowedUsers.clear();
        this.allowedRoles.clear();
    }

    /**
     * Gets the list of currently allowed users.
     * @returns An array of allowed user IDs.
     */
    public getAllowedUsers(): string[] {
        return Array.from(this.allowedUsers);
    }

    /**
     * Gets the list of currently allowed roles.
     * @returns An array of allowed roles.
     */
    public getAllowedRoles(): string[] {
        return Array.from(this.allowedRoles);
    }
}
