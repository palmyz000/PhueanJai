const express = require('express');
const app = express();
const ejs = require('ejs');
const mongoose = require('mongoose');
const expressSession = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// MongoDB Connection (ถ้าไม่ได้ใช้ MongoDB ในส่วนนี้อาจไม่ต้องใช้)
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
const recodeController = require('./controllers/recodeController'); // import recodeController

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
app.get('/recode', authMiddleware, recodeController); // add route for recode

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

        // Find the user and update their text field
        const userId = req.session.userId;
        if (userId) {
            const update = { $set: { [tableName]: transcription } };
            await User.findByIdAndUpdate(userId, update);
        }

        res.json({ text: transcription });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing the audio file' });
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
