# 클래스 자동 정리

VS Code의 ESLint 확장이 활성화되어 있으면 명시적으로 저장할 때 자동 수정합니다.
Prettier 저장 포맷도 유지합니다. CLI에서는 npm run format으로 같은 변환을 실행합니다.

- className의 정적 문자열이 50자를 초과하면 cn(...)으로 변환하고 import를 추가합니다.
- cn의 정적 문자열 인자는 클래스 사이에서 50자 이하의 묶음으로 분리합니다.
- 한 클래스 자체가 50자보다 길면 자르지 않습니다.
- 짧은 className, 조건식, 변수가 삽입된 템플릿 문자열은 유지합니다.
- 이 규칙은 문자열 길이를 기준으로 하며 들여쓰기에 따라 반복 변환되지 않습니다.
- 화면의 70자 줄 너비는 Prettier가 처리합니다. 50자는 따옴표와 들여쓰기를 위한 여유를 둔 값입니다.
- 기준은 eslint.config.mjs의 local/wrap-cn.maxLength에서 변경합니다.
- import된 공유 cn만 처리하며 같은 이름의 다른 함수는 수정하지 않습니다.
- className을 cn으로 바꾸면 기존 cn 규칙대로 충돌하는 Tailwind 클래스는 뒤쪽이 우선합니다.
- npm run test:formatting으로 변환과 반복 포맷의 안정성을 검증합니다.

예시:

```tsx
className={cn(
  'rounded-full border border-line bg-surface px-3',
  'py-1.5 text-xs font-bold shadow-sm',
)}
```
