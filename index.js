const express = require('express');
const app = express();
const mongoose = require('mongoose');
const expressSession = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/voice', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// นำเข้าโมเดล User
const User = require('./models/User');

global.loggedIn = null;

// Controllers
const indexController = require('./controllers/indexController');
const loginController = require('./controllers/loginController');
const registerController = require('./controllers/registerController');
const storeUserController = require('./controllers/storeUserController');
const loginUserController = require('./controllers/loginUserController');
const logoutController = require('./controllers/logoutController');
const homeController = require('./controllers/homeController');
const recodeController = require('./controllers/recodeController');

// Middleware
const redirectIfAuth = require('./middleware/redirectIfAuth');
const authMiddleware = require('./middleware/authMiddleware');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(expressSession({
    secret: "node secret",
    resave: false,
    saveUninitialized: false
}));
app.use("*", (req, res, next) => {
    loggedIn = req.session.userId;
    next();
});
app.set('view engine', 'ejs');

// ตั้งค่า connect-flash middleware
app.use(flash());

// สร้าง global middleware เพื่อให้สามารถใช้ flash message ในทุก view
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

app.get('/', indexController);
app.get('/home', authMiddleware, homeController);
app.get('/login', redirectIfAuth, loginController);
app.get('/register', redirectIfAuth, registerController);
app.post('/user/register', redirectIfAuth, storeUserController);
app.post('/user/login', redirectIfAuth, loginUserController);
app.get('/logout', logoutController);
app.get('/record', (req, res) => {
    res.render('record');
});
app.get('/recode', authMiddleware, recodeController);

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('audioFile'), async (req, res) => {
    try {
        const { tableName } = req.body;
        const audioFilePath = req.file.path;

        // Send file to Hugging Face API
        const result = await query(audioFilePath);

        // Delete the temporary file
        fs.unlinkSync(audioFilePath);

        // Extract only the text from the result
        const transcription = result.text;

        // Check if the result is empty
        if (!transcription || Object.keys(result).length === 0) {
            return res.status(400).json({ error: 'การส่งข้อมูลผิดพลาด กรุณาส่งข้อมูลใหม่อีกครั้ง' });
        }

        // Send transcription to Flask API for sentiment analysis
        const response = await fetch('http://localhost:5001/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: transcription })
        });

        const sentimentResult = await response.json();
        const sentiment = sentimentResult.prediction;

        // Find the user and update their text field
        const userId = req.session.userId;
        if (userId) {
            const update = { $set: { [tableName]: transcription, [req.body.scoreField]: sentiment } };
            await User.findByIdAndUpdate(userId, update);
        }

        res.json({ text: transcription, sentiment: sentiment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่พบไฟล์เสียง กรุณาอัดเสียงใหม่อีกครั้ง' });
    }
});

app.get('/check-data', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ complete: false });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ complete: false });
        }
        const fields = [
            'text_1', 'text_2', 'text_3', 'text_4', 'text_5',
            'text_6', 'text_7', 'text_8', 'text_9',
            'score_1', 'score_2', 'score_3', 'score_4', 'score_5',
            'score_6', 'score_7', 'score_8', 'score_9'
        ];
        const complete = fields.every(field => user[field] !== null && user[field] !== undefined && user[field] !== '');
        if (!complete) {
            return res.json({ complete: false });
        }

        const scores = [
            user.score_1, user.score_2, user.score_3, user.score_4, user.score_5,
            user.score_6, user.score_7, user.score_8, user.score_9
        ];
        const totalScore = scores.reduce((acc, score) => acc + score, 0);

        res.json({ complete: true, totalScore });
    } catch (error) {
        console.error(error);
        res.status(500).json({ complete: false });
    }
});

app.post('/updateVoiceScore', async (req, res) => {
    const { totalScoreVoice } = req.body;
  
    try {
        const userId = req.session.userId; // ดึง userId จาก session
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
  
        user.totalScoreVoice = totalScoreVoice;
        await user.save();
  
        res.status(200).send('Voice score updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating voice score');
    }
});

app.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.redirect('/');
        }
        const totalScore = [
            user.score_1, user.score_2, user.score_3, user.score_4,
            user.score_5, user.score_6, user.score_7, user.score_8, user.score_9
        ].reduce((acc, score) => acc + (score || 0), 0);
        res.render('profile', { user: user, totalScore: totalScore });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

app.get('/choice', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }else res.render('choice')
});

app.post('/updateScore', async (req, res) => {
    // ตรวจสอบว่ามี userId อยู่ใน session หรือไม่
    if (!req.session.userId) {
      return res.status(401).send('Unauthorized: Please login first');
    }
  
    const { totalScoreChoice } = req.body; // ดึงค่าคะแนนจาก body ของ request
    const userId = req.session.userId; // ดึง userId จาก session
  
    try {
      // ค้นหาผู้ใช้ในฐานข้อมูลโดยใช้ userId
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // อัปเดตคะแนน totalScoreChoice ของผู้ใช้
      user.totalScoreChoice = totalScoreChoice;
      await user.save(); // บันทึกการเปลี่ยนแปลงในฐานข้อมูล
  
      // ส่งสถานะการอัปเดตสำเร็จกลับไปยังผู้ใช้
      res.status(200).send('Score updated successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating score');
    }
  });
  
async function query(filename) {
    const data = fs.readFileSync(filename);
    const response = await fetch(
        "https://api-inference.huggingface.co/models/biodatlab/whisper-th-medium-combined",
        {
            headers: { Authorization: "Bearer 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" },
            method: "POST",
            body: data,
        }
    );
    const result = await response.json();
    return result;
}

app.listen(3000, () => {
    console.log("App listening on port 3000");
});
