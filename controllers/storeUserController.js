const User = require('../models/User');

function calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports = async (req, res) => {
    const { username, email, password, birthdate, gender, underlyingDisease, educationLevel } = req.body;
    let validationErrors = [];

    if (!username || !email || !password || !birthdate || !gender || !underlyingDisease || !educationLevel) {
        validationErrors.push('กรุณากรอกข้อมูลให้ครบถ้วน');
    }

    if (validationErrors.length > 0) {
        req.flash('validationErrors', validationErrors);
        req.flash('data', req.body);
        return res.redirect('/register');
    }

    const age = calculateAge(birthdate);
    
    const userData = {
        username,
        email,
        password,
        birthdate,
        age,
        gender,
        underlyingDisease,
        educationLevel
    };

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            validationErrors.push('อีเมลเคยลงทะเบียน กรุณาลองใหม่');
            req.flash('validationErrors', validationErrors);
            req.flash('data', req.body);
            return res.redirect('/register');
        }

        await User.create(userData);
        console.log("ลงทะเบียนสำเร็จ");
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        validationErrors.push('Error saving user. Please try again.');
        req.flash('validationErrors', validationErrors);
        req.flash('data', req.body);
        res.redirect('/register');
    }
}
