// SmearBot
// created by sylve
// deploy-commands.js is a script that registers all commands in the commands directory to Discord.

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Refreshing application (/) commands...');
        
        // register commands globally
        await rest.put(
            Routes.applicationCommands(process.env.APPID), 
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
