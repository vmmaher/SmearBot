require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Import utils
const { bumpData, saveBumpData } = require('./utils/bumpData');



for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Refreshing application (/) commands...');
        
        // Register commands globally
        await rest.put(
            Routes.applicationCommands(process.env.APPID), 
            { body: commands }
        );

        // For guild-specific commands (faster updates during development)
        // await rest.put(
        //     Routes.applicationGuildCommands(process.env.APPID, 'your-guild-id'),
        //     { body: commands }
        // );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
