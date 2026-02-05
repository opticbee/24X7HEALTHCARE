const express = require('express');
const router = express.Router();
const db = require('../db'); // Assuming db.js is in the parent directory

// --- Table Creation ---
// This part remains the same. It ensures your database tables are set up correctly.
const createTables = () => {
    const opinionsTable = `
        CREATE TABLE IF NOT EXISTS opinions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_unique_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            user_mobile VARCHAR(20) NOT NULL,
            opinion_text TEXT NOT NULL,
            answer_text TEXT,
            status ENUM('pending', 'answered') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            answered_at TIMESTAMP NULL
        );
    `;

    const interactionsTable = `
        CREATE TABLE IF NOT EXISTS opinion_interactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            opinion_id INT NOT NULL,
            user_unique_id VARCHAR(255) NOT NULL,
            interaction_type ENUM('like', 'dislike') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_interaction (opinion_id, user_unique_id),
            FOREIGN KEY (opinion_id) REFERENCES opinions(id) ON DELETE CASCADE
        );
    `;

    const commentsTable = `
        CREATE TABLE IF NOT EXISTS opinion_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            opinion_id INT NOT NULL,
            user_unique_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            user_mobile VARCHAR(20) NOT NULL,
            comment_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (opinion_id) REFERENCES opinions(id) ON DELETE CASCADE
        );
    `;

    db.query(opinionsTable, (err) => {
        if (err) console.error('❌ Error creating opinions table:', err);
        else console.log('✅ opinions table is ready.');
    });
    db.query(interactionsTable, (err) => {
        if (err) console.error('❌ Error creating opinion_interactions table:', err);
        else console.log('✅ opinion_interactions table is ready.');
    });
    db.query(commentsTable, (err) => {
        if (err) console.error('❌ Error creating opinion_comments table:', err);
        else console.log('✅ opinion_comments table is ready.');
    });
};

createTables();


// --- API Endpoints ---

// POST /api/opinions/submit - Submit a new question or opinion
router.post('/opinions/submit', (req, res) => {
    const { opinion_text, user_unique_id, user_name, user_email, user_mobile } = req.body;

    if (!opinion_text || !user_unique_id || !user_name || !user_email || !user_mobile) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    const sql = `
        INSERT INTO opinions (opinion_text, user_unique_id, user_name, user_email, user_mobile, status) 
        VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    db.query(sql, [opinion_text, user_unique_id, user_name, user_email, user_mobile], (err, result) => {
        if (err) {
            console.error('Database error on opinion submission:', err);
            return res.status(500).json({ error: 'Could not submit your opinion.' });
        }
        res.status(201).json({ success: true, message: 'Opinion submitted for review.' });
    });
});

// GET /api/opinions - Get all ANSWERED opinions from the last 7 days for the public page
router.get('/opinions', (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        const opinionsQuery = `
            SELECT 
                o.id, o.user_name, o.opinion_text, o.answer_text, o.answered_at,
                (SELECT COUNT(*) FROM opinion_interactions WHERE opinion_id = o.id AND interaction_type = 'like') as likes_count,
                (SELECT COUNT(*) FROM opinion_interactions WHERE opinion_id = o.id AND interaction_type = 'dislike') as dislikes_count
            FROM opinions o
            WHERE o.status = 'answered' AND o.answered_at >= ?
            ORDER BY o.answered_at DESC
        `;
        
        db.query(opinionsQuery, [sevenDaysAgo], (err, opinions) => {
            if (err) {
                 console.error('Error fetching opinions:', err);
                 return res.status(500).json({ error: 'Database error fetching opinions' });
            }
            
            if (opinions.length === 0) {
                return res.json({ opinions: [] });
            }

            const opinionIds = opinions.map(o => o.id);
            const commentsQuery = `
                SELECT * FROM opinion_comments 
                WHERE opinion_id IN (?) 
                ORDER BY created_at ASC
            `;
            
            db.query(commentsQuery, [opinionIds], (err, comments) => {
                if (err) {
                    console.error('Error fetching comments:', err);
                    return res.status(500).json({ error: 'Database error fetching comments' });
                }
                
                const opinionsWithComments = opinions.map(opinion => ({
                    ...opinion,
                    comments: comments.filter(c => c.opinion_id === opinion.id)
                }));
                
                res.json({ opinions: opinionsWithComments });
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/opinions/:id/interact - Handle likes and dislikes
router.post('/opinions/:id/interact', (req, res) => {
    const { id: opinion_id } = req.params;
    const { user_unique_id, interaction_type } = req.body;

    if (!user_unique_id || !['like', 'dislike'].includes(interaction_type)) {
        return res.status(400).json({ error: 'Invalid interaction data.' });
    }

    const sql = `
        INSERT INTO opinion_interactions (opinion_id, user_unique_id, interaction_type)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE interaction_type = ?
    `;

    db.query(sql, [opinion_id, user_unique_id, interaction_type, interaction_type], (err, result) => {
        if (err) {
            console.error('Database error on interaction:', err);
            return res.status(500).json({ error: 'Could not process interaction.' });
        }
        res.status(200).json({ success: true, message: 'Interaction recorded.' });
    });
});

// POST /api/opinions/:id/comment - Add a new comment
router.post('/opinions/:id/comment', (req, res) => {
    const { id: opinion_id } = req.params;
    const { comment_text, user_unique_id, user_name, user_email, user_mobile } = req.body;

    if (!comment_text || !user_unique_id || !user_name || !user_email || !user_mobile) {
        return res.status(400).json({ error: 'Missing required fields for comment.' });
    }

    const sql = `
        INSERT INTO opinion_comments (opinion_id, comment_text, user_unique_id, user_name, user_email, user_mobile)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [opinion_id, comment_text, user_unique_id, user_name, user_email, user_mobile], (err, result) => {
        if (err) {
            console.error('Database error on comment submission:', err);
            return res.status(500).json({ error: 'Could not post comment.' });
        }
        res.status(201).json({ success: true, message: 'Comment posted.' });
    });
});

// --- FOR ADMIN/TEAM USE ---

// *** THIS WAS THE MISSING ROUTE ***
// GET /api/opinions/pending - Get all opinions that need an answer for the admin page
router.get('/opinions/pending', (req, res) => {
    const sql = `
        SELECT id, user_name, user_email, opinion_text, created_at 
        FROM opinions 
        WHERE status = 'pending'
        ORDER BY created_at ASC
    `;
    db.query(sql, (err, opinions) => {
        if (err) {
            console.error('Database error fetching pending opinions:', err);
            return res.status(500).json({ error: 'Could not fetch pending opinions.' });
        }
        res.json({ opinions });
    });
});

// PUT /api/opinions/:id/answer - Add or update an answer
router.put('/opinions/:id/answer', (req, res) => {
    const { id } = req.params;
    const { answer_text } = req.body;

    if (!answer_text) {
        return res.status(400).json({ error: 'Answer text is required.' });
    }
    
    const sql = `
        UPDATE opinions 
        SET answer_text = ?, status = 'answered', answered_at = NOW()
        WHERE id = ?
    `;
    db.query(sql, [answer_text, id], (err, result) => {
        if (err) {
            console.error('Database error on answering:', err);
            return res.status(500).json({ error: 'Could not save the answer.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Opinion not found.' });
        }
        res.status(200).json({ success: true, message: 'Answer has been published.' });
    });
});


module.exports = router;

