# Final Report – Constraints and Unimplemented Functional Requirements

## 1. Unimplemented / Incomplete Functional Requirements

This section documents the functional requirements that were initially planned but could not be fully implemented, along with clear justifications for each limitation.

---

### 1.1 FR9: Pronunciation Accuracy Evaluation

**Requirement Statement:**
> "The system shall evaluate the user's pronunciation accuracy using speech analysis algorithms."

**Feature Description:**
This feature was intended to assess how accurately the user pronounces words and phrases in the target language. The system would compare the user's spoken input against expected phonetic patterns and provide detailed feedback on pronunciation errors, including specific phoneme-level corrections.

**Implementation Status:** ❌ Not Implemented

**Reason for Non-Implementation:**

Accurate pronunciation evaluation requires sophisticated speech processing capabilities that go beyond basic speech-to-text conversion:

1. **Phoneme-Level Analysis:** Pronunciation assessment requires breaking down speech into individual phonemes and comparing them against reference pronunciations. This involves acoustic modeling and phonetic alignment algorithms.

2. **Audio Signal Processing:** Direct audio waveform analysis is needed to detect subtle pronunciation differences (e.g., vowel length, consonant articulation, tone in tonal languages). The Web Speech API used in this project only provides transcribed text, not raw audio analysis data.

3. **Third-Party API Requirements:** Commercial-grade pronunciation evaluation services (such as Google Cloud Speech-to-Text with pronunciation assessment, Microsoft Azure Speech Services, or specialized APIs like ELSA Speak API) require:
   - Paid subscription plans
   - Complex API integration
   - Language-specific acoustic models

4. **Machine Learning Complexity:** Developing an in-house pronunciation evaluation system would require:
   - Large datasets of native and non-native speaker recordings
   - Training of acoustic models for multiple languages
   - Significant computational resources

**Current Workaround:**
The system provides grammar-based feedback through the AI Engine (Google Gemini API), which can identify some pronunciation-related issues when they result in transcription errors. However, this is not a substitute for true pronunciation analysis.

**Related Constraints:**
- Time Constraints
- Budget Constraints
- Team Technical Competency Constraints
- Third-Party API Limitations

---

### 1.2 FR11: Fluency Measurement

**Requirement Statement:**
> "The system shall measure fluency based on speech rate, pauses, and coherence."

**Feature Description:**
This feature aimed to provide comprehensive fluency assessment by analyzing:
- **Speech Rate:** Words per minute (WPM) measurement
- **Pause Analysis:** Detection and evaluation of hesitations, filled pauses ("um", "uh"), and unnatural breaks
- **Coherence:** Logical flow and connectivity of spoken responses

**Implementation Status:** ⚠️ Partially Implemented (Simulated)

**Current Implementation:**
The `FeedbackEngine.measureFluency()` method exists in the codebase and provides:
- Text-based word count analysis
- Simulated speech rate calculation
- Basic coherence scoring through text analysis

```typescript
// Current implementation uses text-based simulation
const wordCount = transcribedText.split(/\s+/).length;
const wordsPerMinute = (wordCount / duration) * 60;
```

**Reason for Incomplete Implementation:**

1. **Limited Access to Audio Data:** The Web Speech API's SpeechRecognition interface provides transcribed text with basic timing information, but does not expose:
   - Raw audio waveform data
   - Precise word-level timestamps
   - Pause duration measurements
   - Prosodic features (pitch, intensity, rhythm)

2. **Real-Time Processing Limitations:** Accurate fluency measurement requires:
   - Voice Activity Detection (VAD) algorithms
   - Silence/pause detection with millisecond precision
   - Continuous audio stream analysis
   
   These capabilities would require either:
   - Direct microphone stream access with Web Audio API (complex implementation)
   - Server-side audio processing (additional infrastructure and latency)

3. **Coherence Analysis Complexity:** True coherence evaluation requires:
   - Advanced NLP models for discourse analysis
   - Context-aware semantic understanding
   - Cross-sentence relationship mapping
   
   The current implementation uses simplified text-based heuristics.

**Gap Analysis:**

| Component | Planned | Implemented | Gap |
|-----------|---------|-------------|-----|
| Speech Rate (WPM) | Real-time audio analysis | Text-based estimation | Medium |
| Pause Detection | Audio signal analysis | Simulated/estimated | High |
| Hesitation Markers | Audio pattern recognition | Not implemented | High |
| Coherence Scoring | Advanced NLP analysis | Basic text heuristics | Medium |

