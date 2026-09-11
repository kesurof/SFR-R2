import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const guildId = process.env.DISCORD_GUILD_ID;

async function fetchIsMember(accessToken: string): Promise<boolean> {
  if (!guildId) return false;
  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const guilds = (await response.json()) as Array<{ id: string }>;
  return guilds.some((guild) => guild.id === guildId);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Discord({ authorization: { params: { scope: "identify guilds" } } })],
  session: { strategy: "jwt" },
  callbacks: {
    // Une session est accordée dès qu'on obtient un compte Discord.
    // L'appartenance au serveur est calculée dans `jwt` et portée par la session ;
    // les pages réservées la vérifient (`requireMember` / `requireAdmin`).
    async signIn({ account }) {
      return account?.provider === "discord" && !!account.access_token;
    },
    async jwt({ token, user, account }) {
      // Discord's providerAccountId is the real Discord snowflake. The
      // generic Auth.js user.id may be an internal UUID and must not be used
      // for authorization decisions.
      if (account?.provider === "discord" && account.providerAccountId) {
        token.discordId = account.providerAccountId;
      }
      if (account?.provider === "discord" && account.access_token) {
        token.isMember = await fetchIsMember(account.access_token);
      }
      if (user) token.username = user.name ?? "Discord";
      return token;
    },
    session({ session, token }) {
      session.user.discordId = token.discordId as string;
      session.user.username = token.username as string;
      session.user.isMember = (token.isMember as boolean | undefined) ?? false;
      return session;
    },
  },
});
