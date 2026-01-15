-- Create feedback_history table for storing user feedback history
CREATE TABLE IF NOT EXISTS feedback_history (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    conversation_id INT NULL,
    message_id INT NULL,
    
    -- User's original text
    user_text TEXT NOT NULL,
    
    -- Short feedback shown to user (conversation-safe)
    short_feedback VARCHAR(500) NOT NULL,
    
    -- Feedback type: success, warning, info
    feedback_type ENUM('success', 'warning', 'info') DEFAULT 'success',
    
    -- Detailed analysis (JSON - for admin/history view)
    detailed_analysis JSON,
    
    -- Score breakdown (JSON)
    score_breakdown JSON,
    
    -- Overall score
    overall_score INT DEFAULT 100,
    
    -- Sentence status
    sentence_status ENUM('correct', 'has_errors') DEFAULT 'correct',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_feedback_type (feedback_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
