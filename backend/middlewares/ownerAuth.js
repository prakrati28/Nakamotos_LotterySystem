export function ownerAuth(req, res, next) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")? authHeader.slice(7).trim():null;
    
    if (!token || token !== process.env.OWNER_PRIVATE_KEY) {
        res.status(401).json({ error: "Unauthorized: invalid or missing private key" });
        return;
    }
 
  next();
};