**Related Constraints:**
- Time Constraints
- Team Technical Competency Constraints
- Browser API Limitations
- Infrastructure Constraints

---

## 2. Project Constraints

This section documents the constraints that shaped the development boundaries of the Real-Time Speaking Partner project. Only constraints that were actually encountered and relevant to this project are included.

---

### 2.1 Budget Constraints

**Description:**
The project was developed with **zero financial budget** as an academic project, which significantly influenced technology choices and feature scope.

**Impact on Project:**

| Aspect | Constraint Impact | Mitigation Strategy |
|--------|-------------------|---------------------|
| AI Services | Could not use paid APIs (OpenAI GPT-4, Azure AI) | Used Google Gemini API (free tier) |
| Speech Analysis | Commercial pronunciation APIs unavailable (ELSA, SpeechAce) | Relied on free Web Speech API |
| Cloud Hosting | No budget for AWS/Azure/GCP services | Local development with XAMPP |
| Database | No managed database services | Used local MySQL via XAMPP |
| SSL Certificates | No paid certificates for HTTPS | Development on localhost only |

**Specific Examples:**
- **FR9 (Pronunciation Accuracy):** Commercial pronunciation evaluation APIs such as ELSA Speak API, SpeechAce, or Microsoft Azure Speech Assessment require monthly subscription fees ranging from $50-500/month, making them inaccessible for this project.
- **FR11 (Fluency Measurement):** Advanced audio analysis services like Google Cloud Speech-to-Text with enhanced features have per-minute usage costs that exceed project budget.

**Technologies Selected Due to Budget:**
- ✅ Google Gemini API (Free tier with generous limits)
- ✅ Web Speech API (Browser-native, no cost)
- ✅ MySQL with XAMPP (Open-source, local hosting)
- ✅ Node.js/Express.js (Open-source runtime and framework)
- ✅ TypeScript (Open-source language)

---

### 2.2 Time Constraints

**Description:**
The project was developed within a **single academic semester timeline**, requiring prioritization of core features over advanced capabilities.

**Project Timeline Impact:**

| Phase | Allocated Time | Constraint Effect |
|-------|---------------|-------------------|
| Requirements & Design | 2-3 weeks | Limited time for comprehensive research |
| Core Development | 6-8 weeks | Focus on essential features only |
| Testing & Refinement | 2-3 weeks | Limited testing coverage |
| Documentation | 1-2 weeks | Concurrent with development |

**Features Prioritized (Implemented):**
1. User authentication and session management
2. Real-time speech-to-text conversion
3. AI-powered conversation practice
4. Grammar error detection and correction
5. Session feedback and progress tracking
6. Multi-language support (12 languages)
7. Admin panel for content management

**Features Deprioritized (Not Implemented):**
1. FR9: Pronunciation accuracy evaluation - Would require 4-6 additional weeks
2. FR11: Advanced fluency measurement - Would require 3-4 additional weeks
3. Mobile application development - Outside semester scope
4. Offline mode functionality - Infrastructure complexity

**Technology Decisions Influenced by Time:**
- Avoided technologies with steep learning curves (e.g., TensorFlow for custom ML models)
- Used familiar frameworks (Express.js, TypeScript) over newer alternatives
- Leveraged browser-native APIs instead of building custom solutions

---

### 2.3 Team Competency Constraints

**Description:**
The development team's technical expertise influenced the scope of implementable features, particularly for advanced audio processing and machine learning components.

**Team Skill Assessment:**

| Skill Area | Team Proficiency | Impact on Project |
|------------|-----------------|-------------------|
| Web Development (HTML/CSS/JS) | High | Core frontend implemented successfully |
| TypeScript/Node.js | High | Backend developed effectively |
| REST API Development | High | All endpoints implemented |
| SQL/Database Design | Medium-High | Database schema designed and implemented |
| Audio Signal Processing (DSP) | Low | FR9/FR11 limitations |
| Machine Learning / AI Training | Low | No custom ML models developed |
| Phonetic Analysis | None | Pronunciation evaluation not feasible |

**Impact on Unimplemented Features:**

**FR9 - Pronunciation Accuracy:**
- Requires expertise in acoustic phonetics and speech science
- Needs knowledge of Hidden Markov Models (HMM) or deep learning for speech
- Understanding of International Phonetic Alphabet (IPA) and phoneme mapping
- These skills were outside the team's competency area

