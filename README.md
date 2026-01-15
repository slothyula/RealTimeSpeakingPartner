# Real-Time Speaking Partner

An intelligent language learning system that enables users to practice speaking in real-time through natural conversations with an AI partner.

## Project Structure

```
RealTimeSpeakingPartner/
├── src/
│   ├── main.ts                 # Ana uygulama ve demo
│   ├── index.ts                # Export modülü
│   │
│   ├── models/                 # Data Model & Persistence Layer
│   │   ├── types.ts            # Temel tipler (Stream, Audio, Score, Report, Intent, Context, Topic)
│   │   ├── User.ts             # User sınıfı
│   │   ├── PracticeSession.ts  # PracticeSession sınıfı
│   │   └── index.ts
│   │
│   ├── database/               # Database Layer
│   │   ├── Database.ts         # Database sınıfı
│   │   └── index.ts
│   │
│   ├── engines/                # Core Engines (System Components)
│   │   ├── TTSModule.ts        # Text-to-Speech modülü
│   │   ├── FeedbackEngine.ts   # Feedback değerlendirme motoru
│   │   ├── SpeechRecognitionEngine.ts  # Speech-to-Text motoru
│   │   ├── AIEngine.ts         # AI yanıt üretim motoru
│   │   └── index.ts
│   │
│   ├── controllers/            # Backend Web Services & Controllers
│   │   ├── AuthController.ts   # Kimlik doğrulama kontrolcüsü
│   │   ├── TopicManager.ts     # Konu yönetimi
│   │   ├── SessionController.ts # Session yönetimi
│   │   └── index.ts
│   │
│   └── frontend/               # Frontend Layer (Web UI)
│       ├── WebInterface.ts     # Web arayüzü
│       └── index.ts
│
├── package.json
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

# Build the project
npm run build

# Run the application
npm start

# Or run in development mode
npm run dev
```

## Classes and Methods

### User
- `-userId: int`
- `-name: String`
- `-email: String`
- `-password: String`
- `+getName(): String`
- `+getEmail(): String`

### PracticeSession
- `-sessionId: int`
- `-topicId: int`
- `-userId: int`
- `-startTime: DateTime`
- `-endTime: DateTime`
- `+getDetails(): String`

### Database
- `+storeUser(user: User): boolean`
- `+validateUserCredentials(email: String, password: String): boolean`
- `+storePerformanceData(sessionId: int, scores: Map): void`
- `+fetchPerformanceHistory(userId: int): List`
- `+fetchTopics(filter: String): List`

### AuthController
- `+processCredentials(data: Map): boolean`
- `+createUser(data: Map): boolean`
- `+login(email: String, password: String): void`

### TopicManager
- `+createTopic(topic: Topic): boolean`
- `+updateTopic(topicId: int, topic: Topic): boolean`
- `+deleteTopic(topicId: int): boolean`
- `+getAvailableTopics(): List`

### SessionController
- `+startRecording(): void`
- `+sendAudio(audioStream: Stream): void`
- `+requestTopics(): List`
- `+setTopic(topicId: int): void`
- `+sessionEnded(userData: User): void`

### WebInterface
- `+displayLoginForm(): void`
- `+displayDashboard(): void`
- `+showFeedback(report: Report): void`
- `+captureAudio(): Stream`

### TTSModule
- `+synthesizeSpeech(textResponse: String): Audio`

### FeedbackEngine
- `+evaluatePronunciation(transcribedText: String): Score`
- `+evaluateGrammar(transcribedText: String): Score`
- `+measureFluency(transcribedText: String, audioData: Audio): Score`
- `+provideSessionFeedback(sessionId: int): Report`

### SpeechRecognitionEngine
- `+convertSpeechToText(audioInput: Audio): String`
- `+analyzeIntent(transcribedText: String): Intent`

### AIEngine
- `+generateResponse(transcribedText: String, context: Context): String`

## Team Members

- 220204034 – Betül Kılıç (Section 1)
- 230201014 – Muhammed Ömer Kaplan (Section 1)
- 230201042 – Hasan Mert Kaya (Section 1)
- 230205024 – Burak Efe Güngör (Section 2)

## License

MIT License
