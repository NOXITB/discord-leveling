const mongoose = require('mongoose')

const LevelingSchema = new mongoose.Schema({
    memberID: {
        type: String,
        required: true
    },
    guildID: {
        type: String,
        required: true
    },

    level: {
        type: Number,
        default: 1,
        required: true
     },
     xp: {
         type: Number,
         default: 0,
         required: true,
     }
});

module.exports = mongoose.model['LevelingSchema'] || mongoose.model('leveling-schema', LevelingSchema, 'leveling-schema');