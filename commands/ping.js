// SmearBot
// created by sylve
// /ping is a simple command that returns the API latency of the bot.

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with latency."),
    async execute(interaction) {
        const apiLatency = Math.round(interaction.client.ws.ping);

        const statusEmbed = new EmbedBuilder()
            .setColor("#FF766D")
            .setTitle("Pong!")
            .addFields(
                { name: "API Latency", value: `${apiLatency}ms` }
            );

        await interaction.reply({ embeds: [statusEmbed] });
    },
};
