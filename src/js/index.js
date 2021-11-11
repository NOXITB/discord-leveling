const { EventEmitter } = require("events")
const { existsSync, writeFileSync, readFileSync } = require('fs')
const { Guild, User, GuildMember } = require('discord.js')
const mongoose = require('mongoose')

const LevelingModel = require("../../Schema/Leveling")
const { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } = require("constants")

/**
 * Main Class that initates the level system.
 * 
 * @description Main class that enables the system!
 */
class Leveling {
    /** 
     * [Module Options]
     * 
     * @param {object} options [Object for Options]
     * @param {string} options.type [Type of Database]
     * @param {string} options.mongoPath [Ex: 'mongodb://localhost/mongoosetest]
     * @param {string} options.jsonPath [ex: './db/leveling.json' not recommended for this package.]
     * 
     */
    constructor(options = {}) {
        this.isReady = false;
        this.version = (require('../../package.json').version)
        this.options = options;
        this.logger = new this.logger()
        this.db;

        this.initModule()
}

// [EventEmitter]

/**
 * @param {'newLevel' | 'setXP' | setlevel} event [Event Name]
 * @param {Function} fn [callback]
 */
on(event, fn) {
    events.on(event, fn)
}

/**
 * @param {'newLevel' | 'setXP' | setlevel} event [Event Name]
 * @param {Function} fn [callback]
 */
once(event, fn) {
    events.once(event, fn)

}
/**
 * @param {'newLevel' | 'setXP' | setlevel} event [Event Name]
 * @param {Function} fn [callback]
 */
emit(event, ...args) {
    events.emit(event, args[0])
}

// [Methods]

/**
 * [Adds XP to a user]
 * 
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * @param {number} amount [Amount]
 * 
 * @returns {Promise<boolean>} 
 */
async addXP(member, guild, amount)
{
    if(!this.isReady) return this.logger.error('Module isnt loaded.')

    if(!member) return this.logger.error('Discord.GuildMember | Discord.User is needed for XP Amount.')

    if(!guild) return this.logger.error('Discord.guild is needed for the addXP method.')

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {}
        if(this.options.type === 'mongodb') {
            try {
                const userData = await LevelingModel.findOne({
                    memberID,
                    guildID
                });
    
                if(userData === null) await this.createUser(memberID, guildID);
                else {
                    await LevelingModel.findOneAndUpdate(
                        {
                            memberID,
                            guildID
                        },
                        {
                            xp: Number(userData.xp + amount)
                        }
                    ).exec();
    
                    const newUser = await LevelingModel.findOne({
                        memberID,
                        guildID
                    });
    
                    const formula = Number(5 * Math.pow(newUser.level, 2) + 50 * newUser.level + 100);
    
                    if(Number(newUser.xp) > formula) {
                        await LevelingModel.findOneAndUpdate(
                            {
                                memberID,
                                guildID,
                            },
                            {
                                xp: Number(0),
                                level: Number(newUser.level + 1),
                            }
                        ).exec();
    
                        events.emit('newLevel', {
                            memberID,
                            guildID,
                            level: Number(newUser.level + 1)
                        });
                    };
                }

                return res(true);
            } catch (error) {
                rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString())
                const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);
                if(!userData) this.createUserJSON(memberID, guildID);
                
                userData.xp += amount;
    
                const formula = Number(5 * Math.pow(userData.level, 2) + 50 * userData.level + 100);
    
                if(Number(userData.xp) > formula) {
                    userData.level++;
                    userData.xp = 0;
    
                    events.emit('newLevel', {
                        userID: memberID,
                        guildID,
                        level: Number(userData.level)
                    });
                };
                
                writeFileSync(this.options.jsonPath, JSON.stringify(data, null, '\t'));
                return res(true);
            } catch (error) {
                rej(
                    this.logger.error(error.message)
                );
            }
        };
    });
}

/**
 * [Subtracts XP from a user]
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * @param {number} amount [Amount]
 * 
 * @returns {Promise<boolean>} 
 */
