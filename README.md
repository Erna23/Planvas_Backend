# Planvas Backend
Planvas: 목표 달성 및 습관 형성 도우미 백엔드 🚀
Planvas는 사용자 맞춤형 목표 설정, 달성률 추적, 주간 캘린더 요약 및 추천 활동 제공을 통해 사용자가 스스로 목표를 달성하고 건강한 습관을 형성할 수 있도록 돕는 서비스의 백엔드 시스템입니다. 안정적이고 확장 가능한 아키텍처를 기반으로 설계되었습니다.

🏛️ 시스템 아키텍처 개요
Planvas 백엔드 시스템은 AWS EC2 인스턴스 위에서 구동되며, Node.js(Express) 기반의 API 서버가 MySQL 데이터베이스와 연동하여 동작합니다. 사용자 요청은 JWT(JSON Web Token) 기반의 인증 미들웨어를 거쳐 처리되며, Prisma ORM을 통해 데이터베이스와의 상호작용이 관리됩니다. Nginx와 PM2를 활용하여 서버의 안정성과 관리 효율성을 극대화했습니다.

🛠️ 기술 스택 (Tech Stack)
Backend Core
Runtime: Node.js (v20.x)

Framework: Express.js (유연하고 빠른 API 서버 구축)

Language: JavaScript (ESNext)

ORM (Object-Relational Mapping): Prisma (Type-safe 데이터베이스 쿼리 및 마이그레이션 관리)

Authentication: JWT (JSON Web Token) - Stateless 기반 인증 방식으로 확장성 확보

Database
RDBMS: MySQL 8.0+ (관계형 데이터 모델링 및 안정적인 데이터 저장)

Schema Design: User, Goal, Task 등 목표 관리 서비스에 최적화된 테이블 구조

Infrastructure & DevOps
Cloud Hosting: AWS EC2 (Ubuntu Server 22.04 LTS)

Security Group: 3000 (API), 3306 (MySQL), 80/443 (HTTP/HTTPS - Nginx) 포트 허용

Process Manager: PM2 (Node.js 애플리케이션 무중단 실행 및 로깅, 환경 변수 관리)

Web Server (Planned): Nginx (리버스 프록시, 로드 밸런싱, SSL/TLS 종료 및 HTTPS 적용)

DNS Management (Planned): AWS Route 53 (도메인 연결 및 트래픽 라우팅)

Development Tools & API Documentation
API Documentation: Swagger (OpenAPI 3.0) - API 명세 및 테스트 인터페이스 제공

Database Management: MySQL Workbench, Prisma Studio

Version Control: Git & GitHub

💡 주요 아키텍처 및 기술 결정
관심사 분리 (Separation of Concerns): Controller, Service, Repository 계층으로 역할을 분리하여 코드의 유지보수성과 테스트 용이성 증대.

PM2를 통한 안정성: EC2 인스턴스 내에서 Node.js 서버가 죽지 않고 항상 동작하도록 관리하며, 환경 변수(.env)를 효율적으로 로드.

JWT 기반 인증: 클라이언트와 서버 간 상태를 유지하지 않는 방식으로 서버의 확장성을 높이고, 모바일 환경에 유리한 인증 플로우 제공.

Prisma ORM 채택: 개발 생산성 향상과 런타임 오류 감소를 위한 타입스크립트 기반 ORM 사용.
