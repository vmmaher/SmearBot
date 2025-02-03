// SmearBot
// created by sylve
// /removetracked is intended to remove a word or phrase from the user's tracked list.

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removetracked")
        .setDescription("Remove a word or phrase from your tracked list")
        .addStringOption(option =>
            option.setName("phrase")
                .setDescription("The phrase or word to remove from tracking")
                .setRequired(true)
        ),

    async execute(interaction) {
        const phrase = interaction.options.getString("phrase").toLowerCase();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const trackedData = loadTrackedPhrases();

        if (!trackedData.guilds[guildId] || !trackedData.guilds[guildId][userId]) {
            const noPhrasesEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `No Tracked Phrases`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription("You have no tracked phrases to remove.");
    
            return await interaction.reply({ embeds: [noPhrasesEmbed] });
        }
    
        const userTrackedPhrases = trackedData.guilds[guildId][userId];
        const index = userTrackedPhrases.indexOf(phrase);
    
        if (index === -1) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `Phrase Not Found`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`The phrase "${phrase}" is not being tracked.`);
    
            return await interaction.reply({ embeds: [notFoundEmbed] });
        }
    
        userTrackedPhrases.splice(index, 1);
        saveTrackedPhrases(trackedData);
    
        const successEmbed = new EmbedBuilder()
            .setColor("#FF766D")
            .setAuthor({
                name: `Tracking Removed`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Successfully removed the phrase: "${phrase}" from your tracked list.`);
    
        await interaction.reply({ embeds: [successEmbed] });
    }
};