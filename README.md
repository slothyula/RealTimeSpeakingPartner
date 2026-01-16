# Real-Time Speaking Partner

An intelligent language learning system that enables users to practice speaking in real-time through natural conversations with an AI partner.

## Project Structure

```
RealTimeSpeakingPartner/
├── src/
│   ├── main.ts                 # Ana uygulama ve demo
│   ├── index.ts                # Export modülü
│   ├── server.ts               # Express server
│   ├── constrains.md           # Kısıtlamalar dokümantasyonu
│   │
│   ├── config/                 # Konfigürasyon dosyaları
│   │   ├── database.config.ts  # Veritabanı konfigürasyonu
│   │   └── index.ts
│   │
│   ├── models/                 # Data Model & Persistence Layer
│   │   ├── types.ts            # Temel tipler (Stream, Audio, Score, Report, Intent, Context, Topic)
│   │   ├── User.ts             # User sınıfı
│   │   ├── PracticeSession.ts  # PracticeSession sınıfı
│   │   └── index.ts
│   │
│   ├── database/               # Database Layer
│   │   ├── Database.ts         # Database sınıfı
│   │   ├── MySQLConnection.ts  # MySQL bağlantı yönetimi
│   │   ├── index.ts
│   │   └── repositories/       # Repository Pattern
│   │       ├── AdminRepository.ts
│   │       ├── ConversationRepository.ts
│   │       ├── FeedbackRepository.ts
│   │       ├── GrammarMistakeRepository.ts
│   │       ├── MessageRepository.ts
│   │       ├── TopicRepository.ts
│   │       ├── UserRepository.ts
│   │       └── index.ts
│   │
│   ├── engines/                # Core Engines (System Components)
│   │   ├── TTSModule.ts        # Text-to-Speech modülü
│   │   ├── FeedbackEngine.ts   # Feedback değerlendirme motoru
│   │   ├── SpeechRecognitionEngine.ts  # Speech-to-Text motoru
│   │   ├── AIEngine.ts         # AI yanıt üretim motoru
│   │   ├── AIEngine_backup.ts  # AI Engine yedek dosyası
│   │   └── index.ts
│   │
│   ├── controllers/            # Backend Web Services & Controllers
│   │   ├── AuthController.ts   # Kimlik doğrulama kontrolcüsü
│   │   ├── TopicManager.ts     # Konu yönetimi
│   │   ├── SessionController.ts # Session yönetimi
│   │   └── index.ts
│   │
│   ├── routes/                 # API Routes
│   │   ├── adminRoutes.ts      # Admin rotaları
│   │   └── index.ts
│   │
│   ├── scripts/                # Yardımcı scriptler
│   │   ├── createTestAdmin.ts  # Test admin oluşturma
│   │   ├── removeModerator.ts  # Moderatör silme
│   │   └── runMigration.ts     # Migration çalıştırma
│   │
│   └── frontend/               # Frontend Layer (Web UI)
│       ├── WebInterface.ts     # Web arayüzü
│       └── index.ts
│
├── database/                   # SQL dosyaları ve migration scriptleri
│   ├── schema.sql              # Ana veritabanı şeması
│   ├── create_feedback_history.sql
│   ├── create_test_admin.sql
│   ├── create_user_levels.sql
│   ├── migration_add_multilanguage.sql
│   ├── remove_moderator.sql
│   ├── add_user_levels_data.js
│   └── sync_user_levels.js
│
├── public/                     # Statik dosyalar
│   ├── index.html              # Ana sayfa
│   └── admin.html              # Admin paneli
│
├── .env.example                # Ortam değişkenleri örneği
├── .gitignore
├── package.json
├── package-lock.json
├── test-api-connection.js      # API bağlantı testi
├── tsconfig.json
└── README.md
```

## Class Diagram Relations

### Frontend Layer
- **WebInterface**
  - `sends credentials` → AuthController
  - `manages session` → SessionController

### Backend Web Services & Controllers
- **AuthController**
  - `creates` → Database (User)
  - `validates` → Database (Credentials)
  
- **TopicManager**
  - `manages content` → Database (Topics)
  
- **SessionController**
  - `stores results` → Database (Performance Data)
  - `uses` → TTSModule
  - `uses` → FeedbackEngine
  - `uses` → SpeechRecognitionEngine
  - `uses` → AIEngine

### Core Engines
- **TTSModule**: Text-to-Speech dönüşümü
- **FeedbackEngine**: Telaffuz, gramer ve akıcılık değerlendirmesi
- **SpeechRecognitionEngine**: Speech-to-Text ve intent analizi
- **AIEngine**: Konuşma yanıtı üretimi

### Data Model & Persistence
- **User** `owns` → PracticeSession (1 to 0..*)
- **Database**: Tüm veri depolama işlemleri

## Installation

```bash
# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and update with your settings
cp .env.example .env

# Run database migrations
npm run migrate

# Build the project
npm run build

# Run the application
npm start

# Or run in development mode
npm run dev

# Run the Express server
npm run server
```

## Available Scripts

