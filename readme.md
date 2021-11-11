Disc Levels
===

A Discord.js addon to make leveling easier in your server.

Installing
-----------



```
npm i disclevels
```

Dependencies
-----------
```
Mongoose, discord.js, fs.
```

Setup:
----------
```js
const Leveling = require('disclevels'); // [Importing Module]
const leveling = new Leveling({
  type: 'json', // [It also can be 'mongodb']
  jsonPath: './db.json', // [For 'json' type. Must be end with '.json'!]
  mongoPath: 'mongodb://localhost' // [For 'mongodb' type]
}); // [Initalize Module]


// [Discord Part]
const { Client, Intents } = require('discord.js'); // [Importing Discord.JS]

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  allowedMentions: { repliedUser: false, parse: ["users"] },
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

}); // [Initalize Client]

// [Client Events]
client.once('ready', () => {
  return console.log(`${client.user.tag} is ready!`);
});

client.on('messageCreate', (msg) => {
  if(!msg.guild || !msg.guild.available) return;
  if(!msg.author.bot) return;
  
  const randomXP = Math.ceil(Math.random() * 11) + 1; // [Generating Random Number for XP]
  
  leveling.addXP(msg.author, msg.guild, Number(randomXP)); // [Adding XP]
  
  const args = msg.content.slice('?'.length).trim().split(' ');
  const command = args.shift().toLowerCase();
  
  if(command === 'ping') {
    return msg.channel.send(`🏓 Pong!\n${client.ws.ping} ms!`);
  };
});

// [Module Events | Will write 'newLevel' event]
leveling.on('newLevel', (data) => {
  const guild = client.guilds.cache.get(data.guildID); // [Getting Guild from Data]
  const channel = guild.channels.cache.get('id') // [Replace 'id' with Channel ID]
  const member = guild.members.cache.get(data.memberID) // [Getting Member from Data]
  
  return channel.send(`${member} has leveled up to **${data.level} level**!`);
  // If You Want to send Message to Member, use this code:
  // return member?.send(`Congradulations, You reached **${data.newLevel} level**!`);
});

// [Running Client]
client.login('super-duper-bot-token') // [https://discord.com/developers/applications]
```

