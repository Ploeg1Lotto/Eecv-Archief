# Eecv Archief – Web-app (PRD)
## Probleem
Bestaande Expo/React Native (expo-router) app van GitHub (Ploeg1Lotto/Eecv-Archief) geschikt maken als persoonlijke web-app via één deelbare link. Geen login/backend/database: alles lokaal (AsyncStorage/localStorage + IndexedDB).
## Gedaan (2026-06)
- Repo frontend geïmporteerd naar /app/frontend; `yarn start` = expo web op poort 3000, `yarn build` = expo export web -> build/
- Video's op web persistent als Blob in IndexedDB
- Back-up: export downloadt .json, import uploadt .json (video's optioneel, ook op web)
- PDF openen in nieuw tabblad (blob-URL)
- Foto delen: Web Share API, fallback download + wa.me / mailto
- Alert.alert -> browser alert/confirm op web; desktop gecentreerd max 760px
## Backlog
- P2: RN-web shadow-deprecation warnings opruimen
