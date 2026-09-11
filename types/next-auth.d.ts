import "next-auth";
declare module "next-auth" { interface Session { user: { discordId: string; username: string; isMember: boolean } & NonNullable<Session["user"]> } }
declare module "next-auth/jwt" { interface JWT { discordId?: string; username?: string; isMember?: boolean } }