```bash
npm run build          # TypeScript'i JavaScript'e derle
npm run start          # Derlenmiş uygulamayı çalıştır
npm run dev            # Development modunda çalıştır (ts-node)
npm run server         # Express server'ı başlat
npm run watch          # TypeScript watch modu
npm run clean          # dist klasörünü temizle
npm run lint           # ESLint ile kod kontrolü
npm run test           # Jest testlerini çalıştır
npm run migrate        # Veritabanı migration'larını çalıştır
npm run create-admin   # Test admin kullanıcısı oluştur
npm run remove-moderator # Moderatör kullanıcısını sil
```

## Classes and Methods

### User
- `-userId: number`
- `-name: string`
- `-email: string`
- `-password: string`
- `-practiceSessions: PracticeSession[]`
- `+getName(): string`
- `+getEmail(): string`
- `+getUserId(): number`
- `+getPassword(): string`
- `+setName(name: string): void`
- `+setEmail(email: string): void`
- `+setPassword(password: string): void`
- `+addPracticeSession(session: PracticeSession): void`
- `+getPracticeSessions(): PracticeSession[]`
- `+getPracticeSessionById(sessionId: number): PracticeSession | undefined`

### PracticeSession
- `-sessionId: number`
- `-topicId: number`
- `-userId: number`
- `-startTime: Date`
- `-endTime: Date`
- `+getDetails(): string`
- `+getSessionId(): number`
- `+getTopicId(): number`
- `+getUserId(): number`
- `+getStartTime(): Date`
- `+getEndTime(): Date`
- `+setEndTime(endTime: Date): void`
- `+isActive(): boolean`

### Database
- `+storeUser(user: User): boolean`
- `+validateUserCredentials(email: string, password: string): boolean`
- `+storePerformanceData(sessionId: number, scores: DataMap): void`
- `+fetchPerformanceHistory(userId: number): any[]`
- `+fetchTopics(filter: string): Topic[]`
- `+getUserByEmail(email: string): User | undefined`
- `+getUserById(userId: number): User | undefined`
- `+getTopicById(topicId: number): Topic | undefined`
- `+storeTopic(topic: Topic): boolean`
- `+updateTopic(topicId: number, topic: Topic): boolean`
- `+deleteTopic(topicId: number): boolean`
- `+storeSession(session: PracticeSession): boolean`
- `+generateUserId(): number`
- `+generateTopicId(): number`
- `+generateSessionId(): number`

### AuthController
- `+processCredentials(data: DataMap): boolean`
- `+createUser(data: DataMap): boolean`
- `+login(email: string, password: string): void`
- `+logout(): void`
- `+getCurrentUser(): User | null`
- `+setCurrentUser(user: User): void`
- `+isLoggedIn(): boolean`

### TopicManager
- `+createTopic(topic: Topic): boolean`
- `+updateTopic(topicId: number, topic: Topic): boolean`
- `+deleteTopic(topicId: number): boolean`
- `+getAvailableTopics(): Topic[]`
- `+getTopicsByCategory(category: string): Topic[]`
- `+getTopicsByDifficulty(difficulty: string): Topic[]`
- `+getTopicById(topicId: number): Topic | undefined`

### SessionController
- `+startRecording(): void`
- `+sendAudio(audioStream: Stream): void`
- `+requestTopics(): Topic[]`
- `+setTopic(topicId: number): void`
- `+sessionEnded(userData: User): void`
- `+setCurrentUser(user: User): void`
- `+getCurrentSession(): PracticeSession | null`
- `+isSessionRecording(): boolean`
- `+getSessionReport(): Report | null`

### WebInterface
- `+displayLoginForm(): void`
- `+displayDashboard(): void`
- `+showFeedback(report: Report): void`
- `+captureAudio(): Stream`

### TTSModule
- `+synthesizeSpeech(textResponse: string): Audio`
- `+setLanguage(language: string): void`
- `+setRate(rate: number): void`
- `+setPitch(pitch: number): void`

### FeedbackEngine
- `+evaluateGrammar(transcribedText: string): Score`
- `+measureFluency(transcribedText: string, audioData: Audio): Score`
- `+provideSessionFeedback(sessionId: number): Report`
- `+addSessionScore(sessionId: number, score: Score): void`

### SpeechRecognitionEngine
- `+convertSpeechToText(audioInput: Audio): string`
- `+analyzeIntent(transcribedText: string): Intent`

### AIEngine
- `+generateResponse(transcribedText: string, context: Context): string`
- `+generateResponseAsync(transcribedText: string, context: Context): Promise<string>`
- `+startConversation(sessionId: number): void`
- `+recordUserMessage(text: string): void`
- `+recordIncorrectMessage(): void`
- `+analyzeAndRespond(text: string, context: Context): Promise<any>`
- `+clearHistory(): void`

## Team Members

- 220204034 – Betül Kılıç (Section 1)
- 230201014 – Muhammed Ömer Kaplan (Section 1)
- 230201042 – Hasan Mert Kaya (Section 1)
- 230205024 – Burak Efe Güngör (Section 2)

## License

MIT License
