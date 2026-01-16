# Real-Time Speaking Partner

An intelligent language learning system that enables users to practice speaking in real-time through natural conversations with an AI partner.

## 🎯 Features

- **Real-Time AI Conversations** - Practice speaking with an intelligent AI partner powered by Google Gemini
- **Multi-Language Support** - Learn English, Spanish, French, German, Turkish and 20+ languages
- **Speech Recognition** - Convert your speech to text for analysis
- **Text-to-Speech** - Hear AI responses with natural voice synthesis
- **Grammar Evaluation** - Get instant feedback on grammar mistakes
- **Fluency Assessment** - Measure your speaking pace and coherence
- **Topic-Based Practice** - Choose from various conversation topics (Daily Life, Business, Travel, Academic)
- **Performance Tracking** - View your learning history and progress
- **User Authentication** - Secure login and registration system
- **Admin Dashboard** - Manage users, topics, and view statistics

## 🛠️ Tech Stack

### Backend
- **Node.js** (>=18.0.0) - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **MySQL** - Relational database

### AI & Speech
- **Google Gemini API** - AI conversation engine
- **Web Speech API** - Speech recognition and synthesis

### Authentication & Security
- **bcrypt** - Password hashing
- **express-session** - Session management
- **Token-based auth** - Multi-tab support

### Development Tools
- **ESLint** - Code linting
- **Jest** - Testing framework
- **ts-node** - TypeScript execution

## 📸 Screenshots

> Coming soon - Screenshots of the application interface

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

## 🔐 Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Google Gemini API Key
# Get your key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=speaking_partner
DB_PORT=3306

# Server Configuration
PORT=4499
NODE_ENV=development
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/user` | Get current user info |
| GET | `/api/auth/user/stats` | Get user statistics |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics` | Get all available topics |
| GET | `/api/topics/:id` | Get topic by ID |

### Practice Session
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session/start` | Start a new practice session |
| POST | `/api/session/chat` | Send message and get AI response |
| POST | `/api/session/practice` | Process audio for practice |
| POST | `/api/session/end` | End current session |
| GET | `/api/session/status` | Get session status |

### History & Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get conversation history |
| GET | `/api/history/:id` | Get specific conversation |
| DELETE | `/api/history/:id` | Delete conversation |
| GET | `/api/history/:id/feedbacks` | Get feedbacks for conversation |
| GET | `/api/feedback/history` | Get all feedback history |
| GET | `/api/performance/history` | Get performance history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/active-sessions` | Get active user sessions |
| GET | `/api/admin/active-user-ids` | Get active user IDs |
| GET | `/api/admin/online-user-ids` | Get online user IDs |

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

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use ESLint for code linting (`npm run lint`)
- Write meaningful commit messages
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 SENG321 Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
