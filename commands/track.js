// SmearBot
// created by sylve
// /track is a command that allows users to track a word or phrase.

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const BadWords = require('bad-words');

// create filter the bot to ignore inappropriate words
let filter = null;

function initializeFilter() {
    try {
        filter = new BadWords();
        const customBadWords = [''];
        
        // Validate words before adding
        const validWords = customBadWords.filter(word => 
            typeof word === 'string' && word.length > 0
        );
        
        if (validWords.length > 0) {
            filter.addWords(validWords);
        }
        
        return filter;
    } catch (error) {
        console.error('Error initializing filter:', error);
        return null;
    }
}

filter = initializeFilter();

// load tracked phrases from the file
function loadTrackedPhrases() {
    try {
        if (!fs.existsSync(global.trackedPhrasesPath)) {
            fs.writeFileSync(global.trackedPhrasesPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        return JSON.parse(fs.readFileSync(global.trackedPhrasesPath, "utf8"));
    } catch (error) {
        console.error("Error loading tracked phrases:", error);
        return { guilds: {} };
    }
}

// save the tracked phrases to the file
function saveTrackedPhrases(data) {
    fs.writeFileSync(path.join(global.trackedPhrasesPath), JSON.stringify(data, null, 4));
}

// removeEmojis function to ensure that the phrase does not contain any emojis
function removeEmojis(text) { 
    return text.replace(/<a?:.+?:\d+>|[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("track")
        .setDescription("Track a word or phrase in your current server. Sends a DM if it is mentioned in a message.")
        .addStringOption(option =>
            option.setName("phrase")
                .setDescription("The phrase or word to track")
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            if (!filter) {
                filter = initializeFilter();
                if (!filter) {
                    throw new Error("Failed to initialize content filter");
                }
            }
        
        const phrase = interaction.options.getString("phrase").toLowerCase();
        const cleanPhrase = removeEmojis(phrase);
        
        // check if the phrase contains emoji. if yes, return an error message to the user
        if (cleanPhrase !== phrase) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `Tracking Error`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription("You cannot track a word or phrase that includes an emoji.");
    
            return await interaction.reply({ embeds: [errorEmbed] });
        }

        // check for inappropriate content
        if (filter.isProfane(cleanPhrase)) {
            const inappropriateEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `Tracking Error`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription("This phrase cannot be tracked as it contains inappropriate content.");
    
            return await interaction.reply({ embeds: [inappropriateEmbed] });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // load the existing tracked phrases 
        const trackedData = loadTrackedPhrases();

        // initialize guild and user tracking data if it doesn't exist
        if (!trackedData.guilds) {
            trackedData.guilds = {};
        }
        if (!trackedData.guilds[guildId]) {
            trackedData.guilds[guildId] = {};
        }
        if (!trackedData.guilds[guildId][userId]) {
            trackedData.guilds[guildId][userId] = [];
        }

        // check if the phrase is already being tracked by the user
        if (trackedData.guilds[guildId][userId].includes(phrase)) {
            const alreadyTrackedEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `Already Tracking`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`You are already tracking the phrase: "${phrase}"`);
    
            return await interaction.reply({ embeds: [alreadyTrackedEmbed] });
        }
    
        trackedData.guilds[guildId][userId].push(phrase);
        saveTrackedPhrases(trackedData);
    
        const successEmbed = new EmbedBuilder()
            .setColor("#FF766D")
            .setAuthor({
                name: `Tracking Added`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Successfully started tracking the phrase: "${phrase}"`);
    
        await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in execute:', error);
            await interaction.reply({ 
                content: 'An error occurred while processing your request.',
                ephemeral: true 
            });
        }
    }
};