import { signAccessToken } from "../auth.config.js";

export function registerDevRoutes(app) {
    app.post("/api/dev/login", (req, res) => {
        const token = signAccessToken({ userId: 1 });

    return res.json({
        resultType: "SUCCESS",
        success: { token },
        error: null,
        });
    });
}
