// SmearBot
// created by sylve
// /viewtracked is a command that allows users to view their tracked phrases.

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// load tracked phrases from file
function loadTrackedPhrases() {
    try {
        if (!fs.existsSync(global.trackedPhrasesPath)) {
            fs.writeFileSync(global.trackedPhrasesPath, JSON.stringify({ guilds: {} }, null, 2));
        }
        return JSON.parse(fs.readFileSync(global.trackedPhrasesPath, "utf8"));
    } catch (error) {
        console.error("Error loading tracked phrases:", error);
        return { guilds: {} }; // Return with guilds structure
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("viewtracked")
        .setDescription("View tracked phrases for yourself or another user")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user whose tracked phrases you want to view (optional)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const trackedData = loadTrackedPhrases();
        const guildId = interaction.guild.id;

        // get the target user (either the optional mentioned user or the command's user)
        const targetUser = interaction.options.getUser("user") ?? interaction.user;
        const targetUserId = targetUser.id;

        // retrieve phrases for the user in the current guild only
        const phrases = trackedData.guilds[guildId] && trackedData.guilds[guildId][targetUserId];

        if (!phrases || phrases.length === 0) {
            const noPhrasesEmbed = new EmbedBuilder()
                .setColor("#FF766D")
                .setAuthor({
                    name: `No Tracked Phrases`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`${targetUser.username} has no tracked phrases.`);
    
            return await interaction.reply({ embeds: [noPhrasesEmbed] });
        }

        // logic for creating several pages, if necessary
        const phrasesPerPage = 10;
        const totalPages = Math.ceil(phrases.length / phrasesPerPage);
        let currentPage = 0;

        // function to update embed content when changing pages
        const getPageContent = (phrases, page, phrasesPerPage) => {
            const start = page * phrasesPerPage;
            const end = start + phrasesPerPage;
            return phrases.slice(start, end)
                .map((phrase, index) => `${start + index + 1}. ${phrase}`)
                .join('\n');
        };

        const embed = new EmbedBuilder()
            .setColor("#FF766D")
            .setTitle(`Tracked phrases for ${targetUser.username}`)
            .setDescription(getPageContent(phrases, currentPage, phrasesPerPage))
            .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

        // send the initial embed on page 1
        const response = await interaction.reply({ embeds: [embed], withResponse: true });
        const message = response.message;

        // add the reactions so users can change the page
        if (totalPages > 1) {
            await message.react('⬅️');
            await message.react('➡️');

            const filter = (reaction, user) =>
                ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === interaction.user.id;

            const collector = message.createReactionCollector({ filter, time: 60000 });

            collector.on("collect", async (reaction) => {
                if (reaction.emoji.name === '➡️') {
                    currentPage = (currentPage + 1) % totalPages;
                } else if (reaction.emoji.name === '⬅️') {
                    currentPage = (currentPage - 1 + totalPages) % totalPages;
                }

                embed.setDescription(getPageContent(phrases, currentPage, phrasesPerPage))
                    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

                await message.edit({ embeds: [embed] });
                await reaction.users.remove(interaction.user.id); 
            });

            collector.on("end", async () => {
                // once the time period is up, remove the reactions
                await message.reactions.removeAll().catch(console.error);
            });
        }
    }
};