async subtractXP(member, guild, amount) {
    if(!this.isReady) this.logger.error('Module is not loaded yet.')
 
    if(!member) return this.logger.error('\'Discord.GuildMember | Discord.User\' is needed for subtractXP method!')
    if(!guild) return this.logger.error('\'Discord.Guild\' is needed for subtractXP method!');

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {
            try {
                const userData = await LevelingModel.findOne({
                    memberID,
                    guildID
                });
    
                if(userData === null) await this.createUser(memberID, guildID);
                else {
                    if(Number(userData.xp) < amount) return this.logger.warn(`Cannot subtract ${amount} XP to User!\nHe hasn't enought XP to do this.`);
                    else await LevelingModel.findOneAndUpdate(
                        {
                            memberID,
                            guildID,
                        },
                        {
                            xp: Number(userData.xp - amount),
                        }
                    ).exec();
    
                    return res(true);
                }
            } catch (error) {
                rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options.type === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString())
            
                const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);
                if(!userData) this.createUserJSON(memberID, guildID);
                if(Number(userData.xp) < amount)  return this.logger.warn(`Cannot subtract ${amount} XP to User!\nHe hasn't enought XP to do this.`);
                
                userData.xp -= amount;

                writeFileSync(this.options.jsonPath, JSON.stringify(data, null, '\t'));
                return res(true);
            } catch (error) {
                rej(
                    this.logger.error(error.message)
                );
            }
        };
    });
}

/**
 * [XP to new level of user.]
 * 
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * @param {number} level
 * 
 * @returns {Promise<number>}
 */
 async xpFor(member, guild, level) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!member) return this.logger.error('\'Discord.GuildMember | Discord.User\' is needed for xpFor method!');
    if(!guild) return this.logger.error('\'Discord.Guild\' is needed for xpFor method!');
    if(!level) return this.logger.error('\'level\' is needed for xpFor method!');

    if((typeof level) !== 'number') return this.logger.error('\'level\' is not a Number (xpFor Method)!');

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {
            const userData = await LevelingModel.findOne({
                memberID,
                guildID
            });

            if(userData === null) await this.createUser(memberID, guildID);
            else {
                try {
                    if(userData.level > level) return this.logger.warn(`User Level (${userData.level}) is more than ${level} level!`);

                    const formula = Number(5 * Math.pow(level, 2) + 50 * level + 100);
                    const nextXP = (formula - userData.xp);

                    return res(Number(nextXP));
                } catch (error) {
                    return rej(
                        this.logger.error(error.message)
                    );
                }
            }
        }
        else if(this.options.type === 'json') {
            const data = JSON.parse(readFileSync(this.options.jsonPath).toString())
            
            const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);
            if(!userData) this.createUserJSON(memberID, guildID);

            if(userData.level > level) return this.logger.warn(`User Level (${userData.level}) is more than ${level} level!`);

            const formula = Number(5 * Math.pow(level, 2) + 50 * level + 100);
            const nextXP = (formula - userData.xp);

            return res(Number(nextXP));
        };
    });
}

/**
 * [Sets XP to User]
 * 
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * @param {number} amount [Amount]
 * 
 * @returns {Promise<boolean>} 
 */
async setXP(member, guild, amount) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!member) return this.logger.error('\'Discord.GuildMember | Discord.User\' is needed for setXP method!');
    if(!guild) return this.logger.error('\'Discord.Guild\' is needed for setXP method!');
    if(!amount) return this.logger.error('\'amount\' is needed for setXP method!');

    if((typeof amount) !== 'number') return this.logger.error('\'amount\' is not a Number (setXP method)!');

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {
            try {
                const userData = await LevelingModel.findOne({
                    memberID,
                    guildID
                });
    
                if(userData === null) await this.createUser(memberID, guildID);
                else {
                    await LevelingModel.findOneAndUpdate(
                        {
                            memberID,
                            guildID
                        },
                        {
                            xp: Number(amount)
                        }
                    ).exec();

                    const newUser = await LevelingModel.findOne({
                        memberID,
                        guildID
                    });

                    events.emit('setXP', {
                        type: 'setXP',
                        memberID,
                        guildID,
                        oldXP: Number(userData.xp),
                        newXP: Number(newUser.xp),
                    });

                    return res(true);
                } 
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options.type === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString());

                const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);
                if(!userData) this.createUserJSON(memberID, guildID);
                else {
                    const oldXP = Number(userData.xp);

                    userData.xp = Number(amount);

                    events.emit('setXP', {
                        type: 'setXP',
                        memberID,
                        guildID,
                        oldXP,
                        newXP: Number(newUser.xp),
                    });
                    
                    writeFileSync(this.options.jsonPath, JSON.stringify(data, null, '\t'));
                    return res(true);
                };
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
    })
}

/**
 * [Sets Level to User]
 * 
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * @param {number} amount [Amount]
 * 
 * @returns {Promise<boolean>}
 */
