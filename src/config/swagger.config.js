import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const __dirname = process.cwd();

// 1. 컨트롤러 파일 경로 (기존)
const controllerPath = path.join(__dirname, "src", "controllers", "*.js").replace(/\\/g, "/");

// 2.  방금 만든 yaml 파일 경로
const yamlPath = path.resolve(process.cwd(), "src/swagger/*.yaml").replace(/\\/g, "/");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Planvas API Docs",
            version: "1.0.0",
            description: "Planvas 프로젝트의 API 명세서입니다.",
        },
        servers: [
            {
                url: "/",
                description: "Local Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [controllerPath, yamlPath],
};

export const specs = swaggerJsdoc(options);