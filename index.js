// SmearBot
// created by sylve
// --------------------------------------

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// require .env file for keys/tokens
require("dotenv").config();

// create a discord client with necessary permissions
const  client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.GuildMembers
    ] 
});

// --------------------------------------
// INITIALIZE COMMANDS
// create an object to store the bot's commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing the "data" or "execute" property.`)
    }
}

// --------------------------------------
// LOAD DATA
// load tracked phrases from json file.
global.trackedPhrasesPath = path.join(__dirname, "data", "tracked_phrases.json");

function loadTrackedPhrases() {
    try {
        if (!fs.existsSync(global.trackedPhrasesPath)) {
            fs.writeFileSync(global.trackedPhrasesPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        console.log("Tracked phrases loaded.");
        return JSON.parse(fs.readFileSync(global.trackedPhrasesPath, "utf8"));
    } catch (error) {
        console.error("Error loading tracked phrases:",error);
        return { guilds: {} };
    }
}

// refresh tracked data in memory, triggered each time any track command is used
function refreshTrackedData() {
    try {
        if (!fs.existsSync(global.trackedPhrasesPath)) {
            fs.writeFileSync(global.trackedPhrasesPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        trackedData = JSON.parse(fs.readFileSync(global.trackedPhrasesPath, "utf8"));
        // console.log('Tracked data refreshed in memory');
    } catch (error) {
        console.error("Error refreshing tracked data:", error);
        trackedData = { guilds: {} };
    }
}

// load disboard bump reminder data from json file
const bumpDataPath = path.join(__dirname, "data", "bump_data.json");

function loadBumpData() {
    try {
        if (!fs.existsSync(bumpDataPath)) {
            fs.writeFileSync(bumpDataPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        console.log("Bump data loaded.");
        return JSON.parse(fs.readFileSync(bumpDataPath, "utf8"));
    } catch (error) {
        console.error("Error reading bump_data.json:", error);
        return { guilds: {} };
    }
}

// --------------------------------------
// SAVE DATA
// save tracked phrases to json file
    // code located in /commands/track.js

// save disboard bump reminder data to json file
function saveBumpData(data) {
    try {
        fs.writeFileSync(bumpDataPath, JSON.stringify(bumpData, null, 2));
        console.log("Bump data saved.");
    } catch (error) {
        console.error("Error saving bump data:", error);
    }
}

// --------------------------------------
// NON-COMMAND FUNCTIONS
// function to load settings from json file
function loadSettings() {
    const settingsPath = path.join(__dirname, 'data', 'guild_settings.json');
    try {
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
        console.error('Error loading settings:', error);
        return { guilds: {} };
    }
}

// function to remind server to bump with disboard
async function bumpReminder(client, guildId) {
    // get data
    const guildData = bumpData.guilds[guildId];
    console.log(`Initializing bump reminder task for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`);

    // ensure guild has any last bump data before proceeding. if not, log and return
    if (!guildData?.last_bump) {
        console.log(`[INFO] No last bump time found for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}.`);
        return;
    }
    // check if bot can find correct reminder channel. if not, log and return
    const channelId = guildData.reminders?.channel_id;
    if (!channelId) {
        console.log(`[WARNING] Could not find reminder channel set for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`);
        return;
    }

    const checkInterval = setInterval(async () => {
        try {
            // get current time and calculate when last bump was
            const now = Date.now();
            const lastBumpTime = new Date(guildData.last_bump).getTime();
            const timeSinceBump = now - lastBumpTime;
            const twoHours = 7200000;
            const timeUntilNextReminder = twoHours - (timeSinceBump % twoHours);

            // check if it's time to remind, with a 10 second window to account for potential lag/delay
            const isWithinWindow = timeUntilNextReminder <= 10000;

            if (isWithinWindow) {
                // creates a date object based on the last reminder, and checks if the last reminder was 30 or more minutes ago
                const lastReminder = guildData.last_reminder ? new Date(guildData.last_reminder).getTime() : null;
                const hasCooldownPassed = !lastReminder || (now - lastReminder) >= 1800000;

                if (hasCooldownPassed) {
                    try {
                        const channel = await client.channels.fetch(channelId);
                        // check if bot has correct permissions
                        const permissions = channel.permissionsFor(client.user);
                        if (!permissions || !permissions.has(["SendMessages", "ViewChannel", "EmbedLinks"])) {
                            console.log(`Missing permissions for reminder channel in GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`);
                            return;
                        }

                        // send the bump reminder
                        // check if a reminder was already sent
                        const lastMessages = await channel.messages.fetch({ limit: 5 });
                        const recentReminder = lastMessages.find(msg => 
                            msg.author.id === client.user.id && 
                            msg.content === "Reminder: use `/bump` to bump the server on Disboard!"
                        );
                        if (!recentReminder) {
                            await channel.send("Reminder: use `/bump` to bump the server on Disboard!");
                        } else {
                            return;
                        }
                        console.log(`Sent bump reminder for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`);

                        // update the last reminder time after it has been sent
                        bumpData.guilds[guildId].lastReminder = new Date().toISOString();
                        saveBumpData(bumpData);
                    } catch (sendError) {
                        console.error(`Error sending bump reminder for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`, sendError);
                    }
                }
            }
        } catch (error) {
            console.error(`Error in bump reminder task for GuildID: ${guildId} GuildName: ${client.guilds.cache.get(guildId).name}`, error);
        }
    }, 120000); // check every 2 minute

    return checkInterval;
}

// basic function to have the bot ignore all links in from tracked phrases and detected messages
function removeUrls(text) {
    return text.replace(/https?:\/\/\S+/gi, ''); // removes http:// and https:// links
}

// basic function to remove emojis both from tracked phrases and detected messages
function removeEmojis(text) {
    return text.replace(/<a?:.+?:\d+>|[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
}

// function to check any content for tracked words
function checkContentForWords(content, trackedUsers, detectedPhrases) {
    if (!content) return;
    const lowercaseContent = content.toLowerCase();

    for (const userId in trackedUsers) {
        for (const phrase of trackedUsers[userId]) {
            if (lowercaseContent.includes(phrase.toLowerCase())) {
                detectedPhrases.push({ userId, phrase });
            }
        }
    }
}

// --------------------------------------
// MESSAGE MONITORING
// monitor messages for tracked phrases
client.on("messageCreate", async (message) => {
    if (!trackedData) return;

    const guildId = message.guild.id;
    // skip if there are no tracked phrases for this guild
    if (!trackedData.guilds[guildId]) return;
    
    const detectedPhrases = [];

    // check if message author is NOT from a bot
    if (!message.author.bot) {

        // remove URLs and emojis from the message
        const cleanMessage = removeUrls(removeEmojis(message.content.toLowerCase()));

        // check the message content for any tracked phrases
        for (const userId in trackedData.guilds[guildId]) {
            for (const phrase of trackedData.guilds[guildId][userId]) {
                const cleanPhrase = removeEmojis(phrase.toLowerCase());
                if (cleanMessage.includes(cleanPhrase)) {
                    detectedPhrases.push({ userId, phrase });
                }
            }
        }
    }

    // check any embeds sent if they have any tracked phrases in the "author" field
    if (message.embeds.length > 0) {
        for (const embed  of message.embeds) {
            if (embed.author?.name) {
                checkContentForWords(embed.author.name, trackedData.guilds[guildId], detectedPhrases);
            }
        }
    }

    // send DMs to users with the phrase details
    if (detectedPhrases.length > 0) {
        const settings = loadSettings();
        const guildSettings = settings.guilds[guildId] || {};
        
        for (const { userId, phrase } of detectedPhrases) {
            try {
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (!member) {
                    console.log(`User ${userId} is no longer in the guild ${message.guild.name}`);
                    continue;
                }

                const channel = message.channel;
                const messageUrl = `https://discord.com/channels/${guildId}/${channel.id}/${message.id}`;
        
                                const embed = new EmbedBuilder()
                    .setColor("#FF766D")
                    .setAuthor({
                        name: `#${channel.name}`,
                        url: messageUrl,
                    })
                    .setDescription(`Your tracked phrase **"${phrase}"** was said by ${message.author.tag}.`)
                    .addFields(
                        { name: '\u200B', value: `[Jump to message](${messageUrl})` }
                    )
                    .setFooter({ text: `${new Date().toLocaleString()}` });
        
                await member.user.send({ embeds: [embed] });

                // if server notifiations are enabled, send in channel
                if (guildSettings.serverNotifications) {
                    await message.channel.send(`${member}, ${message.author} said your tracked phrase: **${phrase}**`);
                }
            } catch (error) {
                console.error(`Could not send notification to user ${userId}: ${error.message}`);
            }
        }
    }
});

// monitor messages to check when the last bump was by checking embed descriptions
client.on("messageCreate", async (message) => {
    if (message.embeds.length > 0) {
        for (const embed of message.embeds) {
            if (embed.description && embed.description.includes("Bump done")) {
                console.log(`Bump detected in GuildID: ${message.guild.id} GuildName: ${message.guild.name}`);

                const guildId = message.guild.id;

                if (!bumpData.guilds[guildId]) {
                    bumpData.guilds[guidId] = {
                        last_bump: null,
                        reminders: {}
                    };
                }

                // record the new bump time, as well as the channel it was sent in
                bumpData.guilds[guildId].last_bump = new Date().toISOString();
                bumpData.guilds[guildId].reminders.channel_id = message.channel.id;

                saveBumpData(bumpData);
                await message.channel.send("Bump detected. I'll remind you to bump again in 2 hours!")
            }
        }
    }
});

// declare a cooldown outside of event handler so it persists.
const cooldowns = new Map();

// define common symbols for the bot to ignore when checking for repeated messages
const ignoredSymbols = /^[!#$%^:&.?]/;

// monitor messages for misc fun commands
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (ignoredSymbols.test(message.content)) return;

    // have the bot 'copy' users if they have sent the same 3 messages in a row
    const messages = await message.channel.messages.fetch({ limit: 3 });
    const lastThreeMessages = Array.from(messages.values());
    // if the last 3 messages are the same, set a 10 second cooldown and send the message.
    if (lastThreeMessages.length === 3 && lastThreeMessages.every(msg => msg.content === lastThreeMessages[0].content)) {
        const cooldownKey = `copy-${message.channel.id}`;
        const cooldownDuration = 10000;
    
        // check if cooldown is active, if not send the message and set the cooldown
        if (!cooldowns.has(cooldownKey) || Date.now() - cooldowns.get(cooldownKey) > cooldownDuration) {
            await message.channel.send(lastThreeMessages[0].content);
            cooldowns.set(cooldownKey, Date.now());
        }
    }

    // send a resposne gif if a mention of the bot contains the word "clown"
    const clownGif = "https://tenor.com/view/clown-makeup-clown-makeup-bozo-gif-26049773"
    if (message.mentions.has(client.user) && (message.content.toLowerCase().includes("clown") || message.content.includes("🤡"))) {
        await message.channel.send(clownGif);
    }

    // send a resposne gif if a mention of the bot contains the word "good bot"
    if (message.mentions.has(client.user) && (message.content.toLowerCase().includes("good bot"))) {
        await message.channel.send("<a:SmearPet:1339681241661706260>");    
    }
});

// --------------------------------------
// COMMAND MONITORING
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
        // Refresh data after specific commands that modify tracking
        if (['removetracked', 'track', 'viewtracked'].includes(interaction.commandName)) {
            refreshTrackedData();
        }
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        });
    }
});

// handle dropdown interactions for the nature guess command
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        const command = client.commands.get('natureguess');
        if (command) {
            try {
                await command.handleSelect(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: 'There was an error processing your vote!', 
                    ephemeral: true 
                });
            }
        }
    }
});

// --------------------------------------
// BOT STARTUP
let trackedData;
let bumpData;

client.once("ready", () => {
    console.log(`Logged in!`);

    trackedData = loadTrackedPhrases();
    bumpData = loadBumpData();

    // initialize the bump reminder task for each guild
    client.guilds.cache.forEach(guild => {
        bumpReminder(client, guild.id);
    });
});

client.login(process.env.TOKEN).catch(error => {
    console.error("Failed to login:", error);
});