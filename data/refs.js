// 포즈 레퍼런스 사진첩. 사진 하나가 { } 한 덩어리예요.
// - photo    : images/ref 폴더에 넣은 파일 이름 (예: "ref/cafe-01.jpg") 또는 https:// 로 시작하는 주소
// - category : "커플" / "솔로" / "실내" 중에서. 여러 개면 ["커플", "실내"] 처럼 대괄호로 묶어요
//              (다른 이름은 "전체"에만 보여요)
// - title    : 사진 아래 짧은 설명 (없어도 돼요)
// - note     : 크게 볼 때 나오는 촬영 팁 (없어도 돼요)
// - id       : 사진마다 다른 이름. 즐겨찾기 저장에 쓰니 한번 정하면 바꾸지 마세요
// 맨 앞 "window.REFS =" 과 맨 끝 ";" 은 그대로 두세요.
window.REFS = [
  // ---------- 커플 ----------
  { "id": "ref-01", "photo": "ref/photo_1794451647.jpg", "category": "커플", "title": "뒤에서 덮쳐 안기", "note": "앞으로 숙였다 뒤로 갔다 지지고 볶기" },
  { "id": "ref-02", "photo": "ref/photo_1794451648.jpg", "category": "커플", "title": "다리 위에서 팔 벌리기", "note": "난간 옆에서 한 팔씩 크게 벌려 낭만 만끽" },
  { "id": "ref-03", "photo": "ref/photo_1794451649.jpg", "category": "커플", "title": "다리 위 센치한 느낌", "note": "서로 반대 방향을 바라보며" },
  { "id": "ref-04", "photo": "ref/photo_1794451650.jpg", "category": "커플", "title": "이마에 쪽", "note": "남자가 몸을 숙여 이마에 콩" },
  { "id": "ref-05", "photo": "ref/photo_1794451651.jpg", "category": "커플", "title": "베일 속 우리", "note": "얇은 천이나 베일을 함께 뒤집어쓰기" },
  { "id": "ref-06", "photo": "ref/photo_1794451652.jpg", "category": "커플", "title": "노을 바다 손잡기", "note": "해를 등지고 실루엣으로" },
  { "id": "ref-07", "photo": "ref/photo_1794451653.jpg", "category": ["커플", "실내"], "title": "꽃 들고 무표정", "note": "둘 다 정면, 일부러 진지한 표정으로" },
  { "id": "ref-08", "photo": "ref/photo_1794451654.jpg", "category": ["커플", "실내"], "title": "복도에서 달려오기", "note": "선글라스 끼고 신나게, 흑백 추천" },
  { "id": "ref-09", "photo": "ref/photo_1794451655.jpg", "category": ["커플", "실내"], "title": "어깨에 들쳐 메기", "note": "장난스럽게 번쩍" },
  { "id": "ref-10", "photo": "ref/photo_1794451657.jpg", "category": "커플", "title": "맥주 같이 마시기", "note": "잔 들고 볼 붙여 카메라 보기, 밤거리 조명" },
  { "id": "ref-11", "photo": "ref/photo_1794451658.jpg", "category": "커플", "title": "볼 맞대기 셀카", "note": "얼굴은 최대한 가까이, 장난스러운 표정" },
  { "id": "ref-12", "photo": "ref/photo_1794451659.jpg", "category": ["커플", "실내"], "title": "코 맞대고 눈 감기", "note": "흰 벽 앞에 나란히 앉아서" },
  { "id": "ref-13", "photo": "ref/photo_1794451660.jpg", "category": ["커플", "실내"], "title": "거울 셀카 뒤에서 안기", "note": "한 명은 폰, 한 명은 뒤에서 기대기" },
  { "id": "ref-32", "photo": "ref/photo_1794451678.jpg", "category": ["커플", "실내"], "title": "네컷 표정 놀이", "note": "하트, 윙크, 놀란 표정 번갈아" },
  { "id": "ref-33", "photo": "ref/photo_1794451679.jpg", "category": ["커플", "실내"], "title": "포토부스 연속 포즈", "note": "칸마다 포즈 바꾸기" },
  { "id": "ref-34", "photo": "ref/photo_1794451680.jpg", "category": "커플", "title": "겉옷 같이 덮어쓰기", "note": "비 오는 날 자켓을 우산처럼" },
  { "id": "ref-28", "photo": "ref/photo_1794451673.jpg", "category": "커플", "title": "구도: 나뭇잎 걸치기", "note": "위 1/3은 근경 나뭇잎, 인물은 가운데 아래 (둘이 앉은 뒷모습)" },
  { "id": "ref-30", "photo": "ref/photo_1794451676.jpg", "category": "커플", "title": "구도: 꽃 너머로 찍기", "note": "아래 1/3은 근경 꽃, 인물과 랜드마크를 세로 한 줄로" },

  // ---------- 솔로 ----------
  { "id": "ref-14", "photo": "ref/photo_1794451661.jpg", "category": "솔로", "title": "무게 중심 이동", "note": "한쪽 다리에 무게 싣고 벽에 손 짚기" },
  { "id": "ref-15", "photo": "ref/photo_1794451662.jpg", "category": "솔로", "title": "가만히 있지 마세요", "note": "머리 묶기, 가방 뒤지기 등 움직이는 순간 찍기" },
  { "id": "ref-16", "photo": "ref/photo_1794451663.jpg", "category": "솔로", "title": "멀리 바라보기", "note": "정면 응시 말고 고개를 돌려 먼 곳 보기" },
  { "id": "ref-17", "photo": "ref/photo_1794451664.jpg", "category": "솔로", "title": "바다 스카프 & 선글라스", "note": "바람 부는 바닷가에서 소품 활용" },
  { "id": "ref-18", "photo": "ref/photo_1794451665.jpg", "category": "솔로", "title": "과일 들고 윙크", "note": "시장 과일 하나 얼굴 옆에, 위에서 내려 찍기" },
  { "id": "ref-19", "photo": "ref/photo_1794451666.jpg", "category": "솔로", "title": "노을 해변", "note": "노을 지는 방향을 등지고 아래에서 위로" },
  { "id": "ref-20", "photo": "ref/photo_1794451667.jpg", "category": ["솔로", "실내"], "title": "바닥에 앉기", "note": "편하게 앉아 카메라를 보고 웃기" },
  { "id": "ref-21", "photo": "ref/photo_1794451668.jpg", "category": "솔로", "title": "하늘 크게 담기", "note": "로우앵글로 올려다보며 찍으면 드라마틱" },
  { "id": "ref-22", "photo": "ref/photo_1794451669.jpg", "category": "솔로", "title": "시선은 옆으로", "note": "정면보다 옆을 자연스럽게 바라보기" },
  { "id": "ref-23", "photo": "ref/photo_1794451670 (2).jpg", "category": "솔로", "title": "길 끝에 작게", "note": "나무 길 한가운데, 인물은 작게 풍경은 크게" },
  { "id": "ref-24", "photo": "ref/photo_1794451670.jpg", "category": "솔로", "title": "시선은 아래로", "note": "앉아서 시선을 내리면 차분하고 단아한 무드" },
  { "id": "ref-25", "photo": "ref/photo_1794451671 (2).jpg", "category": "솔로", "title": "숲길 뒷모습", "note": "계단 아래로 걸어가는 뒷모습" },
  { "id": "ref-26", "photo": "ref/photo_1794451671.jpg", "category": "솔로", "title": "바닷가 길 한가운데", "note": "길 끝 바다를 배경으로 뒤돌아보기" },
  { "id": "ref-27", "photo": "ref/photo_1794451672.jpg", "category": "솔로", "title": "바위 위 원경", "note": "멀리서 넓게, 인물은 점처럼" },
  { "id": "ref-29", "photo": "ref/photo_1794451674.jpg", "category": "솔로", "title": "구도: 배경 2/3", "note": "위는 나뭇잎, 배경 2/3에 인물 배치" },
  { "id": "ref-31", "photo": "ref/photo_1794451677.jpg", "category": "솔로", "title": "계단 오르는 뒷모습", "note": "가운데 세로 라인에 맞춰서" },
  { "id": "ref-35", "photo": "ref/photo_1794451681 (2).jpg", "category": "솔로", "title": "계단 포즈 6가지", "note": "옆으로 앉기 · 한 무릎 올리기 · 턱 괴기 · 뒤로 기대기 · 어깨 너머 · 다리 뻗기" },
  { "id": "ref-36", "photo": "ref/photo_1794451681.jpg", "category": "솔로", "title": "투명 우산", "note": "비 오는 날 우산 너머로 얼굴" },
  { "id": "ref-37", "photo": "ref/photo_1794451682 (2).jpg", "category": "솔로", "title": "어색할 때 포즈 6가지", "note": "아래 보기 · 턱 괴기 · 머리 넘기기 · 먼 곳 보기 · 어깨 너머 · 무릎 안기" },
  { "id": "ref-39", "photo": "ref/photo_1794451683 (2).jpg", "category": "솔로", "title": "폰 들고 포즈 6가지", "note": "폰 보기 · 문자하기 · 폰으로 얼굴 가리기 · 걸으며 폰 보기" },
  { "id": "ref-41", "photo": "ref/photo_1794451684.jpg", "category": "솔로", "title": "택시와 함께", "note": "길에 지나가는 택시를 배경으로" },
  { "id": "ref-42", "photo": "ref/photo_1794451685 (2).jpg", "category": "솔로", "title": "모자 포즈 6가지", "note": "챙 만지기 · 모자 고쳐 쓰기 · 아래 보기 · 브이 · 옆 보기" },
  { "id": "ref-44", "photo": "ref/photo_1794451686.jpg", "category": "솔로", "title": "편의점 앞에서", "note": "간판이 다 나오게, 문 앞에서 머리 넘기기" },
  { "id": "ref-45", "photo": "ref/photo_1794451687.jpg", "category": "솔로", "title": "자판기 앞", "note": "자판기 옆에 기대 서기, 스티커 많은 곳이면 더 좋음" },
  { "id": "ref-46", "photo": "ref/photo_1794451688.jpg", "category": "솔로", "title": "길거리 택시 잡기", "note": "택시가 지나갈 때 가드레일에 앉아 손 들기" },
  { "id": "ref-48", "photo": "ref/photo_1794451690.jpg", "category": "솔로", "title": "카페 앞에 앉기", "note": "아기자기한 카페 입구 앞에 그냥 앉기만 해도" },

  // ---------- 솔로 · 실내 ----------
  { "id": "ref-38", "photo": "ref/photo_1794451682.jpg", "category": ["솔로", "실내"], "title": "생맥주 건배", "note": "맥주잔을 카메라 앞으로 쭉 내밀기" },
  { "id": "ref-40", "photo": "ref/photo_1794451683.jpg", "category": ["솔로", "실내"], "title": "맥주 마시며 셀카", "note": "모자 쓰고 잔을 입에 대고 위에서" },
  { "id": "ref-43", "photo": "ref/photo_1794451685.jpg", "category": ["솔로", "실내"], "title": "택시 안에서", "note": "창밖을 바라보며 턱 괴기" },
  { "id": "ref-47", "photo": "ref/photo_1794451689.jpg", "category": ["솔로", "실내"], "title": "맛집에서", "note": "음식을 카메라에 가까이 대고 0.5배로" },
  { "id": "ref-49", "photo": "ref/photo_1794451692.jpg", "category": ["솔로", "실내"], "title": "소품샵에서", "note": "소품 하나 들고 구경하는 척" }
];
