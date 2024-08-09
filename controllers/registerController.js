module.exports = (req, res) => {
    const data = req.flash('data')[0] || {};
    
    res.render('register', {
        validationErrors: req.flash('validationErrors'),
        data: {
            username: data.username || '',
            email: data.email || '',
            password: data.password || '',
            birthdate: data.birthdate || '',
            gender: data.gender || '',
            underlyingDisease: data.underlyingDisease || '',
            educationLevel: data.educationLevel || ''
        }
    });
};
