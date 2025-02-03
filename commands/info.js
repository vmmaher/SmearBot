// SmearBot
// created by sylve
// /info is a command that provides information about a Pokémon using the PokéAPI.

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get information about a Pokémon")
        .addStringOption(option =>
            option.setName("pokemon_name")
                .setDescription("Name of the Pokémon")
                .setRequired(true)
        ),

    async execute(interaction) {
        const pokemonName = interaction.options.getString("pokemon_name").toLowerCase();
        const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            const typeColors = {
                normal: 0xA8A77A, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C, ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
                psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC, dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
            };

            const primaryType = data.types[0].type.name;
            const color = typeColors[primaryType] || 0x0099FF;

            const types = data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join(", ");
            const abilities = data.abilities.map(a => a.ability.name.charAt(0).toUpperCase() + a.ability.name.slice(1)).join(", ");

            const embed = new EmbedBuilder()
                .setTitle(`${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)} Information`)
                .setColor(color)
                .addFields(
                    { name: "ID", value: `${data.id}`, inline: true },
                    { name: "Height", value: `${data.height / 10} m`, inline: true },
                    { name: "Weight", value: `${data.weight / 10} kg`, inline: true },
                    { name: "Types", value: types, inline: false },
                    { name: "Abilities", value: abilities, inline: false },
                    { name: "More Info", value: `[Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)})`, inline: false }
                )
                .setThumbnail(data.sprites.front_default);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply(`I couldn't find information for ${pokemonName}. :(`);
        }
    }
};
