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
        )
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to remove the phrase from (mod only)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const phrase = interaction.options.getString("phrase").toLowerCase();
        const guildId = interaction.guild.id;
        const targetUser = interaction.options.getUser("user");
        
        // Check if a target user was specified and if the command user has permission
        if (targetUser) {
            if (!interaction.member.permissions.has("ModerateMembers")) {
                const noPermissionEmbed = new EmbedBuilder()
                    .setColor("#FF766D")
                    .setDescription("You don't have permission to remove tracked phrases from other users.");
                
                return await interaction.reply({ embeds: [noPermissionEmbed], ephemeral: true });
            }
            userId = targetUser.id;
        } else {
            userId = interaction.user.id;
        }

        const trackedData = loadTrackedPhrases();

        if (!trackedData.guilds[guildId] || !trackedData.guilds[guildId][userId]) {
            const noPhrasesEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `No Tracked Phrases`,
                    iconURL: (targetUser || interaction.user).displayAvatarURL({ dynamic: true })
                })
                .setDescription(targetUser ? 
                    `${targetUser.tag} has no tracked phrases to remove.` :
                    "You have no tracked phrases to remove.");
    
            return await interaction.reply({ embeds: [noPhrasesEmbed] });
        }

        const userTrackedPhrases = trackedData.guilds[guildId][userId];
        const index = userTrackedPhrases.indexOf(phrase);
    
        if (index === -1) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `Phrase Not Found`,
                    iconURL: (targetUser || interaction.user).displayAvatarURL({ dynamic: true })
                })
                .setDescription(targetUser ?
                    `The phrase "${phrase}" is not being tracked by ${targetUser.tag}.` :
                    `The phrase "${phrase}" is not being tracked.`);
    
            return await interaction.reply({ embeds: [notFoundEmbed] });
        }
    
        userTrackedPhrases.splice(index, 1);
        saveTrackedPhrases(trackedData);
    
        const successEmbed = new EmbedBuilder()
            .setColor("#FF766D")
            .setAuthor({
                name: `Tracking Removed`,
                iconURL: (targetUser || interaction.user).displayAvatarURL({ dynamic: true })
            })
            .setDescription(targetUser ?
                `Successfully removed the phrase: "${phrase}" from ${targetUser.tag}'s tracked list.` :
                `Successfully removed the phrase: "${phrase}" from your tracked list.`);
    
        await interaction.reply({ embeds: [successEmbed] });
    }
};