# Contributing to Panooly API

# 코드베이스 원칙

## 1.미들웨어

### 1-1. 미들웨어를 통한 의존성 주입 (DI)

이 프로젝트는 Hono의 미들웨어를 활용하여 의존성 주입을 구현합니다.
DI로 미들웨어를 등록할 경우, Global 하게 등록하는 것이 원칙이고 (DI하고자 하는 코드).inject.ts 파일 이름으로 작성합니다. 

#### 미들웨어 등록 (src/index.ts)
```typescript
app.use(chatGenaiMiddleware(process.env.CHAT_GEMINI_API_KEY!))
app.use(dbMiddleware(process.env.DATABASE_URL!))
app.use(jwtManagerMiddleware(process.env.JWT_SECRET!, process.env.JWT_EXPIRES_IN!))
```

#### 미들웨어 구현 예시
`hono.d.ts` 에 DI로 주입할 변수의 타입을 선언합니다.
```typescript
export const dbMiddleware = (databaseUrl: string): MiddlewareHandler => {
  if (!db) {
    const pool = new Pool({ connectionString: databaseUrl });
    db = drizzle({ client: pool });
  }

  return async (c, next) => {
    c.set('db', db); 
    await next();
  };
};
```

#### 핸들러에서 사용
```typescript
const db = c.get('db');
const jwtManager = c.get('jwtManager') as JWTManager;
```

### 1-2. Guard middleware

Guard middleware는 인증 및 접근 제어에 사용되는 미들웨어입니다. 해당 미들웨어는 반드시 injection 이후에 사용되어야 하며, 전역적으로 사용할 수 없습니다. 

#### Guard middleware 예시
```typescript
export const authGuardMiddleware = (): MiddlewareHandler => {
    return async (c, next) => {
        // 1. 의존성 확인
        const jwtManager = c.get('jwtManager');
        const db = c.get('db');

        // 2. Authorization 헤더 검증
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HTTPException(401, { message: 'AuthGuard: Invalid authorization header' });
        }

        // 3. JWT 토큰 검증
        const token = authHeader.substring(7); // "Bearer " 제거
        const decoded = resolve(jwtManager.verifyJWT(token));

        // 4. 사용자 존재 확인
        const user = await db.select().from(users).where(eq(users.id, decoded.userId));
        if (user.length === 0) {
            throw new HTTPException(401, { message: 'AuthGuard: User not found' });
        }

        // 5. 사용자 정보 컨텍스트에 주입
        c.set('user', user[0]);
        await next();
    };
};
```

#### Guard middleware 사용법 예시
```typescript
// 라우터에서 인증이 필요한 엔드포인트에 적용
router.post('/protected-endpoint', authGuardMiddleware(), handlerFunction);
```

#### 인증된 핸들러에서 사용자 정보 접근
```typescript
export const protectedHandler = async (c: Context) => {
  const user = c.get('user'); // Guard middleware에서 주입된 사용자 정보
  // 인증된 사용자 정보를 활용한 로직
};
```

## 2. Handler 파일의 일반적인 구조

모든 핸들러 파일은 다음 구조를 따릅니다:

```typescript
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
// 필요한 의존성들...

// 1. 요청 데이터 검증 스키마
const requestBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// 2. 에러 프리픽스 (일관성을 위해)
const errorPrefix = 'HandlerName: ';

// 3. 응답 타입 정의
type Response = {
  token: string;
  userId: number;
}

// 4. 핸들러 함수
export const handlerName = async (c: Context) => {
  // 4-1. 요청 데이터 파싱 및 검증
  const body = await c.req.json();
  const parseResult = requestBodySchema.safeParse(body);

  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }

  const validatedData = parseResult.data;

  // 4-2. 의존성 주입된 객체들 가져오기
  const db = c.get('db');
  const jwtManager = c.get('jwtManager') as JWTManager;

  // 4-3. 비즈니스 로직 실행
  // try를 사용하지 않고 바로바로 HTTP Exception만 반환합니다.


  // 4-4. 응답 생성
  const response: Response = {
    // 응답 데이터
  };

  return c.json({ response }, 200);
};
```

### 3. 아키텍처 계층

```
src/
├── index.ts              # 앱 진입점, 미들웨어 등록
├── router/               # 라우터 정의
├── handler/              # 비즈니스 로직 핸들러
├── middleware/           # 의존성 주입 미들웨어
├── client/               # 외부 서비스 클라이언트
└── utils/                # 공통 유틸리티
```

### 4. 에러 처리 원칙

#### 4-1. 계층별 에러 처리 방식

- **Handler 레벨**: `throw HTTPException`만 사용하여 HTTP 에러 응답 반환
- **Service/Utility 레벨**: `ts-results` 패키지의 `Err()` 사용하여 에러 반환
- **ts-results 에러 처리**: `resolve.ts` 유틸리티를 사용하여 Result를 값으로 변환하거나 예외 발생

#### 4-2. resolve.ts를 활용한 에러 처리

```typescript
// utils/resolve.ts
export const resolve = <T, E = Error>(result: Result<T, E>): T => {
    if (result.err) {
        throw result.val;  // 에러 시 예외 발생
    }
    return result.val;     // 성공 시 값 반환
}
```

#### 4-3. auth middleware에서의 실제 사용 예시

```typescript
// 1. mapErr로 Result의 에러를 HTTPException으로 변환
// 2. resolve로 Result를 값으로 변환하거나 HTTPException 발생
const decoded = resolve(jwtManager.verifyJWT(token)
    .mapErr((error) => new HTTPException(401, {
        message: 'AuthGuard: Invalid token' + error.message
    })));
```

#### 4-4. Handler에서의 에러 처리 패턴

```typescript
export const loginHandler = async (c: Context) => {
  // 1. 입력 검증 실패 - 직접 HTTPException
  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }

  // 2. ts-results를 사용하는 서비스 호출
  const jwtManager = c.get('jwtManager') as JWTManager;

  // mapErr로 에러를 HTTPException으로 변환 후 resolve 처리
  const token = resolve(jwtManager.generateJWT({ userId: user.id })
    .mapErr(() => new HTTPException(500, {
      message: errorPrefix + 'Failed to generate token'
    })));

  return c.json({ response: { token } }, 200);
};
```

#### 4-5. 공통 에러 처리 규칙

- 모든 핸들러는 일관된 에러 프리픽스 사용 (`{HandlerName}: `)
- Service/Utility 레벨에서는 `Result<T, Error>` 반환
- Handler에서 `mapErr`로 에러를 HTTPException으로 변환
- `resolve()` 함수로 Result를 최종 값으로 변환
- try-catch 사용하지 않고 Result 패턴 활용

### 5. 데이터 검증

- 모든 요청 데이터는 Zod 스키마로 검증
- safeParse를 사용하여 안전한 파싱
- 명확하고 사용자 친화적인 에러 메시지 제공

### 6. 보안

- 패스워드는 argon2로 해싱
- JWT 토큰 기반 인증
- 환경변수로 민감한 정보 관리
- 인증이 필요한 엔드포인트는 auth guard 미들웨어 사용

### 7. 테스트

- Bun 테스트 프레임워크 사용
- 각 핸들러마다 대응하는 테스트 파일 (.test.ts)
- 성공/실패 케이스 모두 테스트
- 의존성 모킹으로 격리된 단위 테스트

이 원칙들을 따라 일관성 있고 안전한 코드를 작성해주세요.