import { fail } from "../utils/apiResponse.js";

export function authStub(req, res, next) {
    const auth = req.headers.authorization || "";
    
    if (!auth.startsWith("Bearer ")) {
        return res.status(401).json(fail("인증이 필요합니다.", null));
    }
    
    req.userId = 1;
    next();
}
