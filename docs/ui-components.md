# UI 컴포넌트와 임시 색상 토큰

초기 구현 당시 Figma MCP 호출 한도로 디자인을 읽지 못했습니다. 새 링크의 텍스트 노드는 조회했지만 전체 UI는 아직 Figma 검수 완료본이 아닙니다.

- 색상 출처: ../frontend-example/app/globals.css
- Button, CloverCard와 마커의 라벨·여백·선택 테두리: 자체 보완 디자인
- CloverSymbol: 직접 작성한 임시 벡터. Figma 원본 에셋이 아닙니다.
- 마커 이미지: 사용자가 제공한 mark-green.png와 mark-yellow.png를 변형 없이 사용합니다. 전체 레이아웃의 색상, 크기, 여백은 추후 디자인과 대조해야 합니다.

## Tailwind v4

src/shared/styles/tokens.css에서 원시 색상과 의미별 토큰을 관리하며 globals.css에서 가져옵니다.
bg-brand, bg-brand-strong, bg-brand-soft, bg-canvas, bg-surface, text-ink,
text-muted, border-line, outline-focus를 사용할 수 있습니다.
작은 흰색 텍스트가 들어가는 기본 버튼은 대비를 위해 brand-strong을 사용합니다.
기존 전역 배경과 다크 모드 설정은 유지합니다.

## 사용

- Button: @/shared/ui/button — variant(primary/secondary/outline/ghost),
  size(sm/md/lg), loading, fullWidth 및 네이티브 버튼 속성. 기본 type은 button입니다.
  loading 동안 중복 클릭이 차단되며 aria-busy가 설정됩니다. children으로 로딩 중 문구를 전달할 수 있습니다.
- CloverCard, CloverMarker: @/entities/clover
- CloverCard: clover(id/name/imageUrl), collected, selected, description, onClick.
  이미지가 없거나 실패하면 임시 클로버 그림을 표시합니다. 미수집은 이름과 이미지를 숨깁니다.
- CloverMarker: state(inactive/active), label, selected, disabled, onClick. 50m 밖은 inactive(초록색, 클릭 불가), 50m 이내는 active(노란색)입니다. 거리 계산과 지도 좌표 배치는 호출부에서 처리합니다.
- 체험 화면도 CloverMarker를 사용하며 state="active"와 label="클로버를 눌러보세요"를 전달합니다. label을 생략하면 안내 문구 없이 마커만 표시합니다.
- public/images/clovers/clover-marker-inactive.png: 초록색 원본. clover-marker-active.png: 노란색 원본. 원본 174×174 비율을 유지해 64×64로 표시합니다.
- selected를 제공하면 aria-pressed로 토글 상태를 전달합니다.
- 이벤트 핸들러를 전달하는 호출부는 Client Component여야 합니다.

## 미리보기

npm run storybook 실행 후 UI/Button, Entities/CloverCard, Entities/CloverMarker,
Foundations/Colors에서 확인합니다. 마커의 Trial 스토리는 클릭/키보드로
선택 상태를 변경할 수 있습니다. 지도 API 및 체험 결과 모달 연결은 이 컴포넌트 작업 범위에 포함하지 않았습니다.
