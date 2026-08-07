import { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";

declare global {
  namespace Express {
    interface Request {
      sellerId: string;
      role: "seller" | "admin";
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  // Verify the JWT against Supabase Auth using an anon-scoped client per-request,
  // rather than trusting anything the client claims about identity.
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const authClient = anonKey ? createClient(supabaseUrl, anonKey) : null;
  const { data, error } = authClient
    ? await authClient.auth.getUser(token)
    : await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id, role")
    .eq("auth_user_id", data.user.id)
    .single();

  if (sellerError || !seller) {
    return res.status(403).json({ error: "No seller record for this user" });
  }

  req.sellerId = seller.id;
  req.role = seller.role;
  next();
}
