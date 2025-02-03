// SmearBot
// created by sylve
// /bumpstatus is intended to show when the last recorded disboard bump was for each server,
// and when the next reminder will be sent.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const bumpDataPath = path.join(__dirname, '..', 'data', 'bump_data.json');

// check if the bump_data.json file exists, and if not, create an empty structure
if (!fs.existsSync(bumpDataPath)) {
    fs.writeFileSync(bumpDataPath, JSON.stringify({ guilds: {} }, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bumpstatus')
        .setDescription('Prints out Disboard bump reminder status for debugging'),
    
    async execute(interaction) {
        // read data from bump_data.json each time the command is used to ensure it is up to date
        const bumpData = JSON.parse(fs.readFileSync(bumpDataPath, 'utf8'));
        const guildId = interaction.guild.id;

        if (!bumpData.guilds[guildId] || !bumpData.guilds[guildId].last_bump) {
            await interaction.reply('No bump has been recorded yet.');
            return;
        }

        const now = Date.now();
        const lastBumpTime = new Date(bumpData.guilds[guildId].last_bump).getTime();
        const timeSinceBump = now - lastBumpTime;
        const twoHours = 7200000;
        const timeUntilNextReminder = twoHours - (timeSinceBump % twoHours);

        // debug logging, uncomment if needed
        // console.log({
        //     now,
        //     lastBumpTime,
        //     timeSinceBump,
        //     timeUntilNextReminder
        // });

        const formatTime = (ms) => {
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((ms % (1000 * 60)) / 1000);
            return `${hours}h ${minutes}m ${seconds}s`;
        };

        const statusEmbed = new EmbedBuilder()
            .setColor('#FF766D')
            .setAuthor({
                name: `Disboard Bump Status for ${interaction.guild.name}:`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .addFields(
                { name: 'Last Bump', value: `${formatTime(timeSinceBump)} ago`, inline: true },
                { name: 'Next Reminder', value: `${formatTime(timeUntilNextReminder)}`, inline: true }
            )

        await interaction.reply({ embeds: [statusEmbed] });
    }
};