async setLevel(member, guild, amount) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!member) return this.logger.error('\'Discord.GuildMember | Discord.User\' is needed for setLevel method!');
    if(!guild) return this.logger.error('\'Discord.Guild\' is needed for setLevel method!');
    if(!amount) return this.logger.error('\'amount\' is needed for setXP method!');

    if((typeof amount) !== 'number') return this.logger.error('\'amount\' is not a Number (setXP method)!');

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {
            try {
                const userData = await LevelingModel.findOne({
                    memberID,
                    guildID
                });
    
                if(userData === null) await this.createUser(memberID, guildID);
                else {
                    await LevelingModel.findOneAndUpdate(
                        {
                            memberID,
                            guildID
                        },
                        {
                            level: Number(amount)
                        }
                    ).exec();

                    const newUser = await LevelingModel.findOne({
                        memberID,
                        guildID
                    });

                    events.emit('setLevel', {
                        type: 'setLevel',
                        memberID,
                        guildID,
                        oldLevel: Number(userData.level),
                        newLevel: Number(newUser.level),
                    });

                    return res(true);
                } 
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options.type === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString());

                const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);
                if(!userData) this.createUserJSON(memberID, guildID);
                else {
                    const oldLevel = Number(userData.level);

                    userData.level = Number(amount);

                    events.emit('setLevel', {
                        type: 'setLevel',
                        memberID,
                        guildID,
                        oldLevel,
                        newLevel: Number(userData.level),
                    });

                    writeFileSync(this.options.jsonPath, JSON.stringify(data, null, '\t'));
                    return res(true);
                };
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
    })
}

/**
 * [Gets User Data]
 * 
 * @param {User | GuildMember} member [Discord Member]
 * @param {Guild} guild [Discord Guild]
 * 
 * @returns {Promise<object>}
 */
async get(member, guild) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!member) return this.logger.error('\'Discord.GuildMember | Discord.User\' is needed for get method!');
    if(!guild) return this.logger.error('\'Discord.Guild\' is needed for get method!');

    return new Promise(async(res, rej) => {
        const memberID = member.id;
        const guildID = guild.id;

        if(this.options.type === 'mongodb') {
            try {
                const userData = await LevelingModel.findOne({
                    memberID,
                    guildID
                });
    
                if(userData === null) await this.createUser(memberID, guildID);
                else return res(userData);
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options.type === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString());
                const userData = data.find((user) => user.guildID === guildID && user.memberID === memberID);

                if(!userData) this.createUserJSON(memberID, guildID);
                else return res(userData);
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            } 
        } 
    });
}

/**
 * [Method to get Level Leaderboard]
 * 
 * @param {Guild} guild [Discord Guild]
 * 
 * @returns {Promise<Array>}
 */
async leaderboard(guild) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!guild) return this.logger.error('\'guildID\' is needed for leaderboard method!');

    return new Promise(async(res, rej) => {
        if(this.options.type === 'mongodb') {
            try {
                const guildData = await LevelingModel.find({
                    guildID
                });

                const sortedArray = guildData.sort((a, b) => b.level - a.level);
                
                return res(sortedArray);
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        }
        else if(this.options.type === 'json') {
            try {
                const data = JSON.parse(readFileSync(this.options.jsonPath).toString());

                const guildData = data.filter((guild) => guild.guildID === guildID);
                if(!guildData) return rej(this.logger.error('Leaderboard cannot be created because Server isn\'t founded in DB.'));
                else {
                    const sortedArray = guildData.sort((a, b) => b.level - a.level);
                    return res(sortedArray);
                };
            } catch (error) {
                return rej(
                    this.logger.error(error.message)
                );
            }
        } 
    });
}

/**
 * [Creating User Table | MongoDB | Private]
 * 
 * @param {string} memberID [Discord MemberID]
 * @param {string} guildID [Discord GuildID]
 * 
 * @private
 * @returns {Promise<boolean>}
 */
async createUser(memberID, guildID) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!memberID) return this.logger.error('\'memberID\' is needed for createUser method!');
    if(!guildID) return this.logger.error('\'guildID\' is needed for createUser method!');

    if((typeof memberID) !== 'string') return this.logger.error('\'memberID\' is not a String (createUser method)!');
    if((typeof guildID) !== 'string') return this.logger.error('\'guildID\' is not a String (createUser method)!');

    return new Promise(async(res, rej) => {
        try {
            await new LevelingModel({
                memberID,
                guildID,
                level: 1,
                xp: 0
            }).save();
    
            return res(true);
        } catch (error) {
            rej(
                this.logger.error(error.message)
            );
        }
    });
}

