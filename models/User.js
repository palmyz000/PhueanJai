const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const UserSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Please provide username']
    },
    email: {
        type: String,
        required: [true, 'Please provide email']
    },
    password: {
        type: String,
        required: [true, 'Please provide password']
    },
    birthdate: {
        type: Date,
        required: [true, 'Please provide birthdate']
    },
    age: {
        type: Number,
        required: [true, 'Please provide age']
    },
    gender: {
        type: String,
        required: [true, 'Please provide gender']
    },
    underlyingDisease: {
        type: String,
        required: [true, 'Please provide underlying disease status']
    },
    educationLevel: {
        type: String,
        required: [true, 'Please provide education level']
    },
    text_1: {
        type: String,
        default: ''
    },
    text_2: {
        type: String,
        default: ''
    },
    text_3: {
        type: String,
        default: ''
    },
    text_4: {
        type: String,
        default: ''
    },
    text_5: {
        type: String,
        default: ''
    },
    text_6: {
        type: String,
        default: ''
    },
    text_7: {
        type: String,
        default: ''
    },
    text_8: {
        type: String,
        default: ''
    },
    text_9: {
        type: String,
        default: ''
    },
    score_1: {
        type: Number,
        default: null
    },
    score_2: {
        type: Number,
        default: null
    },
    score_3: {
        type: Number,
        default: null
    },
    score_4: {
        type: Number,
        default: null
    },
    score_5: {
        type: Number,
        default: null
    },
    score_6: {
        type: Number,
        default: null
    },
    score_7: {
        type: Number,
        default: null
    },
    score_8: {
        type: Number,
        default: null
    },
    score_9: {
        type: Number,
        default: null
    },
    totalScoreVoice: {
        type: Number,
        default: null
    },
    totalScoreChoice: {  
        type: Number,
        default: null  
    }
});

UserSchema.pre('save', function(next) {
    const user = this;

    if (!user.isModified('password')) return next();

    bcrypt.hash(user.password, 10).then(hash => {
        user.password = hash;
        next();
    }).catch(error => {
        console.error(error);
    });
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
