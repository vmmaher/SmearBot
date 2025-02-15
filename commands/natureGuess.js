// SmearBot
// created by sylve
// /natureguess is a command that allows users to start a poll to guess the user's Pokémon nature.

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

const natures = [
    'adamant', 'bashful', 'bold', 'brave', 'calm', 
    'careful', 'docile', 'gentle', 'hardy', 'hasty',
    'impish', 'jolly', 'lax', 'lonely', 'mild',
    'modest', 'naive', 'naughty', 'quiet', 'quirky',
    'rash', 'relaxed', 'sassy', 'serious', 'timid'
];

const votesMap = new Map();
const natureMap = new Map();
const activeUsers = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('natureguess')
        .setDescription("Start a poll to guess your Pokémon's nature")
        .addStringOption(option =>
            option.setName('nature')
                .setDescription('The nature to be guessed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('subject')
                .setDescription('What is this nature guess for? (e.g., "Shiny Charizard" or "Ogerpon")')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long should the poll last (in minutes)? Recommended time is 5-10 minutes.')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30)),

    async execute(interaction) {
        if (activeUsers.has(interaction.user.id)) {
            await interaction.reply({ 
                content: "You already have an active Nature Guess game running. Please wait for it to finish.", 
                ephemeral: true 
            });
            return;
        }

        const submittedNature = interaction.options.getString('nature').toLowerCase();
        const subject = interaction.options.getString('subject');
        const duration = interaction.options.getInteger('duration') * 60 * 1000;

        // validate the nature exists
        if (!natures.includes(submittedNature)) {
            await interaction.reply({ 
                content: `Error: "${submittedNature}" is not a valid Pokémon nature. Valid natures are: ${natures.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(", ")}`, 
                flags: [1 << 6]
            });
            return;
        }

        activeUsers.add(interaction.user.id);

        // confirm the command went through successfuly, hide the nature from others users
        await interaction.reply({ 
            content: `Nature set to: ${submittedNature}. Others can now start guessing!`, 
            flags: [1 << 6] 
        });

        const isShiny = subject.toLowerCase().includes('shiny');

        const durationMinutes = duration / 60000;
        const minuteText = durationMinutes === 1 ? 'minute' : 'minutes';
        await interaction.channel.send(`A new Nature Guess has started for ${interaction.member.displayName}'s ${subject}! You have ${durationMinutes} ${minuteText} to submit your guesses!`);

        const pollEmbed = {
            title: `${isShiny ? '✨' : ''}Nature Guess${isShiny ? '✨' : ''}`,
            description: `What do you think ${interaction.member.displayName}'s ${subject}'s nature is?\nSelect your guess from the dropdown below!`,
            color: 0xFF766D,
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('nature_guess')
                    .setPlaceholder('Select a nature')
                    .addOptions(
                        natures.map(nature => ({
                            label: nature.charAt(0).toUpperCase() + nature.slice(1),
                            value: nature,
                        }))
                    )
            );

        await interaction.channel.send({ embeds: [pollEmbed], components: [row] });

        natureMap.set(interaction.channelId, submittedNature);
        votesMap.set(interaction.channelId, {
            votes: new Map(),
            subject: subject,
            user: interaction.user
        });

        setTimeout(async () => {
            const channelData = votesMap.get(interaction.channelId);
            if (!channelData?.votes) return;

            // count final votes and track correct guessers
            const voteCounts = new Map();
            const correctGuessers = [];
            
            for (const [userId, vote] of channelData.votes) {
                voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
                if (vote === submittedNature) {
                    const member = await interaction.guild.members.fetch(userId);
                    correctGuessers.push(member.displayName);
                }
            }

            // create a results summary
            let resultsDescription = `The correct nature was: **${submittedNature.charAt(0).toUpperCase() + submittedNature.slice(1)}**`;
            
            if (correctGuessers.length > 0) {
                resultsDescription += `\n🎉 Correct ${correctGuessers.length === 1 ? 'guesser' : 'guessers'}: ${correctGuessers.join(', ')}`;
            }
            
            resultsDescription += '\n\n__Final Votes:__\n';
            if (voteCounts.size === 0) {
                resultsDescription += 'None';
            } else {
                for (const [nature, count] of voteCounts) {
                    resultsDescription += `${nature.charAt(0).toUpperCase() + nature.slice(1)}: ${count} ${count === 1 ? 'vote' : 'votes'}\n`;
                }
            }

            const resultsEmbed = new EmbedBuilder()
                .setColor(0xFF766D)
                .setTitle(`${isShiny ? '✨' : ''}Nature Guess Results${isShiny ? ' ✨' : ''}!`)
                .setDescription(`For: **${subject}**\n\n${resultsDescription}`);

            await interaction.channel.send({ embeds: [resultsEmbed] });

            // Cleanup
            votesMap.delete(interaction.channelId);
            natureMap.delete(interaction.channelId);
            activeUsers.delete(interaction.user.id);
        }, duration);
    },

    // handle dropdown interactions
    async handleSelect(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'nature_guess') return;

        const channelId = interaction.channelId;
        const userId = interaction.user.id;
        const selectedNature = interaction.values[0];

        let channelData = votesMap.get(channelId);
        if (!channelData) {
            channelData = { votes: new Map(), subject: '', user: null };
            votesMap.set(channelId, channelData);
        }

        // check if the user trying to vote is the poll creator, as they are not allowed to vote
        if (userId === channelData.user.id) {
            await interaction.reply({ 
                content: "You cannot vote in your own Nature Guess!", 
                flags: [1 << 6]
            });
            return;
        }

        channelData.votes.set(userId, selectedNature);

        const voteCounts = new Map();
        for (const vote of channelData.votes.values()) {
            voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
        }

        let voteDescription = '';
        for (const [nature, count] of voteCounts) {
            voteDescription += `${nature.charAt(0).toUpperCase() + nature.slice(1)}: ${count} ${count === 1 ? 'vote' : 'votes'}\n`;
        }

        const voteEmbed = new EmbedBuilder()
            .setColor(0xFF766D)
            .setTitle(`Current Nature Guesses for ${channelData.user.displayName}'s ${channelData.subject}`)
            .setDescription(voteDescription || 'No votes yet');

        await interaction.update({ embeds: [voteEmbed], components: [interaction.message.components[0]] });
    }
};