/**
 * [Creating User Table | JSON | Private]
 * 
 * @param {string} memberID [Discord MemberID]
 * @param {string} guildID [Discord GuildID]
 * 
 * @private
 * @returns {Promise<boolean>}
 */
async createUserJSON(memberID, guildID) {
    if(!this.isReady) return this.logger.error('Module isn\'t loaded!');

    if(!memberID) return this.logger.error('\'memberID\' is needed for createUserJSON method!');
    if(!guildID) return this.logger.error('\'guildID\' is needed for createUserJSON method!');

    if((typeof memberID) !== 'string') return this.logger.error('\'memberID\' is not a String (createUserJSON method)!');
    if((typeof guildID) !== 'string') return this.logger.error('\'guildID\' is not a String (createUserJSON method)!');

    return new Promise(async(res, rej) => {
        try {
            const data = JSON.parse(readFileSync(this.options.jsonPath).toString());

            const searchData = {
                memberID,
                guildID
            };

            if(!data.includes(searchData)) {
                data.push({
                    memberID,
                    guildID,
                    level: 1,
                    xp: 0
                });
            }
            else {
                return rej(
                    this.logger.warn('User is already in DB!')
                );
            };

            writeFileSync(this.options.jsonPath, JSON.stringify(data, null, '\t'));

            return res(true);
        } catch (error) {
            rej(
                this.logger.error(error.message)
            );
        }
    });
}

/**
 * [Method to Initialize Module | Private]
 * 
 * @private
 * @returns {boolean}
 */
async initModule() {
    if(this.options.type === 'mongodb') {
        const mongodbPath = this.options.mongoPath;
        if(!mongodbPath) {
            this.isReady = false;
            return this.logger.warn('No mongoPath writed in Leveling.Options!')
        };
        
        try {
            return await mongoose.connect(mongodbPath, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
                useCreateIndex: true
            }, (err) => {
                if(err) {
                    return this.logger.error('Cannot connect to Database!');
                }
                else {
                    this.logger.log('Connected to Database!');
                
                    this.isReady = true;

                    return this.db = mongoose;
                };
            })
        } catch (error) {
            this.isReady = false;

            this.logger.error(error.message);
        };
    }
    else if(this.options.type === 'json') {
        const jsonPath = this.options.jsonPath;
        if(!jsonPath) {
            this.isReady = false;

            return this.logger.warn('No jsonPath writed in Leveling.Options!')
        };

        setInterval(() => {
            const fileCheck = existsSync(jsonPath);
            if(!fileCheck) {
                this.logger.warn('No File founded, creating...');
                
                writeFileSync(jsonPath, JSON.stringify([], null, '\t'));
            };

            const content = readFileSync(jsonPath).toString();
            if(!content.startsWith('[') && !content.endsWith(']')) {
                this.logger.error('DB File has wrong data!');
            };
        }, 1000);
    }
    else {
        return this.logger.error(`Unknown Type '${this.options.type}'`)
    };

    this.isReady = true;
    return true;
}
}

class Logger {
log(...message) {
    return console.log(`[Leveling | ${new Date().toLocaleString()}] ${message}`)
}

warn(...message) {
    return console.warn(`[Leveling | ${new Date().toLocaleString()}] ${message}`)
}

error(...message) {
    return console.error(`[Leveling | ${new Date().toLocaleString()}] ${message}`)
}
}

module.exports = Leveling;

/**
* Emitted when someone reached New Level!
* 
* @event Leveling#newLevel
* @param {object} data [Callback]
* @param {string} data.type [Type of Event]
* @param {string} data.memberID [Member ID]
* @param {string} data.guildID [GuildID]
* @param {number} data.level [New Level]
*
*/

/**
* Emitted when someone Set XP to Someone | Useless
* 
* @event Leveling#setXP
* @param {object} data [Callback]
* @param {string} data.type [Type of Event]
* @param {string} data.memberID [MemberID]
* @param {string} data.guildID [GuildID]
* @param {number} data.oldXP [oldXP]
* @param {number} data.newXP [newXP]
*
*/

/**
* Emitted when someone Set Level to Someone | Useless
* 
* @event Leveling#setLevel
* @param {object} data [Callback]
* @param {string} data.type [Type of Event]
* @param {string} data.memberID [MemberID]
* @param {string} data.guildID [GuildID]
* @param {number} data.oldLevel [oldLevel]
* @param {number} data.newLevel [newLevel]
*
*/