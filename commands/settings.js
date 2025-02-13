// SmearBot
// created by sylve
// /settings is a command that allows server administrators to configure server settings.
// currently it only allows you to enable or disable server notifications for tracked phrases.

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadSettings() {
    const settingsPath = path.join(__dirname, '..', 'data', 'guild_settings.json');
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

function saveSettings(settings) {
    const settingsPath = path.join(__dirname, '..', 'data', 'guild_settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure server settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('track')
                .setDescription('Configure tracking settings')
                .addBooleanOption(option =>
                    option
                        .setName('server_notifications')
                        .setDescription('Enable tracked phrase notifications in server (in addition to DMs)')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const settings = loadSettings();
        const guildId = interaction.guildId;

        if (!settings.guilds[guildId]) {
            settings.guilds[guildId] = {};
        }

        const serverNotifications = interaction.options.getBoolean('server_notifications');
        settings.guilds[guildId].serverNotifications = serverNotifications;

        saveSettings(settings);

        await interaction.reply({
            content: `Server notifications for tracked phrases have been ${serverNotifications ? 'enabled' : 'disabled'}.`,
            flags: [1 << 6]  
        });
    }
};