**FR11 - Fluency Measurement:**
- Requires Digital Signal Processing (DSP) knowledge
- Voice Activity Detection (VAD) algorithm implementation
- Prosodic feature extraction (pitch, intensity, rhythm)
- The team lacked specialized audio processing experience

**Mitigation Strategies:**
- Utilized high-level APIs that abstract complexity (Web Speech API, Gemini API)
- Focused on text-based analysis where team had strong capabilities
- Implemented simulated/estimated versions where full implementation wasn't feasible

---

### 2.4 Platform and Compatibility Constraints

**Description:**
The project was developed exclusively as a **web-based application**, with platform limitations affecting feature availability and user experience.

**Platform Decision:**

| Platform | Status | Justification |
|----------|--------|---------------|
| Web (Desktop Browsers) | ✅ Primary Target | Cross-platform accessibility, familiar technology stack |
| Web (Mobile Browsers) | ⚠️ Partial Support | Responsive design, but limited Speech API support |
| Native Mobile (iOS/Android) | ❌ Not Developed | Time constraints, different skill requirements |
| Desktop Application | ❌ Not Developed | Web approach provides sufficient functionality |

**Browser Compatibility:**

| Browser | Speech Recognition | Speech Synthesis | Overall Support |
|---------|-------------------|------------------|-----------------|
| Google Chrome | ✅ Full | ✅ Full | ✅ Recommended |
| Microsoft Edge | ✅ Full | ✅ Full | ✅ Supported |
| Brave | ✅ Full | ✅ Full | ✅ Supported |
| Firefox | ❌ Limited | ✅ Full | ⚠️ Partial |
| Safari | ⚠️ Partial | ✅ Full | ⚠️ Partial |

**Impact:**
- Users must use Chromium-based browsers for full functionality
- Speech recognition requires user permission (microphone access)
- HTTPS required for speech APIs in production (localhost exempt)

---

### 2.5 Hardware and Infrastructure Constraints

**Description:**
The project was developed and tested on standard personal computers with local server infrastructure.

**Development Environment:**

| Component | Specification | Constraint Impact |
|-----------|--------------|-------------------|
| Development Machine | Standard laptop/desktop | No high-performance computing available |
| Server | Local XAMPP installation | No cloud infrastructure |
| Database | MySQL via XAMPP | Single-instance, no replication |
| Network | Local development only | No public deployment |

**Infrastructure Limitations:**
- No GPU available for machine learning model training
- Limited to local MySQL database (no distributed systems)
- Cannot deploy to production without additional infrastructure investment
- No load balancing or high-availability setup

**Impact on Features:**
- Custom ML models for pronunciation/fluency analysis not feasible (would require GPU training)
- Real-time audio processing limited to client-side browser capabilities
- Concurrent user capacity limited by local server resources

---

### 2.6 License and Copyright Constraints

**Description:**
The project was developed using only open-source and properly licensed software components, ensuring legal compliance and enabling future open-source distribution.

**License Compliance:**

| Component | License | Compliance Status |
|-----------|---------|-------------------|
| Node.js | MIT | ✅ Compliant |
| Express.js | MIT | ✅ Compliant |
| TypeScript | Apache 2.0 | ✅ Compliant |
| MySQL | GPL v2 | ✅ Compliant (server use) |
| Google Gemini API | Google API ToS | ✅ Compliant (free tier) |
| Web Speech API | W3C Standard | ✅ Open Standard |
| bcrypt | MIT | ✅ Compliant |
| mysql2 | MIT | ✅ Compliant |

**Avoided Due to Licensing:**
- Proprietary speech analysis libraries (commercial licenses required)
- Enterprise database solutions (Oracle, SQL Server - licensing costs)
- Commercial UI component libraries

**Project License:**
The project is licensed under **MIT License**, allowing:
- Open-source distribution
- Modification and derivative works
- Commercial use (if desired in future)

---

### 2.7 Data and Privacy Constraints

**Description:**
The project handles user data responsibly, following data protection principles even in an academic context.

**Data Handling Approach:**

| Data Type | Handling Method | Privacy Consideration |
|-----------|----------------|----------------------|
| User Credentials | SHA-256 hashed passwords | Passwords never stored in plaintext |
| Conversation History | Stored in local database | Not shared with third parties |
| Audio Data | Processed client-side only | Not transmitted to external servers |
| Session Data | Temporary, cleared on logout | Minimal data retention |

