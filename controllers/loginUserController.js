const bcrypt = require('bcrypt');
const User = require('../models/User');

module.exports = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'กรอกข้อมูลไม่ครบ กรุณากรอกใหม่');
        return res.redirect('/');
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'ไม่พบอีเมลในระบบ กรุณากรอกใหม่');
            return res.redirect('/');
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.userId = user._id;
            return res.redirect('/home');
        } else {
            req.flash('error', 'รหัสผ่านผิดพลาด กรุณากรอกใหม่');
            return res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งในภายหลัง');
        return res.redirect('/');
    }
};
