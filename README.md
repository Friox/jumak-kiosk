# JUMAK POS
<img width="365" alt="KakaoTalk_Snapshot_20240630_160359" src="https://github.com/Friox/jumak-pos/assets/10986386/e2b89a9a-dd56-4076-8609-9dbe7d3ee2e9">

*~~프로젝트 시작점~~*  
군대선임으로 알게된 평소연락하던 형님이 대학 축제 주막에 사용할 POS 솔루션을 제작해달라고 하셨다...

## 요약
* 개발기간: 2024년 05월 23일 ~ 2024년 05월 26일 (3일)
* 사용기술: HTML, JS, CSS

사실 앱으로 구현하려 했으나 사용기기가 아이폰과 아이패드여서 배포하는데 어려움이 있을것이라 예상되어  
웹으로 간단하게 구현하기로 하였습니다.  
조금 급하게만든거라 간단한 솔루션이지만 내부 구조는 개판인...  
기회가 되면 갈아엎어봐아겠어요

## 기능
* 테이블 별 내역 관리
* 자릿세 및 시간에따른 추가금액 자동계산
  - 4인 기본요금 4000원, 6인이상 기본요금 6000원
  - 1시간 이후 5분 유예기간 뒤 30분단위로 기본요금의 50% 부과
  - (1시간 4분: 기본금액, 1시간 24분: 기본금액 + 30분 금액)
  - (1시간 34분: 기본금액 + 30분 금액, 1시간 38분: 기본금액 + 60분 금액)
* 주문내역, 결제내역 관리
* 메뉴 관리 (가격 포함 추가, 수정, 삭제)
* WebSocket을 이용한 실시간 동기화 (카운터, 주방 동시사용 가능)
* 보안을 위한 인증키 사용

## 사용법
```shell
# 의존성 설치
npm install

# 실행
npm run dev
```
* dev.env
```dotenv
DB_URL="DB 주소"
DB_USER="DB 유저"
DB_PASSWD="DB 비밀번호"
DB_NAME="DB 이름"
DB_PORT=DB 포트
```
* DB 구축: dump-JUMAK-KIOSK.sql 파일 참고
* 테스트 환경: Node.js 20.11.0

## 스크린샷
![스크린샷 2024-06-30 16 28 25](https://github.com/Friox/jumak-pos/assets/10986386/072a9015-9b23-4f7e-af0a-673b756154e2)
![스크린샷 2024-06-30 16 30 21](https://github.com/Friox/jumak-pos/assets/10986386/a487c965-1b77-4f12-9841-f5a5e6617d32)
![스크린샷 2024-06-30 16 30 33](https://github.com/Friox/jumak-pos/assets/10986386/30f3799e-e930-49cd-abe1-bdb44a81b9dd)
![스크린샷 2024-06-30 16 31 12](https://github.com/Friox/jumak-pos/assets/10986386/2b112ca9-487f-4560-a2ef-0e3291f5a467)
![스크린샷 2024-06-30 16 32 20](https://github.com/Friox/jumak-pos/assets/10986386/1c2d94eb-af7a-48e8-8f53-6a4c69da294e)
![스크린샷 2024-06-30 16 31 23](https://github.com/Friox/jumak-pos/assets/10986386/703b11de-8357-4f05-82e9-111043dcaf14)
![스크린샷 2024-06-30 16 31 32](https://github.com/Friox/jumak-pos/assets/10986386/46522cda-a8c5-4d3e-8303-c7a63573a5f2)
