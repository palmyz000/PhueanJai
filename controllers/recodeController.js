module.exports = (req, res) => {
    res.render('recode', {
        errors: req.flash('validationErrors')
    });
};