**Privacy Measures Implemented:**
- ✅ Password hashing using SHA-256 cryptographic algorithm
- ✅ Token-based authentication (no session cookies with sensitive data)
- ✅ Audio processed locally via Web Speech API (not sent to project servers)
- ✅ User consent required for microphone access (browser-enforced)

**Limitations:**
- Google Gemini API receives conversation text (subject to Google's privacy policy)
- Web Speech API may send audio to Google servers for processing (browser-dependent)
- No formal GDPR/KVKK compliance audit performed (academic project scope)

**Test Data:**
- Demo/test accounts used for development and testing
- No real personal data from external users collected

---

### 2.8 Third-Party API and Service Constraints

**Description:**
The project relies on external APIs and services that impose their own limitations and constraints.

**API Dependencies:**

| Service | Usage | Constraints |
|---------|-------|-------------|
| Google Gemini API | AI conversation responses | Rate limits on free tier; text-only (no audio analysis) |
| Web Speech API | Speech-to-text, Text-to-speech | Browser-dependent; requires internet; no phoneme-level data |
| XAMPP/MySQL | Database storage | Local only; single-instance |

**Google Gemini API Limitations:**
- Free tier with usage quotas (requests per minute/day)
- Cannot process audio directly (text input only)
- Response quality varies; occasional API errors require fallback handling
- Model capabilities limited compared to paid tiers

**Web Speech API Limitations:**
- Returns transcribed text only (no confidence scores, timing data, or phoneme information)
- Accuracy varies by accent, background noise, and microphone quality
- Limited language support for some features
- No offline capability

**Impact on Unimplemented Features:**
These API limitations directly caused FR9 and FR11 to remain unimplemented, as the required audio analysis data is not accessible through the available free APIs.

---

## 3. Constraints and Requirements Mapping

This table summarizes the relationship between project constraints and their impact on functional requirements.

| Constraint | FR9 Impact | FR11 Impact | Other Features Impact |
|------------|------------|-------------|----------------------|
| Budget Constraints | ⬤ High | ⬤ High | ○ Low |
| Time Constraints | ⬤ High | ⬤ High | ◐ Medium |
| Team Competency | ⬤ High | ⬤ High | ○ Low |
| Platform/Compatibility | ◐ Medium | ◐ Medium | ◐ Medium |
| Hardware/Infrastructure | ⬤ High | ◐ Medium | ○ Low |
| License Constraints | ○ Low | ○ Low | ○ Low |
| Data/Privacy | ○ Low | ○ Low | ○ Low |
| Third-Party API Limits | ⬤ High | ⬤ High | ◐ Medium |

**Legend:** ⬤ High Impact | ◐ Medium Impact | ○ Low Impact

---

## 4. Final Summary

### 4.1 Unimplemented Requirements Summary

| Requirement | Status | Primary Constraints | Feasibility for Future |
|-------------|--------|---------------------|------------------------|
| FR9: Pronunciation Accuracy | ❌ Not Implemented | Budget, Team Competency, API Limitations | Possible with paid APIs |
| FR11: Fluency Measurement | ⚠️ Partially Implemented | Time, API Limitations, Team Competency | Achievable with more time |

### 4.2 Successfully Implemented Features

Despite the constraints, the project successfully delivers **22 out of 24 functional requirements**, including:

| Category | Implemented Features |
|----------|---------------------|
| **Authentication** | Secure login/signup, token-based sessions, password hashing |
| **Session Management** | Practice session creation, topic selection, real-time conversation |
| **Speech Processing** | Speech-to-text conversion, text-to-speech synthesis |
| **AI Integration** | Natural conversation with AI partner, contextual responses |
| **Feedback System** | Grammar error detection, session feedback reports, progress tracking |
| **Multi-language** | Support for 12 languages |
| **Admin Panel** | User management, topic management, system statistics |
| **Data Persistence** | MySQL database integration, conversation history storage |

### 4.3 Lessons Learned

1. **API Selection is Critical:** Choosing the right APIs early in development is crucial. Free-tier limitations should be thoroughly researched before committing to a feature set.

2. **Scope Management:** Academic projects benefit from realistic scope definition. It's better to fully implement fewer features than partially implement many.

3. **Technical Skill Assessment:** Honest evaluation of team capabilities helps set achievable goals and avoid overcommitment to features requiring unfamiliar expertise.

4. **Documentation Importance:** Maintaining clear documentation of constraints helps justify design decisions and provides valuable context for future development.

### 4.4 Future Development Opportunities

If resources become available, the following enhancements could address unimplemented requirements:

| Feature | Required Resources | Estimated Effort |
|---------|-------------------|------------------|
| FR9: Pronunciation Evaluation | Paid API subscription ($50-200/month) | 4-6 weeks |
| FR11: Full Fluency Analysis | Web Audio API expertise, additional development | 3-4 weeks |
| Mobile Application | React Native or Flutter expertise | 8-12 weeks |
| Production Deployment | Cloud hosting budget, DevOps expertise | 2-4 weeks |

---

## 5. Conclusion

This Final Report section has documented the constraints encountered during the development of the Real-Time Speaking Partner project and explained why specific functional requirements (FR9 and FR11) could not be fully implemented.

**Key Takeaways:**

1. **Budget constraints** were the primary limiting factor, restricting access to commercial speech analysis APIs that would have enabled pronunciation and fluency evaluation.

2. **Time constraints** required prioritization of core features, leaving advanced audio processing features for potential future development.

3. **Team competency constraints** in specialized areas (audio signal processing, machine learning) made certain features technically unfeasible within the project scope.

4. **Third-party API limitations** meant that even with more time and expertise, the available free APIs do not provide the necessary data for pronunciation and fluency analysis.

Despite these constraints, the project successfully delivers a functional language learning platform that enables users to practice speaking through AI-powered conversations, receive grammar feedback, and track their progress across multiple languages.

---

*Document prepared as part of SENG321 Final Report*  
*Real-Time Speaking Partner Project Team*

---

## 6. GitHub Project Repository

### 6.1 Repository Information

| Item | Details |
|------|---------|
| **Repository Name** | RealTimeSpeakingPartner |
| **Repository URL** | `https://github.com/[USERNAME]/RealTimeSpeakingPartner` |
| **Visibility** | Public |
| **Primary Language** | TypeScript |
| **License** | MIT |

> ⚠️ **Note:** Replace `[USERNAME]` with the actual GitHub username after uploading.

### 6.2 Repository Contents

The repository contains all source code and documentation required for project evaluation:

```
RealTimeSpeakingPartner/
├── 📁 src/                          # Source code
│   ├── 📁 controllers/              # Backend controllers
│   ├── 📁 database/                 # Database layer & repositories
│   ├── 📁 engines/                  # Core processing engines
│   ├── 📁 frontend/                 # Frontend components
│   ├── 📁 models/                   # Data models
│   ├── 📁 routes/                   # API routes
│   ├── 📁 scripts/                  # Utility scripts
│   └── 📄 server.ts                 # Main server file
├── 📁 public/                       # Static frontend files
│   ├── 📄 index.html                # Main user interface
│   └── 📄 admin.html                # Admin panel
├── 📁 database/                     # Database schemas & migrations
├── 📄 package.json                  # Dependencies
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 README.md                     # Project documentation
├── 📄 .gitignore                    # Git ignore rules
└── 📄 .env.example                  # Environment variables template
```

### 6.3 Technologies Included in Repository

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js v18+ |
| **Language** | TypeScript 5.3 |
| **Framework** | Express.js 4.18 |
| **Database** | MySQL 8.0 (via mysql2) |
| **AI Integration** | Google Generative AI (Gemini 2.0) |
| **Authentication** | bcrypt, crypto |
| **Development** | ts-node, ESLint, Jest |

### 6.4 Setup Instructions

To run the project locally after cloning:

```bash
# 1. Clone the repository
git clone https://github.com/[USERNAME]/RealTimeSpeakingPartner.git
cd RealTimeSpeakingPartner

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys and database credentials

# 4. Setup database
# Import database/schema.sql into MySQL

# 5. Start the server
npm run server

# 6. Access the application
# Open http://localhost:4499 in browser
```

### 6.5 Access Permissions

- ✅ Repository is set to **Public** for evaluation purposes
- ✅ All source code is accessible without restrictions
- ✅ No proprietary or copyrighted code included
- ✅ All dependencies are open-source

### 6.6 Important Notes for Evaluators

1. **API Key:** The Google Gemini API key in the code is for demonstration purposes. For production use, create your own key at [Google AI Studio](https://makersuite.google.com/app/apikey).

2. **Database:** XAMPP with MySQL is required. Import the schema from `database/schema.sql`.

3. **Browser:** Use Chrome or Edge for full Speech Recognition support.

4. **Admin Access:** Default admin credentials are:
   - Username: `admin`
   - Password: `admin123`
