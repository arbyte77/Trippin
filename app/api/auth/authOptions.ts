import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/models/User";
import connectMongo from "@/lib/mongodb";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectMongo();
        const user = await User.findOne({ email: credentials?.email });
        if (!user) throw new Error("User not found");
        const isValid = await bcrypt.compare(credentials!.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");
        return user;
      },
    }),
  ],

  callbacks: {
    // On first Google sign-in, ensure a User document exists in Mongo
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectMongo();
        const exists = await User.findOne({ email: user.email });
        if (!exists) {
          await User.create({
            name: user.name!,
            email: user.email!,
            googleId: account.providerAccountId,
          });
        }
      }
      return true;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
};

export default authOptions;
