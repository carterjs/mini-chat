export enum RoomRole {
    GUEST = 0,
    MEMBER = 1,
    MODERATOR = 2
};

export function getRoleByName(roleName: string): RoomRole | null {
    return {guest: 0, member: 1, moderator: 2}[roleName.toLowerCase()] || null;
}

export function getNameByRole(role: RoomRole) {
    return ["guest", "member", "moderator"][role];
}