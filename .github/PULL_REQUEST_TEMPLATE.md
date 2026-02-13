## 🔖 PR 제목
- [Feat] 홈 API 응답 구조 통합
- [Fix] JWT 인증 오류 수정
- [Refactor] Prisma 쿼리 분리
- [Docs] Swagger 명세 업데이트

---

## 📋 작업 내용 (What)
- 어떤 기능을 구현/수정했는지 구체적으로 작성
- 주요 변경 사항 정리

예시:
- apiResponse 유틸 함수 추가
- 홈 화면 API 응답 구조 SUCCESS/FAIL 통일
- Prisma Client 쿼리 로직 분리

---

## 🎯 작업 목적 (Why)
- 왜 이 작업이 필요한지 설명
- 기존 문제점 또는 개선 포인트

예시:
- 응답 포맷이 API마다 달라 프론트에서 처리 복잡
- 인증 미들웨어에서 userId fallback 필요

---

## 🛠 변경 사항 (How)
- 주요 코드 변경 방식 설명
- 설계 변경이 있다면 간단히 구조 설명

예시:
- ok(), fail() 공통 응답 유틸 적용
- getAuthUserId() 헬퍼 추가
- Controller → Service 로직 일부 이동

---

## 📂 변경 파일
- src/controllers/home.controller.js
- src/utils/apiResponse.js
- src/middlewares/auth.middleware.js

---

## 🧪 테스트 내용
- [ ] Postman 테스트 완료
- [ ] Swagger 테스트 완료
- [ ] DB Read/Write 확인
- [ ] 예외 케이스 확인

테스트 결과:
- 정상 응답 SUCCESS 반환 확인
- 토큰 없을 경우 401 처리 확인

---

## 📸 스크린샷 (선택)
- Swagger 실행 결과 캡처
- Postman 결과 캡처

---

## 🔥 관련 이슈
- close #12
- related to #8

---

## 🚨 체크리스트
- [ ] 코드 스타일 준수
- [ ] 불필요한 console.log 제거
- [ ] env 파일 변경 여부 확인
- [ ] main 브랜치 기준 최신 상태 반영
